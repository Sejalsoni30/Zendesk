# Research & Technical Differentiation

## 1. Scope & Objective
This document outlines our research into existing commercial integrations, open-source repositories, and official API documentation across **Zendesk**, **Darwinbox**, and **Box**.

To maintain technical integrity and defend the architecture in engineering interviews, this document strictly bifurcates:
* **Verified Findings (with official documentation references)**
* **Assumptions & Architectural Inferences**

---

## 2. Verified Findings Across Official APIs

### 2.1 Zendesk Core API & Webhook Specifications
* **Webhook Signature Verification procedure**:
  - *Source*: [Zendesk Developer Documentation: Verifying Webhook Signatures](https://developer.zendesk.com/documentation/event-driven-architecture/webhooks/verifying/)
  - *Verified Protocol*: Zendesk signs outgoing webhook requests using an HMAC-SHA256 digest over the concatenation of `[timestamp] + [raw_body]`. The signature is transmitted in base64 format via the header `X-Zendesk-Webhook-Signature` alongside `X-Zendesk-Webhook-Signature-Timestamp`.
  - *Engineering Implication*: Parsing the body into JSON before signature evaluation mutates whitespace and key order, invalidating verification. The server must preserve untouched byte buffers (`req.rawBody`) and compare using constant-time comparison (`crypto.timingSafeEqual`) to mitigate timing side-channel attacks.
* **Ticket Update Endpoint**:
  - *Source*: [Zendesk API v2: Tickets](https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/)
  - *Verified Method*: `PUT /api/v2/tickets/{ticket_id}.json` with `{ "ticket": { "comment": { "body": "...", "public": false } } }`.

### 2.2 Darwinbox HRMS API Specifications
* **Authentication & Employee Verification**:
  - *Source*: [Darwinbox Developer Portal / Open API Reference](https://developers.darwinbox.in/)
  - *Verified Protocol*: Darwinbox utilizes OAuth 2.0 Bearer Token authentication (`Authorization: Bearer <token>`). Employee verification queries require specific permissions (e.g. Employee Master Read).
  - *Rate Limiting*: Darwinbox applies HTTP 429 Too Many Requests with a `Retry-After` header when request quotas are exceeded.
  - *Engineering Implication*: Our architecture enforces OAuth2 token caching in memory (avoiding token round-trips for every webhook) and parses `Retry-After` using exponential backoff with randomized jitter.

### 2.3 Box Content Cloud API Specifications
* **Folder Provisioning & Conflict Handling**:
  - *Source*: [Box Developer Documentation: Folders API](https://developer.box.com/reference/post-folders/)
  - *Verified Protocol*: `POST /folders` with `{"name": "...", "parent": {"id": "0"}}`.
  - *Conflict Behavior*: If a folder with the same name already exists in the destination parent, the Box API returns `HTTP 409 Conflict` containing the existing folder ID in `error.context_info.conflicts`.
  - *Collaborator Permissions*: [Box Collaborations API](https://developer.box.com/reference/post-collaborations/) supports roles: `editor`, `viewer`, `previewer`, `uploader`.
  - *Engineering Implication*: To prevent duplicate folders during concurrent ticket creations, the Box service adapter catches 409 responses, extracts the existing folder reference, and avoids redundant creations.

---

## 3. Assumptions & Architectural Inferences

The following items are designated as **Assumptions** because enterprise HR and IT integrations vary by tenant configuration:

1. **[Assumption] Minimum PII Disclosure**: We assume IT workflows require only employee active status (`ACTIVE`/`INACTIVE`/`TERMINATED`), department, and manager sign-off hierarchy. We explicitly avoid ingesting, logging, or storing sensitive PII (salaries, SSNs, national identity numbers, home addresses).
2. **[Assumption] Manual Support Baseline**: We assume a human IT or HR representative takes approximately **10.5 minutes (630 seconds)** to manually cross-reference an employee across Darwinbox, create a Box folder, and reply on Zendesk.
3. **[Assumption] Webhook Redelivery Latency**: Webhook delivery engines (such as Zendesk or AWS EventBridge) retry unacknowledged webhooks with exponential intervals; duplicate webhooks may arrive within 50ms to 5 minutes of the original event.

---

## 4. Comparison Against Existing Commercial Solutions

Basic two-system integrations (e.g., Zendesk-to-Box or Zendesk-to-Slack) are commercially common (such as the standard *Box for Zendesk* Marketplace app). However, standard integrations suffer from critical architectural gaps when orchestrating across three enterprise domains:

| Architectural Capability | Standard Marketplace Apps (e.g., Box for Zendesk) | Generic iPaaS (e.g., Zapier, Make) | Our Custom Three-Platform Orchestration System |
| :--- | :--- | :--- | :--- |
| **Three-Platform Orchestration** | ❌ Dual-system only (Zendesk ↔ Box). No HRMS verification. | ⚠️ Possible via sequential recipe, but state is fragile and unversioned. | ✅ **Native Orchestration**: Zendesk event triggers Darwinbox HR verification before Box folder provisioning. |
| **Recovery from Partial Failures** | ❌ If ticket writeback fails after folder creation, the next retry creates a duplicate folder. | ❌ Retries typically rerun entire workflow from Step 1, triggering side-effect duplication. | ✅ **Granular `currentStep` & `stepResults`**: Remembers completed steps (e.g., `boxFolderId`). Retries resume exactly where they failed without duplicating folders. |
| **Concurrency & Duplicate Prevention** | ⚠️ Relies solely on Box 409 error. | ❌ Dual executions fire parallel actions under race conditions. | ✅ **Deterministic Document IDs + Transactional Leases**: Firestore transactions atomically reject parallel runs before side effects trigger. |
| **Human-in-the-Loop Approval Gating** | ❌ All tickets are treated equally without privilege escalation barriers. | ⚠️ Requires external form or polling hook. | ✅ **Built-in `needs_approval` State**: High-privilege tickets (`HR_ACCESS`) pause safely until authorized by a user with custom claim `approver`. |
| **Audit Trail & GDPR Compliance** | ❌ Basic vendor logs only; difficult to audit across systems. | ❌ Often exposes raw ticket payload and employee PII in task logs. | ✅ **Sanitized Append-Only Audit Trail**: Dedicated `auditLogs` collection stores hashes/references with sensitive data redacted. |

---

## 5. Summary of Engineering Differentiators

1. **Zero-Trust Webhook Ingestion**: Cryptographic HMAC-SHA256 signature verification over raw byte buffers prevents payload tampering.
2. **Deterministic Document IDs in Firestore**: Replaces the lack of secondary unique indexes in Firestore with atomic `runTransaction` idempotency.
3. **Pluggable Adapter Pattern**: 100% of workflows, failovers, rate limits, and dashboard UIs can be tested and demonstrated completely offline with zero vendor credentials.

