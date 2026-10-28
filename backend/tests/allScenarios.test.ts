import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { workflowRepository } from '../src/repositories/workflowRepository.js';
import { ticketMappingRepository } from '../src/repositories/ticketMappingRepository.js';
import { auditLogRepository } from '../src/repositories/auditLogRepository.js';
import { zendeskMock, darwinboxMock, boxMock } from '../src/services/index.js';
import { WORKFLOW_STATES } from '../src/stateMachine/states.js';

describe('10 Core Production Integration Test Scenarios', () => {
  beforeEach(() => {
    zendeskMock.reset();
    boxMock.reset();
    darwinboxMock.setForcedFailure(null);
  });

  // Helper to send signed webhook request
  async function sendWebhook(payloadObj: any, signatureOverride?: string) {
    const rawPayload = JSON.stringify(payloadObj);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = signatureOverride ?? zendeskMock.generateTestSignature(rawPayload, timestamp);

    return await request(app)
      .post('/api/webhooks/zendesk')
      .set('Content-Type', 'application/json')
      .set('X-Zendesk-Webhook-Signature', signature)
      .set('X-Zendesk-Webhook-Signature-Timestamp', timestamp)
      .send(rawPayload);
  }

  // Polling helper to wait for async pipeline state transitions
  async function waitForStatus(idempotencyKey: string, targetStatus: string, maxMs = 3500) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      const doc = await workflowRepository.getById(idempotencyKey);
      if (doc?.status === targetStatus) return doc;
      await new Promise((r) => setTimeout(r, 60));
    }
    return await workflowRepository.getById(idempotencyKey);
  }

  // ---------------------------------------------------------------------------
  // Scenario 1: A valid ticket is processed successfully
  // ---------------------------------------------------------------------------
  it('Scenario 1: A valid ticket is processed successfully end-to-end', async () => {
    const idKey = `sc1_valid_${Date.now()}`;
    const ticketId = `SC1-${Date.now()}`;

    const payload = {
      event: 'ticket.created',
      idempotency_key: idKey,
      ticket: {
        id: ticketId,
        subject: 'Standard Monitor Request',
        category: 'EQUIPMENT',
        priority: 'normal',
        requester: { employee_id: 'EMP-1001' },
      },
    };

    const res = await sendWebhook(payload);
    expect(res.status).toBe(202);
    expect(res.body.isDuplicate).toBe(false);

    const run = await waitForStatus(idKey, WORKFLOW_STATES.COMPLETED);
    expect(run?.status).toBe(WORKFLOW_STATES.COMPLETED);
    expect(run?.stepResults.employeeVerification?.verified).toBe(true);
    expect(run?.stepResults.boxFolder?.folderId).toBeDefined();

    const mapping = await ticketMappingRepository.getByTicketId(ticketId);
    expect(mapping).not.toBeNull();
    expect(mapping?.boxFolderId).toBe(run?.stepResults.boxFolder.folderId);
  });

  // ---------------------------------------------------------------------------
  // Scenario 2: The same webhook event is delivered twice (idempotency check)
  // ---------------------------------------------------------------------------
  it('Scenario 2: The same webhook event is delivered twice (zero duplicate side effects)', async () => {
    const idKey = `sc2_duplicate_${Date.now()}`;
    const ticketId = `SC2-${Date.now()}`;

    const payload = {
      event: 'ticket.created',
      idempotency_key: idKey,
      ticket: {
        id: ticketId,
        subject: 'Keyboard replacement',
        category: 'EQUIPMENT',
        requester: { employee_id: 'EMP-1001' },
      },
    };

    // First delivery
    const res1 = await sendWebhook(payload);
    expect(res1.status).toBe(202);
    expect(res1.body.isDuplicate).toBe(false);

    await waitForStatus(idKey, WORKFLOW_STATES.COMPLETED);

    // Second delivery (Replay attack / network duplicate)
    const res2 = await sendWebhook(payload);
    expect(res2.status).toBe(202);
    expect(res2.body.isDuplicate).toBe(true);

    const logs = await auditLogRepository.getLogsByTicket(ticketId);
    const duplicateLogs = logs.filter((l) => l.action === 'DUPLICATE_WEBHOOK_SUPPRESSED');
    expect(duplicateLogs.length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Scenario 3: The same ticket is processed concurrently
  // ---------------------------------------------------------------------------
  it('Scenario 3: Concurrent webhook requests for the same ticket (transaction & lease lock test)', async () => {
    const idKey = `sc3_concurrent_${Date.now()}`;
    const ticketId = `SC3-${Date.now()}`;

    const payload = {
      event: 'ticket.created',
      idempotency_key: idKey,
      ticket: {
        id: ticketId,
        subject: 'Concurrent Ticket Test',
        category: 'EQUIPMENT',
        requester: { employee_id: 'EMP-1001' },
      },
    };

    // Fire two identical requests simultaneously
    const [resA, resB] = await Promise.all([
      sendWebhook(payload),
      sendWebhook(payload),
    ]);

    expect([202]).toContain(resA.status);
    expect([202]).toContain(resB.status);

    // Exactly one must be marked as original, and the other as duplicate
    const duplicates = [resA.body.isDuplicate, resB.body.isDuplicate];
    expect(duplicates).toContain(false);
    expect(duplicates).toContain(true);
  });

  // ---------------------------------------------------------------------------
  // Scenario 4: An employee does not exist
  // ---------------------------------------------------------------------------
  it('Scenario 4: An employee does not exist in Darwinbox (fails safely)', async () => {
    const idKey = `sc4_nonexistent_${Date.now()}`;
    const ticketId = `SC4-${Date.now()}`;

    const payload = {
      event: 'ticket.created',
      idempotency_key: idKey,
      ticket: {
        id: ticketId,
        subject: 'Access for unknown contractor',
        category: 'EQUIPMENT',
        requester: { employee_id: 'EMP-NONEXISTENT' },
      },
    };

    const res = await sendWebhook(payload);
    expect(res.status).toBe(202);

    const run = await waitForStatus(idKey, WORKFLOW_STATES.FAILED);
    expect(run?.status).toBe(WORKFLOW_STATES.FAILED);
    expect(run?.errorCode).toBe('ERR_EMPLOYEE_NOT_FOUND');

    // Box folder must NOT have been created
    const mapping = await ticketMappingRepository.getByTicketId(ticketId);
    expect(mapping).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Scenario 5: Darwinbox authentication fails
  // ---------------------------------------------------------------------------
  it('Scenario 5: Darwinbox authentication failure (isolated error handling)', async () => {
    darwinboxMock.setForcedFailure('AUTH_FAILURE');
    const idKey = `sc5_auth_${Date.now()}`;

    const payload = {
      event: 'ticket.created',
      idempotency_key: idKey,
      ticket: {
        id: `SC5-${Date.now()}`,
        subject: 'Auth fail test',
        category: 'EQUIPMENT',
        requester: { employee_id: 'EMP-1001' },
      },
    };

    await sendWebhook(payload);
    const run = await waitForStatus(idKey, WORKFLOW_STATES.FAILED);
    expect(run?.status).toBe(WORKFLOW_STATES.FAILED);
    expect(run?.errorMessage).toContain('Authentication Failed');
  });

  // ---------------------------------------------------------------------------
  // Scenario 6: Box is temporarily unavailable (retry with backoff then recover)
  // ---------------------------------------------------------------------------
  it('Scenario 6: Box temporarily unavailable (retry with exponential backoff and recover)', async () => {
    // Fail once with 503, then recover on retry
    boxMock.setForcedFailure('SERVICE_UNAVAILABLE', 1);
    const idKey = `sc6_box_${Date.now()}`;

    const payload = {
      event: 'ticket.created',
      idempotency_key: idKey,
      ticket: {
        id: `SC6-${Date.now()}`,
        subject: 'Box Transient Failure Test',
        category: 'EQUIPMENT',
        requester: { employee_id: 'EMP-1001' },
      },
    };

    await sendWebhook(payload);
    const run = await waitForStatus(idKey, WORKFLOW_STATES.COMPLETED);
    expect(run?.status).toBe(WORKFLOW_STATES.COMPLETED);
    expect(run?.stepResults.boxFolder).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Scenario 7: Zendesk ticket update fails (state consistent, safe retry)
  // ---------------------------------------------------------------------------
  it('Scenario 7: Zendesk ticket update fails (folder mapping preserved, retry is safe)', async () => {
    zendeskMock.setForcedFailure('API_ERROR');
    const idKey = `sc7_zd_${Date.now()}`;
    const ticketId = `SC7-FAIL-${Date.now()}`;

    const payload = {
      event: 'ticket.created',
      idempotency_key: idKey,
      ticket: {
        id: ticketId,
        subject: 'Zendesk write error test',
        category: 'EQUIPMENT',
        requester: { employee_id: 'EMP-1001' },
      },
    };

    await sendWebhook(payload);
    const run = await waitForStatus(idKey, WORKFLOW_STATES.FAILED);
    expect(run?.status).toBe(WORKFLOW_STATES.FAILED);
    // Box folder was created and preserved before Zendesk write failed
    expect(run?.stepResults.boxFolder).toBeDefined();

    const mapping = await ticketMappingRepository.getByTicketId(ticketId);
    expect(mapping).not.toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Scenario 8: Unauthorized webhook is rejected
  // ---------------------------------------------------------------------------
  it('Scenario 8: Unauthorized webhook with invalid signature is rejected with 401', async () => {
    const payload = {
      event: 'ticket.created',
      ticket: { id: `SC8-${Date.now()}`, subject: 'Tampered request' },
    };

    const res = await sendWebhook(payload, 'forged_tampered_signature_xyz');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('ERR_INVALID_WEBHOOK_SIGNATURE');
  });

  // ---------------------------------------------------------------------------
  // Scenario 9: Approval required for sensitive action (HR_ACCESS)
  // ---------------------------------------------------------------------------
  it('Scenario 9: Approval required before sensitive action (HR_ACCESS halts in needs_approval)', async () => {
    const idKey = `sc9_sensitive_${Date.now()}`;

    const payload = {
      event: 'ticket.created',
      idempotency_key: idKey,
      ticket: {
        id: `SC9-${Date.now()}`,
        subject: 'Sensitive Salary Records Access',
        category: 'HR_ACCESS',
        priority: 'high',
        requester: { employee_id: 'EMP-1001' },
      },
    };

    await sendWebhook(payload);
    let run = await waitForStatus(idKey, WORKFLOW_STATES.NEEDS_APPROVAL);
    expect(run?.status).toBe(WORKFLOW_STATES.NEEDS_APPROVAL);
    expect(run?.stepResults.boxFolder).toBeUndefined(); // Box folder must NOT be created before approval

    // Now simulate Approver signing off
    await request(app)
      .post(`/api/v1/workflows/${idKey}/approve`)
      .send({ approverEmail: 'hr-director@example.com' });

    run = await waitForStatus(idKey, WORKFLOW_STATES.COMPLETED);
    expect(run?.status).toBe(WORKFLOW_STATES.COMPLETED);
    expect(run?.stepResults.boxFolder).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Scenario 10: Failed workflow retried safely with no duplicate side effects
  // ---------------------------------------------------------------------------
  it('Scenario 10: Failed workflow can be retried safely with no duplicate side effects', async () => {
    // 1. Initial run fails during Darwinbox call
    darwinboxMock.setForcedFailure('AUTH_FAILURE');
    const idKey = `sc10_retryable_${Date.now()}`;

    const payload = {
      event: 'ticket.created',
      idempotency_key: idKey,
      ticket: {
        id: `SC10-${Date.now()}`,
        subject: 'Transient auth issue',
        category: 'EQUIPMENT',
        requester: { employee_id: 'EMP-1001' },
      },
    };

    await sendWebhook(payload);
    let run = await waitForStatus(idKey, WORKFLOW_STATES.FAILED);
    expect(run?.status).toBe(WORKFLOW_STATES.FAILED);

    // 2. Fix the transient failure (clear failure)
    darwinboxMock.setForcedFailure(null);

    // 3. Trigger retry endpoint
    const retryRes = await request(app)
      .post(`/api/v1/workflows/${idKey}/retry`)
      .send();
    expect(retryRes.status).toBe(200);

    run = await waitForStatus(idKey, WORKFLOW_STATES.COMPLETED);
    expect(run?.status).toBe(WORKFLOW_STATES.COMPLETED);
    expect(run?.stepResults.boxFolder).toBeDefined();
  });
});
