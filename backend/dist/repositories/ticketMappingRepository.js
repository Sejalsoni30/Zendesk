import { db, FieldValue } from '../config/firebase.js';
export class TicketMappingRepository {
    collection = db.collection('ticketMappings');
    memoryMappings = new Map();
    useMemoryFallback = false;
    /**
     * Deterministically saves or updates the Ticket -> Box Folder mapping.
     * Document ID is the ticketId itself, ensuring instant O(1) lookups and uniqueness.
     */
    async saveMapping(ticketId, boxFolderId, boxFolderUrl, employeeReference) {
        const doc = {
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
        let timer;
        try {
            const docRef = this.collection.doc(ticketId);
            const timeout = new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error('FIRESTORE_TIMEOUT')), 1200);
            });
            await Promise.race([
                docRef.set({
                    ...doc,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true }),
                timeout,
            ]);
            return doc;
        }
        catch {
            this.useMemoryFallback = true;
            this.memoryMappings.set(ticketId, doc);
            return doc;
        }
        finally {
            clearTimeout(timer);
        }
    }
    async getByTicketId(ticketId) {
        if (this.useMemoryFallback) {
            return this.memoryMappings.get(ticketId) || null;
        }
        try {
            const snap = await this.collection.doc(ticketId).get();
            return snap.exists ? snap.data() : null;
        }
        catch {
            return this.memoryMappings.get(ticketId) || null;
        }
    }
}
export const ticketMappingRepository = new TicketMappingRepository();
