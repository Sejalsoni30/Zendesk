# Zendesk–Darwinbox–Box Automation

> **Enterprise-grade multi-platform employee support automation** integrating Zendesk (Service Desk), Darwinbox (HRMS), and Box (Cloud Storage) with deterministic state machines, transactional idempotency, and human-in-the-loop approvals.

---

## 📖 "Explain It Simply" (Interview Defense & Concepts)

### 1. The Core Architecture
When an employee requests sensitive access or files an internal support ticket in Zendesk:
1. **Zendesk** fires a signed webhook event (`X-Zendesk-Webhook-Signature`).
2. Our **Express API** validates the cryptographic HMAC-SHA256 signature using raw body buffers to prevent tampering.
3. The **Workflow Engine** claims the event in **Firestore** using a deterministic document ID (`workflowRuns/{idempotencyKey}`) and a transactional lease (`leaseOwner` + `leaseExpiresAt`).
4. The system queries **Darwinbox** to verify active employment and job role, retrieving only the bare minimum required fields (GDPR/privacy-first).
5. If the request is sensitive (e.g. `HR_ACCESS`), the workflow pauses in `needs_approval` until an authorized HR approver reviews it on the React dashboard.
6. The system queries **Box** to find or create a dedicated case folder (`CASE-<ticketId>`) using atomic conflict-handling to prevent duplicate folders.
7. The system updates the **Zendesk** ticket with the secure folder URL.
8. Every milestone is recorded in an append-only, immutable **Audit Log**.

---

### 2. Why Idempotency?
In cloud architectures, webhooks follow **at-least-once delivery**. A network blip or timeout can cause Zendesk to resend the exact same ticket event 2 or 3 times. Without idempotency:
- The system might create 3 duplicate Box folders.
- It might spam the employee with duplicate confirmation emails.
- It might execute duplicate HR actions.

**Our Solution**: Every incoming event has a deterministic idempotency key. Before any side effect runs, the workflow checks if that key has already been claimed or completed. Replay attempts are acknowledged safely without repeating side effects.

---

### 3. Why a Formal State Machine?
Workflows are distributed and asynchronous. Without a state machine, code quickly becomes a spaghetti of `if-else` flags where an unexpected failure can leave a ticket half-processed and in an undefined state.

Our engine defines 5 explicit states (`received`, `processing`, `completed`, `needs_approval`, `failed`) and strictly validates allowed transitions in a single file (`backend/src/stateMachine/transitions.ts`). If a server crashes while updating Zendesk, `currentStep` remembers that the Box folder was already created. When retried, it resumes right where it left off, avoiding duplicate folder creation.

---

### 4. Why Deterministic Document IDs + Transactions in Firestore?
In traditional relational databases or MongoDB, duplicate prevention is handled by creating a unique index on a field (e.g., `db.collection.createIndex({ ticketId: 1 }, { unique: true })`).

**Firestore does NOT support unique secondary indexes.** In Firestore, only the document's primary ID is guaranteed unique.

**How We Defend This in an Interview:**
> *"Because Firestore lacks unique secondary indexes, we use deterministic document IDs. For example, in `ticketMappings`, the document ID is the `ticketId` itself (e.g., `ZD-1042`). When processing an event, we perform a Firestore transaction: we check if the document exists, and if not, we call `transaction.create()`. If two concurrent requests arrive at the same millisecond, Firestore's optimistic concurrency control detects the write collision and fails the second one with an `ALREADY_EXISTS` error. This guarantees zero duplicates at the storage level without needing unique indexes."*

---

## 🛠️ Project Structure

```
d:\Zendesk\
├── backend/            # Express.js API, Firebase Admin SDK, Workflow Engine, Mocks
│   ├── src/
│   │   ├── config/     # Zod-validated environment & Firebase Admin initialization
│   │   ├── controllers/# Webhook, Workflow, Approval, and Health controllers
│   │   ├── middleware/ # HMAC auth, RBAC custom claims, rate limiter, error handler
│   │   ├── repositories/# Isolated Firestore repositories (workflowRuns, mappings, audit)
│   │   ├── routes/     # Express route definitions
│   │   ├── schemas/    # Zod validation schemas
│   │   ├── services/   # Pluggable Zendesk, Darwinbox, Box adapters (Mock & Real)
│   │   ├── stateMachine/# Formal states, granular steps, and transition tables
│   │   └── scripts/    # Database seeding and benchmark evaluation scripts
│   └── tests/          # Vitest unit, smoke, and integration test suite
│
├── frontend/           # React 18 SPA (Vite + TailwindCSS)
│   └── src/            # Components, Auth Context, Dashboard, KPI cards, Timelines
│
├── docs/               # Research findings, benchmark evaluation, and architecture
├── firebase.json       # Firebase Emulator configuration (Firestore & Auth)
├── firestore.rules     # Strict access rules (denies all direct client reads/writes)
└── firestore.indexes.json # Composite indexes for dashboard filtering
```

---

## 🚀 Quickstart & Running Locally

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **Java JRE/JDK 11+**: Required for the Firebase Emulator Suite (a portable JRE 17 is configured in `C:\Users\COMPUTER HOUSE\.tools\jre17`).

### 2. Install Dependencies
```bash
# From the project root:
npm install --prefix backend
npm install --prefix frontend
```

### 3. Start Firebase Emulators
The Firebase Emulator Suite runs Firestore on port `8080` and Auth on port `9099` with zero cloud credentials required.
```bash
# Terminal 1: Run Emulators
npm run emulators
# (or: npx firebase-tools emulators:start --only firestore,auth)
```

### 4. Seed Test Data & Users
Once the emulators are running, populate test accounts (`admin`, `approver`, `viewer`) and sample tickets (`ZD-1042`, `EMP-1001`):
```bash
# Terminal 2: Seed Emulator
npm run seed
```

### 5. Run the Backend API
```bash
npm run dev:backend
# Server runs at http://localhost:5000
# Health check: http://localhost:5000/api/v1/health
```

### 6. Run Smoke & Integration Tests
```bash
npm --prefix backend run smoke-test
npm --prefix backend run test
```

