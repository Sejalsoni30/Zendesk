import { db, FieldValue } from '../config/firebase.js';

export interface TicketMappingDocument {
  ticketId: string;
  boxFolderId: string;
  boxFolderUrl: string;
  employeeReference: string;
  status: 'active' | 'archived';
  createdAt: any;
  updatedAt: any;
}

export class TicketMappingRepository {
  private collection = db.collection('ticketMappings');
  private memoryMappings = new Map<string, TicketMappingDocument>();
  private useMemoryFallback = false;

  /**
   * Deterministically saves or updates the Ticket -> Box Folder mapping.
   * Document ID is the ticketId itself, ensuring instant O(1) lookups and uniqueness.
   */
  async saveMapping(
    ticketId: string,
    boxFolderId: string,
    boxFolderUrl: string,
    employeeReference: string
  ): Promise<TicketMappingDocument> {
    const doc: TicketMappingDocument = {
      ticketId,
      boxFolderId,
      boxFolderUrl,
      employeeReference,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.useMemoryFallback) {
      this.memoryMappings.set(ticketId, doc);
      return doc;
    }

    try {
      const docRef = this.collection.doc(ticketId);
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('FIRESTORE_TIMEOUT')), 1200)
      );

      await Promise.race([
        docRef.set({
          ...doc,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true }),
        timeout,
      ]);

      return doc;
    } catch {
      this.useMemoryFallback = true;
      this.memoryMappings.set(ticketId, doc);
      return doc;
    }
  }

  async getByTicketId(ticketId: string): Promise<TicketMappingDocument | null> {
    if (this.useMemoryFallback) {
      return this.memoryMappings.get(ticketId) || null;
    }

    try {
      const snap = await this.collection.doc(ticketId).get();
      return snap.exists ? (snap.data() as TicketMappingDocument) : null;
    } catch {
      return this.memoryMappings.get(ticketId) || null;
    }
  }
}

export const ticketMappingRepository = new TicketMappingRepository();
