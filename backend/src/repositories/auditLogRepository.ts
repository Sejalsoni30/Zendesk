import { db, FieldValue } from '../config/firebase.js';

export interface AuditLogEntry {
  workflowId: string;
  ticketId: string;
  action: string;
  actor: string;
  result: 'SUCCESS' | 'FAILURE' | 'WAITING_APPROVAL';
  metadata?: Record<string, any>;
  timestamp?: any;
}

export class AuditLogRepository {
  private collection = db.collection('auditLogs');
  private memoryLogs: Array<AuditLogEntry & { id: string }> = [];
  private useMemoryFallback = false;

  /**
   * Appends an immutable audit log entry.
   * Strips any sensitive credentials or tokens from metadata before persisting.
   */
  async append(entry: AuditLogEntry): Promise<string> {
    const sanitizedMetadata = this.sanitizeMetadata(entry.metadata);

    if (this.useMemoryFallback) {
      const id = `aud_mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      this.memoryLogs.push({
        ...entry,
        id,
        metadata: sanitizedMetadata,
        timestamp: new Date(),
      });
      return id;
    }

    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('FIRESTORE_TIMEOUT')), 1200)
      );

      const addPromise = this.collection.add({
        ...entry,
        metadata: sanitizedMetadata,
        timestamp: FieldValue.serverTimestamp(),
      });

      const docRef = await Promise.race([addPromise, timeout]);
      return docRef.id;
    } catch {
      this.useMemoryFallback = true;
      return this.append(entry);
    }
  }

  async getLogsByTicket(ticketId: string, limitCount = 50): Promise<any[]> {
    if (this.useMemoryFallback) {
      return this.memoryLogs.filter((l) => l.ticketId === ticketId).slice(0, limitCount);
    }

    try {
      const snap = await this.collection
        .where('ticketId', '==', ticketId)
        .orderBy('timestamp', 'asc')
        .limit(limitCount)
        .get();

      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      return this.memoryLogs.filter((l) => l.ticketId === ticketId).slice(0, limitCount);
    }
  }

  private sanitizeMetadata(meta?: Record<string, any>): Record<string, any> {
    if (!meta) return {};
    const sanitized: Record<string, any> = {};

    const sensitiveKeys = ['password', 'secret', 'token', 'authorization', 'ssn', 'salary'];

    for (const [k, v] of Object.entries(meta)) {
      if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
        sanitized[k] = '[REDACTED]';
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }
}

export const auditLogRepository = new AuditLogRepository();
