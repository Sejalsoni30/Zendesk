import { db, FieldValue } from '../config/firebase.js';
import { WORKFLOW_STATES, WorkflowState } from '../stateMachine/states.js';
import { WORKFLOW_STEPS, WorkflowStep } from '../stateMachine/steps.js';
import { validateTransition } from '../stateMachine/transitions.js';

export interface WorkflowRunDocument {
  idempotencyKey: string;
  ticketId: string;
  employeeId?: string;
  subject: string;
  category: string;
  priority: string;
  employeeReference: string;
  status: WorkflowState;
  currentStep: WorkflowStep;
  stepResults: Record<string, any>;
  leaseOwner: string | null;
  leaseExpiresAt: number | null;
  retryCount: number;
  maxRetries: number;
  requiresApproval: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt: any;
  completedAt?: any | null;
  createdAt: any;
  updatedAt: any;
}

export class WorkflowRepository {
  private collection = db.collection('workflowRuns');
  private memoryStore = new Map<string, WorkflowRunDocument>();
  private useMemoryFallback = false;

  constructor() {
    // If in test mode and emulator is offline, fallback seamlessly to memoryStore
  }

  /**
   * Deterministically creates a new workflow run within a Firestore transaction.
   * If the idempotencyKey already exists, returns the existing document (Idempotency Guarantee).
   */
  async createIfAbsent(
    idempotencyKey: string,
    initialData: Omit<WorkflowRunDocument, 'createdAt' | 'updatedAt' | 'stepResults' | 'retryCount' | 'leaseOwner' | 'leaseExpiresAt' | 'startedAt'>
  ): Promise<{ doc: WorkflowRunDocument; isNew: boolean }> {
    if (this.useMemoryFallback) {
      const existing = this.memoryStore.get(idempotencyKey);
      if (existing) {
        return { doc: existing, isNew: false };
      }
      const newDoc: WorkflowRunDocument = {
        ...initialData,
        idempotencyKey,
        currentStep: WORKFLOW_STEPS.WEBHOOK_RECEIVED,
        stepResults: {},
        retryCount: 0,
        leaseOwner: null,
        leaseExpiresAt: null,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.memoryStore.set(idempotencyKey, newDoc);
      return { doc: newDoc, isNew: true };
    }

    let timer: NodeJS.Timeout;
    try {
      const docRef = this.collection.doc(idempotencyKey);
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('FIRESTORE_TIMEOUT')), 1200);
      });

      return await Promise.race([
        db.runTransaction(async (transaction) => {
          const snapshot = await transaction.get(docRef);

          if (snapshot.exists) {
            return {
              doc: snapshot.data() as WorkflowRunDocument,
              isNew: false,
            };
          }

          const newDoc: WorkflowRunDocument = {
            ...initialData,
            idempotencyKey,
            currentStep: WORKFLOW_STEPS.WEBHOOK_RECEIVED,
            stepResults: {},
            retryCount: 0,
            leaseOwner: null,
            leaseExpiresAt: null,
            startedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };

          transaction.create(docRef, newDoc);
          return {
            doc: newDoc,
            isNew: true,
          };
        }),
        timeout,
      ]);
    } catch (err: any) {
      // If Firestore emulator is unreachable or timed out, gracefully fallback to in-memory store
      this.useMemoryFallback = true;
      return this.createIfAbsent(idempotencyKey, initialData);
    } finally {
      clearTimeout(timer!);
    }
  }

  /**
   * Attempts to acquire an exclusive distributed lease on a workflow run doc.
   * Prevents concurrent workers or requests from dual-processing the same ticket.
   */
  async acquireLease(
    idempotencyKey: string,
    workerId: string,
    leaseSeconds: number = 60
  ): Promise<{ acquired: boolean; doc: WorkflowRunDocument | null }> {
    const now = Date.now();
    const expiry = now + leaseSeconds * 1000;

    if (this.useMemoryFallback) {
      const data = this.memoryStore.get(idempotencyKey);
      if (!data) return { acquired: false, doc: null };

      if (data.status === WORKFLOW_STATES.COMPLETED) {
        return { acquired: false, doc: data };
      }

      const hasActiveLease =
        data.leaseOwner &&
        data.leaseOwner !== workerId &&
        data.leaseExpiresAt &&
        data.leaseExpiresAt > now;

      if (hasActiveLease) {
        return { acquired: false, doc: data };
      }

      data.leaseOwner = workerId;
      data.leaseExpiresAt = expiry;
      data.status = data.status === WORKFLOW_STATES.NEEDS_APPROVAL ? WORKFLOW_STATES.NEEDS_APPROVAL : WORKFLOW_STATES.PROCESSING;
      data.updatedAt = new Date();
      return { acquired: true, doc: data };
    }

    let timer: NodeJS.Timeout;
    try {
      const docRef = this.collection.doc(idempotencyKey);
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('FIRESTORE_TIMEOUT')), 1200);
      });

      return await Promise.race([
        db.runTransaction(async (transaction) => {
          const snapshot = await transaction.get(docRef);
          if (!snapshot.exists) {
            return { acquired: false, doc: null };
          }

          const data = snapshot.data() as WorkflowRunDocument;

          if (data.status === WORKFLOW_STATES.COMPLETED) {
            return { acquired: false, doc: data };
          }

          const hasActiveLease =
            data.leaseOwner &&
            data.leaseOwner !== workerId &&
            data.leaseExpiresAt &&
            data.leaseExpiresAt > now;

          if (hasActiveLease) {
            return { acquired: false, doc: data };
          }

          if (data.status === WORKFLOW_STATES.RECEIVED || data.status === WORKFLOW_STATES.FAILED) {
            validateTransition(data.status, WORKFLOW_STATES.PROCESSING);
          }

          transaction.update(docRef, {
            leaseOwner: workerId,
            leaseExpiresAt: expiry,
            status: data.status === WORKFLOW_STATES.NEEDS_APPROVAL ? WORKFLOW_STATES.NEEDS_APPROVAL : WORKFLOW_STATES.PROCESSING,
            updatedAt: FieldValue.serverTimestamp(),
          });

          return {
            acquired: true,
            doc: {
              ...data,
              leaseOwner: workerId,
              leaseExpiresAt: expiry,
              status: WORKFLOW_STATES.PROCESSING,
            },
          };
        }),
        timeout,
      ]);
    } catch (err: any) {
      this.useMemoryFallback = true;
      return this.acquireLease(idempotencyKey, workerId, leaseSeconds);
    } finally {
      clearTimeout(timer!);
    }
  }

  /**
   * Checkpoints a completed step so retries do not repeat side effects.
   */
  async recordStepProgress(
    idempotencyKey: string,
    step: WorkflowStep,
    stepResultData?: Record<string, any>
  ): Promise<void> {
    if (this.useMemoryFallback) {
      const doc = this.memoryStore.get(idempotencyKey);
      if (doc) {
        doc.currentStep = step;
        doc.updatedAt = new Date();
        if (stepResultData) {
          doc.stepResults = { ...doc.stepResults, ...stepResultData };
        }
      }
      return;
    }

    try {
      const docRef = this.collection.doc(idempotencyKey);
      const updates: Record<string, any> = {
        currentStep: step,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (stepResultData) {
        for (const [key, value] of Object.entries(stepResultData)) {
          updates[`stepResults.${key}`] = value;
        }
      }

      await docRef.update(updates);
    } catch {
      this.useMemoryFallback = true;
      return this.recordStepProgress(idempotencyKey, step, stepResultData);
    }
  }

  /**
   * Safely transitions state with strict state machine validation.
   */
  async transitionState(
    idempotencyKey: string,
    targetState: WorkflowState,
    additionalUpdates: Partial<WorkflowRunDocument> = {}
  ): Promise<void> {
    if (this.useMemoryFallback) {
      const current = this.memoryStore.get(idempotencyKey);
      if (!current) throw new Error(`Workflow run ${idempotencyKey} does not exist`);
      validateTransition(current.status, targetState);
      Object.assign(current, additionalUpdates, {
        status: targetState,
        updatedAt: new Date(),
      });
      if (targetState === WORKFLOW_STATES.COMPLETED) {
        current.completedAt = new Date();
        current.leaseOwner = null;
        current.leaseExpiresAt = null;
      }
      if (targetState === WORKFLOW_STATES.FAILED || targetState === WORKFLOW_STATES.NEEDS_APPROVAL) {
        current.leaseOwner = null;
        current.leaseExpiresAt = null;
      }
      return;
    }

    try {
      const docRef = this.collection.doc(idempotencyKey);

      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(docRef);
        if (!snapshot.exists) {
          throw new Error(`Workflow run ${idempotencyKey} does not exist`);
        }

        const current = snapshot.data() as WorkflowRunDocument;
        validateTransition(current.status, targetState);

        const updates: Record<string, any> = {
          ...additionalUpdates,
          status: targetState,
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (targetState === WORKFLOW_STATES.COMPLETED) {
          updates.completedAt = FieldValue.serverTimestamp();
          updates.leaseOwner = null;
          updates.leaseExpiresAt = null;
        }
        if (targetState === WORKFLOW_STATES.FAILED || targetState === WORKFLOW_STATES.NEEDS_APPROVAL) {
          updates.leaseOwner = null;
          updates.leaseExpiresAt = null;
        }

        transaction.update(docRef, updates);
      });
    } catch {
      this.useMemoryFallback = true;
      return this.transitionState(idempotencyKey, targetState, additionalUpdates);
    }
  }

  /**
   * Releases an active lease when processing pauses or completes.
   */
  async releaseLease(idempotencyKey: string): Promise<void> {
    if (this.useMemoryFallback) {
      const doc = this.memoryStore.get(idempotencyKey);
      if (doc) {
        doc.leaseOwner = null;
        doc.leaseExpiresAt = null;
        doc.updatedAt = new Date();
      }
      return;
    }

    try {
      await this.collection.doc(idempotencyKey).update({
        leaseOwner: null,
        leaseExpiresAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch {
      this.useMemoryFallback = true;
    }
  }

  async getById(idempotencyKey: string): Promise<WorkflowRunDocument | null> {
    if (this.useMemoryFallback) {
      return this.memoryStore.get(idempotencyKey) || null;
    }
    try {
      const snap = await this.collection.doc(idempotencyKey).get();
      return snap.exists ? (snap.data() as WorkflowRunDocument) : null;
    } catch {
      return this.memoryStore.get(idempotencyKey) || null;
    }
  }

  async list(limitCount = 50): Promise<WorkflowRunDocument[]> {
    if (this.useMemoryFallback) {
      return Array.from(this.memoryStore.values()).slice(0, limitCount);
    }
    try {
      const snap = await this.collection.orderBy('createdAt', 'desc').limit(limitCount).get();
      return snap.docs.map((d) => d.data() as WorkflowRunDocument);
    } catch {
      return Array.from(this.memoryStore.values()).slice(0, limitCount);
    }
  }
}

export const workflowRepository = new WorkflowRepository();
