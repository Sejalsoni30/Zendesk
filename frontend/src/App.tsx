import { useState } from 'react';
import { Navbar } from './components/layout/Navbar';
import { KpiCards } from './components/dashboard/KpiCards';
import { WorkflowTable } from './components/dashboard/WorkflowTable';
import { WorkflowDetailModal } from './components/dashboard/WorkflowDetailModal';
import { SimulateWebhookModal } from './components/dashboard/SimulateWebhookModal';
import { INITIAL_TICKETS } from './data/mockData';
import { WorkflowTicket, UserRole } from './types/workflow';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

export default function App() {
  const [tickets, setTickets] = useState<WorkflowTicket[]>(INITIAL_TICKETS);
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [selectedTicket, setSelectedTicket] = useState<WorkflowTicket | null>(null);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Approve a pending ticket (Human-in-the-loop action)
  const handleApproveTicket = (ticketId: string) => {
    if (currentRole === 'viewer') {
      alert('Unauthorized: Viewer role cannot approve workflows.');
      return;
    }

    const now = new Date().toISOString();
    setTickets((prev) =>
      prev.map((t) => {
        if (t.ticketId === ticketId) {
          const folderId = `box_fld_case_${ticketId.toLowerCase()}`;
          const updated: WorkflowTicket = {
            ...t,
            status: 'completed',
            currentStep: 'finalizing',
            boxFolderId: folderId,
            boxFolderUrl: `https://app.box.com/folder/${folderId}`,
            approvedBy: `${currentRole}@example.com`,
            approvedAt: now,
            updatedAt: now,
            auditLogs: [
              ...t.auditLogs,
              {
                id: `aud_${Date.now()}_appr`,
                action: 'APPROVAL_GRANTED',
                actor: `${currentRole}@example.com`,
                result: 'SUCCESS',
                timestamp: now,
                metadata: { role: currentRole, action: 'Authorized Box Case Folder Creation' },
              },
              {
                id: `aud_${Date.now()}_box`,
                action: 'BOX_FOLDER_RESOLVED',
                actor: 'system',
                result: 'SUCCESS',
                timestamp: now,
                metadata: { folderId, folderName: `CASE-${ticketId}` },
              },
              {
                id: `aud_${Date.now()}_zd`,
                action: 'ZENDESK_WRITEBACK_COMMITTED',
                actor: 'system',
                result: 'SUCCESS',
                timestamp: now,
                metadata: { status: 'pending', comment: `Case folder created: https://app.box.com/folder/${folderId}` },
              },
              {
                id: `aud_${Date.now()}_done`,
                action: 'WORKFLOW_COMPLETED',
                actor: 'system',
                result: 'SUCCESS',
                timestamp: now,
              },
            ],
          };

          if (selectedTicket?.ticketId === ticketId) {
            setSelectedTicket(updated);
          }
          return updated;
        }
        return t;
      })
    );

    showToast(`✅ Ticket ${ticketId} approved! Box folder created & Zendesk updated.`);
  };

  // Reject a pending ticket
  const handleRejectTicket = (ticketId: string) => {
    if (currentRole === 'viewer') {
      alert('Unauthorized: Viewer role cannot reject workflows.');
      return;
    }

    const now = new Date().toISOString();
    setTickets((prev) =>
      prev.map((t) => {
        if (t.ticketId === ticketId) {
          const updated: WorkflowTicket = {
            ...t,
            status: 'failed',
            errorCode: 'REJECTED_BY_APPROVER',
            errorMessage: `Workflow explicitly rejected by ${currentRole}@example.com`,
            updatedAt: now,
            auditLogs: [
              ...t.auditLogs,
              {
                id: `aud_${Date.now()}_rej`,
                action: 'APPROVAL_REJECTED',
                actor: `${currentRole}@example.com`,
                result: 'FAILURE',
                timestamp: now,
                metadata: { role: currentRole },
              },
              {
                id: `aud_${Date.now()}_halt`,
                action: 'WORKFLOW_HALTED',
                actor: 'system',
                result: 'FAILURE',
                timestamp: now,
              },
            ],
          };

          if (selectedTicket?.ticketId === ticketId) {
            setSelectedTicket(updated);
          }
          return updated;
        }
        return t;
      })
    );

    showToast(`❌ Ticket ${ticketId} rejected by ${currentRole}.`);
  };

  const handleSimulateNew = (newTicket: WorkflowTicket) => {
    setTickets((prev) => [newTicket, ...prev]);
    showToast(`🚀 New Zendesk event received for ${newTicket.ticketId}!`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-xs sm:text-sm animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onOpenSimulate={() => setIsSimulateOpen(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Banner / Role Hint */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-indigo-50 via-slate-50 to-emerald-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <span>Interactive Enterprise Demonstration</span>
              <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                Phase 1 Skeleton & Interactive Dashboard
              </span>
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Current active role: <span className="font-semibold text-slate-900 capitalize">{currentRole}</span>.
              Try clicking <span className="font-semibold text-emerald-700">Approve</span> on <span className="font-semibold">ZD-1042</span> or use the Role switcher in the top right to test RBAC gating!
            </p>
          </div>
          {currentRole === 'viewer' && (
            <div className="flex items-center space-x-1 text-xs text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 self-start sm:self-auto shrink-0">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Viewer Mode: Actions and Folder URLs restricted</span>
            </div>
          )}
        </div>

        {/* 1. KPI Cards */}
        <KpiCards tickets={tickets} />

        {/* 2. Workflows Data Table */}
        <WorkflowTable
          tickets={tickets}
          currentRole={currentRole}
          onSelectTicket={setSelectedTicket}
          onApproveTicket={handleApproveTicket}
          onRejectTicket={handleRejectTicket}
        />
      </main>

      {/* Workflow Details Modal */}
      <WorkflowDetailModal
        ticket={selectedTicket}
        currentRole={currentRole}
        onClose={() => setSelectedTicket(null)}
        onApprove={handleApproveTicket}
        onReject={handleRejectTicket}
      />

      {/* Inbound Webhook Simulation Modal */}
      <SimulateWebhookModal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        onSimulate={handleSimulateNew}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        Zendesk–Darwinbox–Box Support Workflow Automation Engine • Production-Grade Architecture
      </footer>
    </div>
  );
}
