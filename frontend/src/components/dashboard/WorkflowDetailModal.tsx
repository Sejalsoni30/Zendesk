import { useState } from 'react';
import { X, CheckCircle, Clock, AlertTriangle, ShieldCheck, Folder, ArrowRight, Code, ListTree, UserCheck } from 'lucide-react';
import { WorkflowTicket } from '../../types/workflow';
import { useRbac } from '../../context/RbacContext';

interface WorkflowDetailModalProps {
  ticket: WorkflowTicket | null;
  onClose: () => void;
  onApprove: (ticketId: string) => void;
  onReject: (ticketId: string) => void;
}

export function WorkflowDetailModal({
  ticket,
  onClose,
  onApprove,
  onReject,
}: WorkflowDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'payload' | 'audit'>('timeline');
  const { hasPermission } = useRbac();

  if (!ticket) return null;

  const canApprove = hasPermission('canApprove');
  const canReject = hasPermission('canReject');
  const canViewBoxUrl = hasPermission('canViewBoxUrl');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-slate-900 font-mono">{ticket.ticketId}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-semibold">
                {ticket.category}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  ticket.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : ticket.status === 'needs_approval'
                    ? 'bg-amber-100 text-amber-800 animate-pulse'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {ticket.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">{ticket.subject}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 flex space-x-6 text-xs sm:text-sm font-semibold bg-white">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'timeline'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListTree className="w-4 h-4" />
            <span>Process Timeline</span>
          </button>
          <button
            onClick={() => setActiveTab('payload')}
            className={`py-3 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'payload'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Zendesk Webhook Payload</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'audit'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Audit Trail ({ticket.auditLogs.length})</span>
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Employee Reference</span>
              <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{ticket.employeeId}</span>
              <span className="text-slate-500">{ticket.employeeName || 'Staff Member'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Priority</span>
              <span className="font-semibold text-slate-800 capitalize text-sm mt-0.5 block">{ticket.priority}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Idempotency Key</span>
              <span className="font-mono text-slate-600 truncate block text-[11px] mt-1" title={ticket.idempotencyKey}>
                {ticket.idempotencyKey}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Box Case Folder</span>
              {ticket.boxFolderUrl ? (
                canViewBoxUrl ? (
                  <a
                    href={ticket.boxFolderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-indigo-600 hover:underline block truncate mt-0.5"
                  >
                    CASE-{ticket.ticketId}
                  </a>
                ) : (
                  <span className="text-slate-400 italic mt-0.5 block">Protected (Viewer Restricted)</span>
                )
              ) : (
                <span className="text-slate-400 italic mt-0.5 block">Not Created Yet</span>
              )}
            </div>
          </div>

          {/* Pending Approval Banner */}
          {ticket.status === 'needs_approval' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">Human Approval Required</p>
                  <p className="text-amber-700 mt-0.5">
                    Category <span className="font-semibold">{ticket.category}</span> requires sign-off before provisioning the confidential Box storage folder.
                  </p>
                </div>
              </div>

              {canApprove ? (
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => {
                      onApprove(ticket.ticketId);
                      onClose();
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-all"
                  >
                    Authorize & Provision
                  </button>
                  {canReject && (
                    <button
                      onClick={() => {
                        onReject(ticket.ticketId);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-lg transition-all"
                    >
                      Reject
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-slate-400 italic text-[11px] shrink-0">
                  Switch to Approver or Admin role to take action
                </div>
              )}
            </div>
          )}

          {/* TAB 1: Process Timeline */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                End-to-End Orchestration Timeline
              </h4>

              {/* Step 1 */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start space-x-3 text-xs">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950">1. Zendesk Webhook Ingestion</span>
                    <span className="text-[11px] font-mono text-emerald-700">HMAC-SHA256 Validated</span>
                  </div>
                  <p className="text-emerald-800 mt-0.5">
                    Received payload for ticket {ticket.ticketId}. Computed timing-safe signature comparison over raw body bytes. Claimed idempotency key in Firestore transaction.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`p-4 rounded-xl border flex items-start space-x-3 text-xs ${
                ticket.status === 'failed' && ticket.errorCode?.includes('EMPLOYEE')
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              }`}>
                {ticket.status === 'failed' && ticket.errorCode?.includes('EMPLOYEE') ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <UserCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">2. Darwinbox HR Verification & Hierarchy</span>
                    <span className="text-[11px] font-mono text-slate-500">OAuth2 Bearer (Cached)</span>
                  </div>
                  <p className="mt-0.5 text-slate-700">
                    Verified {ticket.employeeId} ({ticket.employeeName || 'Staff'}) in Darwinbox.
                    Status: <span className="font-semibold">{ticket.status === 'failed' ? 'TERMINATED' : 'ACTIVE'}</span>.
                    Department: {ticket.department || 'Engineering'}.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className={`p-4 rounded-xl border flex items-start space-x-3 text-xs ${
                ticket.status === 'completed'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : ticket.status === 'needs_approval'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                <Folder className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">3. Box Content Cloud Enterprise Case Folder</span>
                    <span className="text-[11px] font-mono">
                      {ticket.boxFolderId ? '201 Created / Bound' : 'Awaiting Approval'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-slate-700">
                    {ticket.boxFolderId
                      ? `Provisioned enterprise path /HR-Records/Employee-${ticket.employeeId}/CASE-${ticket.ticketId}. Configured manager and auditor collaborator permissions.`
                      : 'Folder provisioning paused pending human approver sign-off.'}
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className={`p-4 rounded-xl border flex items-start space-x-3 text-xs ${
                ticket.status === 'completed'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                <ArrowRight className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">4. Zendesk Writeback & Status Update</span>
                    <span className="text-[11px] font-mono">
                      {ticket.status === 'completed' ? 'PUT /api/v2/tickets' : 'Pending Step 3'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-slate-700">
                    {ticket.status === 'completed'
                      ? 'Posted secure case folder reference as an internal note on ticket. Updated tags to [automated_box_provisioned].'
                      : 'Writeback will trigger automatically once Box folder is created.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Zendesk Payload Inspector */}
          {activeTab === 'payload' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Inbound Webhook Payload (Verified Buffer)
              </h4>
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto">
                {JSON.stringify(
                  {
                    event: 'ticket.created',
                    idempotency_key: ticket.idempotencyKey,
                    headers: {
                      'x-zendesk-webhook-signature': 'k9f8H...[HMAC-SHA256]',
                      'x-zendesk-webhook-signature-timestamp': '1700000000',
                    },
                    ticket: {
                      id: ticket.ticketId,
                      subject: ticket.subject,
                      category: ticket.category,
                      priority: ticket.priority,
                      requester: {
                        employee_id: ticket.employeeId,
                        name: ticket.employeeName,
                      },
                    },
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}

          {/* TAB 3: Audit Trail */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Append-Only Immutable Compliance Log
              </h4>
              <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200 text-xs">
                {ticket.auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900">{log.action}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            log.result === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.result === 'WAITING_APPROVAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {log.result}
                        </span>
                        <span className="text-[11px] text-slate-400">by {log.actor}</span>
                      </div>
                      {log.metadata && (
                        <p className="text-[11px] text-slate-500 font-mono mt-1">
                          {JSON.stringify(log.metadata)}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 flex justify-end bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
