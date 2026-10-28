import { useState } from 'react';
import { X, Sparkles, Send, ShieldCheck } from 'lucide-react';
import { TicketCategory, WorkflowTicket } from '../../types/workflow';

interface SimulateWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulate: (newTicket: WorkflowTicket) => void;
}

export function SimulateWebhookModal({
  isOpen,
  onClose,
  onSimulate,
}: SimulateWebhookModalProps) {
  const [ticketId, setTicketId] = useState(`ZD-${Math.floor(1000 + Math.random() * 9000)}`);
  const [subject, setSubject] = useState('Urgent Access Permission Request');
  const [category, setCategory] = useState<TicketCategory>('HR_ACCESS');
  const [employeeId, setEmployeeId] = useState('EMP-1001');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('high');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const requiresApproval = category === 'HR_ACCESS';
    const isTerminated = employeeId === 'EMP-9999';

    const now = new Date().toISOString();
    const idempotencyKey = `evt_${ticketId.toLowerCase()}_${Date.now()}`;

    const newTicket: WorkflowTicket = {
      idempotencyKey,
      ticketId,
      subject,
      category,
      priority,
      employeeId,
      department: employeeId === 'EMP-1001' ? 'Engineering' : employeeId === 'EMP-1002' ? 'Human Resources' : 'Operations',
      status: isTerminated ? 'failed' : requiresApproval ? 'needs_approval' : 'completed',
      currentStep: isTerminated ? 'verifying_employee' : requiresApproval ? 'verifying_employee' : 'finalizing',
      boxFolderId: !isTerminated && !requiresApproval ? `box_fld_${ticketId.toLowerCase()}` : undefined,
      boxFolderUrl: !isTerminated && !requiresApproval ? `https://app.box.com/folder/box_fld_${ticketId.toLowerCase()}` : undefined,
      requiresApproval,
      errorCode: isTerminated ? 'ERR_EMPLOYEE_INACTIVE' : undefined,
      errorMessage: isTerminated ? `Employee ${employeeId} is terminated in Darwinbox.` : undefined,
      createdAt: now,
      updatedAt: now,
      auditLogs: [
        {
          id: `aud_${Date.now()}_1`,
          action: 'WEBHOOK_RECEIVED',
          actor: 'system',
          result: 'SUCCESS',
          timestamp: now,
          metadata: { hmacSignature: 'sha256_verified', rawBodyBytes: 312 },
        },
        {
          id: `aud_${Date.now()}_2`,
          action: 'DARWINBOX_EMPLOYEE_VERIFIED',
          actor: 'system',
          result: isTerminated ? 'FAILURE' : 'SUCCESS',
          timestamp: new Date(Date.now() + 500).toISOString(),
          metadata: { employeeId, status: isTerminated ? 'TERMINATED' : 'ACTIVE' },
        },
        ...(requiresApproval && !isTerminated
          ? [
              {
                id: `aud_${Date.now()}_3`,
                action: 'SENSITIVE_CATEGORY_FLAGGED',
                actor: 'system',
                result: 'WAITING_APPROVAL' as const,
                timestamp: new Date(Date.now() + 800).toISOString(),
                metadata: { category: 'HR_ACCESS', reason: 'Mandatory approver sign-off' },
              },
            ]
          : !isTerminated
          ? [
              {
                id: `aud_${Date.now()}_3`,
                action: 'BOX_FOLDER_RESOLVED',
                actor: 'system',
                result: 'SUCCESS' as const,
                timestamp: new Date(Date.now() + 800).toISOString(),
                metadata: { folderId: `box_fld_${ticketId.toLowerCase()}` },
              },
              {
                id: `aud_${Date.now()}_4`,
                action: 'ZENDESK_WRITEBACK_COMMITTED',
                actor: 'system',
                result: 'SUCCESS' as const,
                timestamp: new Date(Date.now() + 1200).toISOString(),
              },
            ]
          : []),
      ],
    };

    onSimulate(newTicket);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Simulate Zendesk Webhook Event</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ticket ID</label>
            <input
              type="text"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="HR_ACCESS">HR_ACCESS (Requires Approval)</option>
                <option value="EQUIPMENT">EQUIPMENT (Auto-provision)</option>
                <option value="SECURITY_EXCEPTION">SECURITY_EXCEPTION</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Employee Reference</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
              >
                <option value="EMP-1001">EMP-1001 (Active Software Engineer)</option>
                <option value="EMP-1002">EMP-1002 (Active HR Staff)</option>
                <option value="EMP-9999">EMP-9999 (Terminated - Test Failure)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Priority</label>
            <div className="flex space-x-2">
              {(['low', 'normal', 'high', 'urgent'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-1.5 capitalize rounded-lg text-xs font-semibold border ${
                    priority === p ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Simulates HMAC-SHA256 signature verification and atomic lease locking.</span>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Fire Webhook Event</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

