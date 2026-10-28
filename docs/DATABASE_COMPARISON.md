# Database Architecture: Firestore vs. MongoDB / Mongoose

This document explains the architectural decisions, trade-offs, and design patterns used in the **Zendesk–Darwinbox–Box Automation** database layer, specifically comparing **Firebase Firestore** with **MongoDB & Mongoose**.

---

## 1. Architectural Summary & Repository Pattern

Our application implements the **Repository Pattern** (`backend/src/repositories/`). Neither Express routes nor service engines interact with the database driver directly.

```
[Express Routes / Webhooks]
           │
           ▼
[Workflow Orchestrator Engine]
           │
   ┌───────┴──────────────────────────┐
   ▼                                  ▼
[WorkflowRepository]         [TicketMappingRepository]
   │                                  │
   └───────────────┬──────────────────┘
                   ▼
  [Database Driver: Firestore / Mongo]
```

This abstraction ensures that switching between Firebase Firestore and MongoDB requires zero changes to core business logic, HMAC validation, or third-party adapters.

---

## 2. Head-to-Head Comparison: Firestore vs. MongoDB (Mongoose)

| Dimension | MongoDB + Mongoose | Firebase Firestore (Chosen) | Why Our Choice Fits This Enterprise Workflow |
| :--- | :--- | :--- | :--- |
| **Unique Secondary Indexes** | Supported natively via `ticketSchema.index({ ticketId: 1 }, { unique: true })`. Duplicate inserts throw error `11000`. | **Does NOT support unique secondary indexes.** Only the primary document ID is unique. | We utilize **Deterministic Document IDs** (`ticketMappings/{ticketId}` and `workflowRuns/{idempotencyKey}`) inside atomic Firestore transactions. This guarantees uniqueness at the storage engine level. |
| **Concurrency & Locks** | Requires external Redis lock (Redlock) or optimistic concurrency control via version keys (`__v`). | Native atomic transactions (`db.runTransaction`) with built-in optimistic concurrency and automatic retries. | Concurrent webhook deliveries for the same ticket are atomically detected and deduplicated in Firestore without requiring an external Redis server. |
| **Distributed Queue Leases** | Typically requires BullMQ + Redis, or TTL indexes with worker heartbeats. | Supported natively via document leases (`leaseOwner` + `leaseExpiresAt`) inside Firestore transactions. | Zero extra daemons required. Distributed worker nodes can run safely without dual-execution. |
| **Local Development & Testing** | Requires a running Docker container or local `mongod` service. | First-class **Firebase Emulator Suite** with zero cloud credentials and in-memory fallback. | The complete test suite runs in CI/CD and developer laptops in <5 seconds without installing database software. |
| **Security at the Boundary** | Implemented solely via backend middleware. | Strict `firestore.rules` (`allow read, write: if false;`) denying all direct client SDK access. | Guarantees that only the backend Admin SDK can access the database, eliminating client injection vectors. |

---

## 3. How Mongoose Schemas Map to Our Firestore Data Model

If an interviewer asks: *"How would you have implemented this in MongoDB with Mongoose?"*, you can present these direct schema equivalents:

### 1. `WorkflowRun` (MongoDB / Mongoose Equivalent)
```typescript
import mongoose, { Schema } from 'mongoose';

const WorkflowRunSchema = new Schema({
  idempotencyKey: { type: String, required: true, unique: true, index: true },
  ticketId: { type: String, required: true, index: true },
  subject: { type: String, required: true },
  category: { type: String, enum: ['HR_ACCESS', 'EQUIPMENT', 'PAYROLL_INQUIRY', 'SECURITY_EXCEPTION', 'GENERAL'], required: true },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  employeeReference: { type: String, required: true },
  status: { type: String, enum: ['received', 'processing', 'completed', 'needs_approval', 'failed'], default: 'received', index: true },
  currentStep: { type: String, enum: ['webhook_received', 'verifying_employee', 'resolving_box_folder', 'updating_zendesk', 'finalizing'] },
  stepResults: { type: Schema.Types.Mixed, default: {} },
  leaseOwner: { type: String, default: null },
  leaseExpiresAt: { type: Date, default: null },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  requiresApproval: { type: Boolean, default: false },
  approvedBy: { type: String, default: null },
  approvedAt: { type: Date, default: null },
  errorCode: { type: String, default: null },
  errorMessage: { type: String, default: null },
}, { timestamps: true });

// Compound index for dashboard queries:
WorkflowRunSchema.index({ status: 1, createdAt: -1 });

export const WorkflowRunModel = mongoose.model('WorkflowRun', WorkflowRunSchema);
```

### 2. `AuditLog` (MongoDB / Mongoose Equivalent)
```typescript
const AuditLogSchema = new Schema({
  workflowId: { type: String, required: true, index: true },
  ticketId: { type: String, required: true, index: true },
  actor: { type: String, default: 'system' },
  action: { type: String, required: true },
  result: { type: String, enum: ['SUCCESS', 'FAILURE', 'WAITING_APPROVAL'], required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: 'timestamp', updatedAt: false } });

AuditLogSchema.index({ ticketId: 1, timestamp: -1 });

export const AuditLogModel = mongoose.model('AuditLog', AuditLogSchema);
```

---

## 4. Key Interview Talking Points (How to Defend Firestore)

1. **"Why not MongoDB?"**:
   > *"MongoDB is an excellent document database, but in serverless and modern cloud architectures, Firebase Firestore paired with the Firebase Emulator Suite allows our entire test suite (including transactions and custom claims) to run completely self-contained without needing Docker containers or local daemon setup."*

2. **"How do you handle uniqueness without unique secondary indexes in Firestore?"**:
   > *"In MongoDB, you add `{ unique: true }` to a secondary field index. In Firestore, only the document key is unique. We enforce uniqueness by using **deterministic document IDs** (`ticketMappings/{ticketId}`) and executing mutations inside a `runTransaction`. If a concurrent request attempts to write the same ticket at the same millisecond, Firestore detects the conflict and rejects the duplicate insert. This achieves strict ACID uniqueness without requiring secondary unique indexes."*

3. **"How do you prevent duplicate side effects on retries?"**:
   > *"We track `currentStep` and write granular `stepResults` to Firestore at every milestone (e.g. `boxFolderId`). If a downstream step fails (e.g. Zendesk network timeout), the retry mechanism inspects `stepResults`. Because the Box folder ID is already persisted, the engine skips folder creation and resumes directly from the Zendesk writeback step, guaranteeing idempotent execution."*

