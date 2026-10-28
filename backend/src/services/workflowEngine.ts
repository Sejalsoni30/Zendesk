import crypto from 'crypto';
import { config } from '../config/env.js';
import { workflowRepository } from '../repositories/workflowRepository.js';
import { ticketMappingRepository } from '../repositories/ticketMappingRepository.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';
import { darwinboxService, boxService, zendeskService } from './index.js';
import { WORKFLOW_STATES } from '../stateMachine/states.js';
import { WORKFLOW_STEPS } from '../stateMachine/steps.js';
import { ZendeskWebhookPayload } from '../schemas/webhookPayload.js';
import { withExponentialBackoff } from '../utils/retry.js';

export class WorkflowEngine {
  private workerId: string;

  constructor() {
    this.workerId = `worker_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Ingests an inbound Zendesk webhook event with strict idempotency.
   */
  async ingestWebhook(payload: ZendeskWebhookPayload): Promise<{
    idempotencyKey: string;
    ticketId: string;
    status: string;
    isDuplicate: boolean;
  }> {
    const ticketId = payload.ticket.id;
    // Deterministic idempotency key based on event + ticket ID
    const idempotencyKey =
      payload.idempotency_key || `evt_zd_${ticketId}_${payload.event.replace('.', '_')}`;

    // Hash employee ID for privacy/GDPR compliance
    const rawEmployeeId =
      payload.ticket.requester?.employee_id ||
      payload.ticket.requester?.id ||
      `EMP-${ticketId}`;
    const employeeReference = `emp_ref_${crypto.createHash('sha256').update(rawEmployeeId).digest('hex').substring(0, 12)}`;

    const { doc, isNew } = await workflowRepository.createIfAbsent(idempotencyKey, {
      idempotencyKey,
      ticketId,
      employeeId: rawEmployeeId,
      subject: payload.ticket.subject,
      category: payload.ticket.category,
      priority: payload.ticket.priority,
      employeeReference,
      status: WORKFLOW_STATES.RECEIVED,
      currentStep: WORKFLOW_STEPS.WEBHOOK_RECEIVED,
      requiresApproval: payload.ticket.category === 'HR_ACCESS',
      maxRetries: config.MAX_WORKFLOW_RETRIES,
    });

    if (!isNew) {
      await auditLogRepository.append({
        workflowId: idempotencyKey,
        ticketId,
        actor: 'system',
        action: 'DUPLICATE_WEBHOOK_SUPPRESSED',
        result: 'SUCCESS',
        metadata: {
          reason: 'Webhook re-delivery detected. Suppressed duplicate processing.',
          currentState: doc.status,
        },
      });

      return {
        idempotencyKey,
        ticketId,
        status: doc.status,
        isDuplicate: true,
      };
    }

    await auditLogRepository.append({
      workflowId: idempotencyKey,
      ticketId,
      actor: 'system',
      action: 'WEBHOOK_RECEIVED',
      result: 'SUCCESS',
      metadata: {
        category: payload.ticket.category,
        priority: payload.ticket.priority,
        rawEmployeeId,
      },
    });

    // Asynchronously begin pipeline processing
    setImmediate(() => {
      this.processWorkflow(idempotencyKey, rawEmployeeId).catch((err) => {
        console.error(`❌ Workflow execution error for ${idempotencyKey}:`, err);
      });
    });

    return {
      idempotencyKey,
      ticketId,
      status: WORKFLOW_STATES.RECEIVED,
      isDuplicate: false,
    };
  }

  /**
   * Core orchestrator executing sequential steps with checkpointing.
   */
  async processWorkflow(idempotencyKey: string, rawEmployeeId?: string): Promise<void> {
    const { acquired, doc } = await workflowRepository.acquireLease(
      idempotencyKey,
      this.workerId,
      config.LEASE_DURATION_SECONDS
    );

    if (!acquired || !doc) {
      return; // Another worker instance or thread holds the lease
    }

    const ticketId = doc.ticketId;
    const employeeId =
      doc.employeeId ||
      rawEmployeeId ||
      doc.stepResults?.employeeVerification?.employeeId ||
      `EMP-${ticketId}`;

    try {
      // -------------------------------------------------------------
      // Step 1: Darwinbox HR Employee Verification
      // -------------------------------------------------------------
      if (!doc.stepResults?.employeeVerification) {
        await workflowRepository.recordStepProgress(idempotencyKey, WORKFLOW_STEPS.VERIFYING_EMPLOYEE);

        const verification = await withExponentialBackoff(
          () => darwinboxService.verifyEmployee(employeeId),
          { maxRetries: 2, initialDelayMs: 50 }
        );

        if (!verification.verified || verification.status !== 'ACTIVE') {
          const errorCode = verification.status === 'NOT_FOUND' ? 'ERR_EMPLOYEE_NOT_FOUND' : 'ERR_EMPLOYEE_INACTIVE';
          const errorMsg = `Employee ${employeeId} verification failed in Darwinbox: status is ${verification.status}.`;

          await workflowRepository.transitionState(idempotencyKey, WORKFLOW_STATES.FAILED, {
            errorCode,
            errorMessage: errorMsg,
          });

          await auditLogRepository.append({
            workflowId: idempotencyKey,
            ticketId,
            actor: 'system',
            action: 'DARWINBOX_EMPLOYEE_VERIFIED',
            result: 'FAILURE',
            metadata: { employeeId, status: verification.status, error: errorMsg },
          });

          return;
        }

        await workflowRepository.recordStepProgress(idempotencyKey, WORKFLOW_STEPS.VERIFYING_EMPLOYEE, {
          employeeVerification: verification,
        });

        await auditLogRepository.append({
          workflowId: idempotencyKey,
          ticketId,
          actor: 'system',
          action: 'DARWINBOX_EMPLOYEE_VERIFIED',
          result: 'SUCCESS',
          metadata: {
            employeeId: verification.employeeId,
            department: verification.department,
            managerId: verification.managerId,
          },
        });
      }

      // -------------------------------------------------------------
      // Step 2: Human-in-the-Loop Sign-off Check
      // -------------------------------------------------------------
      if (doc.requiresApproval && !doc.approvedBy) {
        await workflowRepository.transitionState(idempotencyKey, WORKFLOW_STATES.NEEDS_APPROVAL);
        await workflowRepository.releaseLease(idempotencyKey);

        await auditLogRepository.append({
          workflowId: idempotencyKey,
          ticketId,
          actor: 'system',
          action: 'SENSITIVE_CATEGORY_FLAGGED',
          result: 'WAITING_APPROVAL',
          metadata: {
            category: doc.category,
            reason: 'Category requires HR Approver sign-off before Box case folder creation',
          },
        });
        return;
      }

      // -------------------------------------------------------------
      // Step 3: Box Enterprise Case Folder Provisioning
      // -------------------------------------------------------------
      let boxResult = doc.stepResults?.boxFolder;
      if (!boxResult) {
        await workflowRepository.recordStepProgress(idempotencyKey, WORKFLOW_STEPS.RESOLVING_BOX_FOLDER);

        const empName = doc.stepResults?.employeeVerification?.name || 'Employee';
        boxResult = await withExponentialBackoff(
          () =>
            boxService.provisionCaseFolder({
              ticketId,
              employeeId,
              employeeName: empName,
              collaborators: [
                { email: config.ZENDESK_ADMIN_EMAIL, role: 'editor' },
              ],
            }),
          { maxRetries: 2, initialDelayMs: 50 }
        );

        await workflowRepository.recordStepProgress(idempotencyKey, WORKFLOW_STEPS.RESOLVING_BOX_FOLDER, {
          boxFolder: boxResult,
        });

        // Save permanent O(1) lookup mapping
        await ticketMappingRepository.saveMapping(
          ticketId,
          boxResult.folderId,
          boxResult.folderUrl,
          doc.employeeReference
        );

        await auditLogRepository.append({
          workflowId: idempotencyKey,
          ticketId,
          actor: 'system',
          action: 'BOX_FOLDER_RESOLVED',
          result: 'SUCCESS',
          metadata: {
            folderId: boxResult.folderId,
            folderPath: boxResult.folderPath,
            isExisting: boxResult.isExisting,
          },
        });
      }

      // -------------------------------------------------------------
      // Step 4: Zendesk Ticket Update & Writeback
      // -------------------------------------------------------------
      if (config.ZENDESK_WRITEBACK_ENABLED && !doc.stepResults?.zendeskUpdate) {
        await workflowRepository.recordStepProgress(idempotencyKey, WORKFLOW_STEPS.UPDATING_ZENDESK);

        const updateResult = await withExponentialBackoff(
          () =>
            zendeskService.updateTicket(ticketId, {
              comment: `[Automation] HR Case Folder provisioned: ${boxResult.folderUrl}`,
              status: 'pending',
              tags: ['automated_box_provisioned', `cat_${doc.category.toLowerCase()}`],
            }),
          { maxRetries: 2, initialDelayMs: 50 }
        );

        await workflowRepository.recordStepProgress(idempotencyKey, WORKFLOW_STEPS.UPDATING_ZENDESK, {
          zendeskUpdate: updateResult,
        });

        await auditLogRepository.append({
          workflowId: idempotencyKey,
          ticketId,
          actor: 'system',
          action: 'ZENDESK_WRITEBACK_COMMITTED',
          result: 'SUCCESS',
          metadata: { commentId: updateResult.commentId },
        });
      }

      // -------------------------------------------------------------
      // Step 5: Finalization & Completion
      // -------------------------------------------------------------
      await workflowRepository.recordStepProgress(idempotencyKey, WORKFLOW_STEPS.FINALIZING);
      await workflowRepository.transitionState(idempotencyKey, WORKFLOW_STATES.COMPLETED);

      await auditLogRepository.append({
        workflowId: idempotencyKey,
        ticketId,
        actor: 'system',
        action: 'WORKFLOW_COMPLETED',
        result: 'SUCCESS',
      });
    } catch (err: any) {
      console.error(`⚠️ Transient failure on workflow ${idempotencyKey}:`, err.message);

      await workflowRepository.transitionState(idempotencyKey, WORKFLOW_STATES.FAILED, {
        errorCode: err.code || 'ERR_PIPELINE_FAILURE',
        errorMessage: err.message,
      });

      await auditLogRepository.append({
        workflowId: idempotencyKey,
        ticketId,
        actor: 'system',
        action: 'WORKFLOW_FAILED',
        result: 'FAILURE',
        metadata: { error: err.message, code: err.code },
      });
    } finally {
      await workflowRepository.releaseLease(idempotencyKey);
    }
  }

  /**
   * Human Approver grants authorization for a sensitive ticket.
   */
  async approveWorkflow(idempotencyKey: string, approverEmail: string): Promise<void> {
    const doc = await workflowRepository.getById(idempotencyKey);
    if (!doc) {
      throw new Error(`Workflow ${idempotencyKey} not found`);
    }

    if (doc.status !== WORKFLOW_STATES.NEEDS_APPROVAL) {
      throw new Error(`Workflow is in status '${doc.status}', not 'needs_approval'`);
    }

    await workflowRepository.transitionState(idempotencyKey, WORKFLOW_STATES.PROCESSING, {
      approvedBy: approverEmail,
      approvedAt: new Date().toISOString(),
    });

    await auditLogRepository.append({
      workflowId: idempotencyKey,
      ticketId: doc.ticketId,
      actor: approverEmail,
      action: 'APPROVAL_GRANTED',
      result: 'SUCCESS',
      metadata: { approver: approverEmail },
    });

    // Resume execution from current step
    setImmediate(() => {
      this.processWorkflow(idempotencyKey).catch(console.error);
    });
  }

  /**
   * Human Approver rejects a sensitive ticket.
   */
  async rejectWorkflow(idempotencyKey: string, approverEmail: string, reason?: string): Promise<void> {
    const doc = await workflowRepository.getById(idempotencyKey);
    if (!doc) {
      throw new Error(`Workflow ${idempotencyKey} not found`);
    }

    await workflowRepository.transitionState(idempotencyKey, WORKFLOW_STATES.FAILED, {
      errorCode: 'ERR_REJECTED_BY_APPROVER',
      errorMessage: `Workflow rejected by ${approverEmail}.${reason ? ` Reason: ${reason}` : ''}`,
    });

    await auditLogRepository.append({
      workflowId: idempotencyKey,
      ticketId: doc.ticketId,
      actor: approverEmail,
      action: 'APPROVAL_REJECTED',
      result: 'FAILURE',
      metadata: { approver: approverEmail, reason },
    });
  }

  /**
   * Retries a failed workflow. Resumes safely from currentStep without repeating completed side effects.
   */
  async retryWorkflow(idempotencyKey: string): Promise<void> {
    const doc = await workflowRepository.getById(idempotencyKey);
    if (!doc) {
      throw new Error(`Workflow ${idempotencyKey} not found`);
    }

    if (doc.status !== WORKFLOW_STATES.FAILED) {
      throw new Error(`Only failed workflows can be retried. Current status is ${doc.status}`);
    }

    await auditLogRepository.append({
      workflowId: idempotencyKey,
      ticketId: doc.ticketId,
      actor: 'admin@example.com',
      action: 'WORKFLOW_RETRY_INITIATED',
      result: 'SUCCESS',
      metadata: { resumeFromStep: doc.currentStep },
    });

    // Process workflow claims lease and transitions FAILED -> PROCESSING
    await this.processWorkflow(idempotencyKey);
  }
}

export const workflowEngine = new WorkflowEngine();

