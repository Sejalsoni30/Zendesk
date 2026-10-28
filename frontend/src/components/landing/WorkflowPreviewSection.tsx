import { useState } from 'react';
import { ShieldCheck, ArrowRight, Code } from 'lucide-react';

export function WorkflowPreviewSection() {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      step: 1,
      name: '1. Zendesk Webhook',
      tag: 'HMAC-SHA256 Validated',
      title: 'Cryptographic Signature & Idempotency Check',
      description:
        'When a ticket is created or updated in Zendesk, our Express ingestion endpoint calculates the HMAC-SHA256 signature using raw body buffers and constant-time string comparison. The idempotency key is claimed in a Firestore transaction to block duplicate processing.',
      codePreview: `POST /api/webhooks/zendesk HTTP/1.1
X-Zendesk-Webhook-Signature: k9f8H...[SHA-256]
X-Zendesk-Webhook-Signature-Timestamp: 1700000000

{
  "event": "ticket.created",
  "ticket": {
    "id": "ZD-1042",
    "category": "HR_ACCESS",
    "priority": "high",
    "requester": { "employee_id": "EMP-1001" }
  }
}`,
    },
    {
      step: 2,
      name: '2. Darwinbox HRMS',
      tag: 'OAuth2 Token Cached',
      title: 'Active Verification & Manager Sign-Off Hierarchy',
      description:
        'The engine queries Darwinbox APIs to verify that the employee is currently active and in an eligible department. The manager hierarchy (managerId, managerEmail) is retrieved to configure approval chains and Box access.',
      codePreview: `GET /api/v1/employees/EMP-1001
Authorization: Bearer mock_db_oauth_token...

Response 200 OK:
{
  "verified": true,
  "employeeId": "EMP-1001",
  "name": "Aarav Sharma",
  "status": "ACTIVE",
  "department": "Engineering",
  "managerId": "MGR-5001",
  "managerEmail": "priya.iyer@example.com"
}`,
    },
    {
      step: 3,
      name: '3. Box Content Cloud',
      tag: 'Atomic Conflict Guard',
      title: 'Enterprise Folder Provisioning & Permissions',
      description:
        'Upon employee verification (or human sign-off if HR_ACCESS), Box automatically provisions a standardized enterprise path (/HR-Records/Employee-EMP-1001-AaravSharma/CASE-ZD-1042), sets granular collaborator roles, and generates a secure shared link.',
      codePreview: `POST /api/v2/folders
{
  "name": "CASE-ZD-1042",
  "parent": { "id": "fld_hr_records" }
}

Response 201 Created:
{
  "folderId": "box_fld_case_1042",
  "folderPath": "/HR-Records/Employee-EMP-1001-Aarav/CASE-ZD-1042",
  "sharedLink": "https://app.box.com/s/secure_case_1042",
  "collaborators": [
    { "email": "priya.iyer@example.com", "role": "editor" },
    { "email": "hr-audit@example.com", "role": "viewer" }
  ]
}`,
    },
    {
      step: 4,
      name: '4. Zendesk Writeback',
      tag: 'Audit Committed',
      title: 'Ticket Synchronization & Audit Persistence',
      description:
        'The secure Box folder link is posted back into Zendesk as a private internal note. The ticket status updates to pending, automated tags are bound, and an immutable audit log entry is written to Firestore.',
      codePreview: `PUT /api/v2/tickets/1042.json
{
  "ticket": {
    "status": "pending",
    "comment": {
      "body": "[Automation] Case folder provisioned: https://app.box.com/s/secure_case_1042",
      "public": false
    },
    "tags": ["automated_box_provisioned", "cat_hr_access"]
  }
}

Response 200 OK: Status Updated. Audit Log persisted.`,
    },
  ];

  const current = steps.find((s) => s.step === activeStep) || steps[0];

  return (
    <section id="workflow" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">Automated Execution Pipeline</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How Tickets Flow Through The Platform
          </h3>
          <p className="mt-4 text-base text-slate-600">
            Click on any milestone below to inspect the real payload contracts and execution mechanics.
          </p>
        </div>

        {/* Step Selector Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
          {steps.map((s) => (
            <button
              key={s.step}
              onClick={() => setActiveStep(s.step)}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-2 ${
                activeStep === s.step
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-105'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{s.name}</span>
            </button>
          ))}
        </div>

        {/* Interactive Step Card */}
        <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl grid grid-cols-1 lg:grid-cols-12 text-white">
          {/* Left Description Column */}
          <div className="lg:col-span-5 p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-4">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>{current.tag}</span>
              </div>
              <h4 className="text-2xl font-bold text-white mb-3">{current.title}</h4>
              <p className="text-slate-300 text-sm leading-relaxed">{current.description}</p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Step {current.step} of 4</span>
              <button
                onClick={() => setActiveStep((prev) => (prev % 4) + 1)}
                className="inline-flex items-center text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                <span>Next Milestone</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>

          {/* Right Code Payload Inspector Column */}
          <div className="lg:col-span-7 p-6 sm:p-8 bg-slate-950/80 font-mono text-xs overflow-x-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 text-slate-400 text-[11px]">
              <div className="flex items-center space-x-2">
                <Code className="w-4 h-4 text-indigo-400" />
                <span>Payload & API Contract</span>
              </div>
              <span className="text-emerald-400">STATUS: 200/202 SUCCESS</span>
            </div>
            <pre className="text-slate-200 leading-relaxed overflow-x-auto">{current.codePreview}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}
