import { useState, useEffect } from 'react';
import { RbacProvider, useRbac } from './context/RbacContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { Navbar } from './components/layout/Navbar';
import { KpiCards } from './components/dashboard/KpiCards';
import { WorkflowTable } from './components/dashboard/WorkflowTable';
import { WorkflowDetailModal } from './components/dashboard/WorkflowDetailModal';
import { SimulateWebhookModal } from './components/dashboard/SimulateWebhookModal';
import { INITIAL_TICKETS } from './data/mockData';
import { WorkflowTicket } from './types/workflow';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

function DashboardView() {
  const [tickets, setTickets] = useState<WorkflowTicket[]>(INITIAL_TICKETS);
  const [selectedTicket, setSelectedTicket] = useState<WorkflowTicket | null>(null);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { role, hasPermission } = useRbac();
  const { socket } = useSocket();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // -------------------------------------------------------------
  // Real-time WebSocket Listeners (Socket.io)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    socket.on('ticket:created', (data: any) => {
      console.log('⚡ Received WebSocket ticket:created event', data);
      setTickets((prev) => {
        // Prevent duplicate append if already present
        if (prev.some((t) => t.ticketId === data.ticketId || t.idempotencyKey === data.idempotencyKey)) {
          return prev;
        }
        return [
          {
            ...data,
            employeeName: data.employeeId === 'EMP-1001' ? 'Aarav Sharma' : 'Staff Member',
            department: data.employeeId === 'EMP-1001' ? 'Engineering' : 'Support',
            auditLogs: [
              {
                id: `aud_ws_${Date.now()}`,
                action: 'WEBHOOK_RECEIVED',
                actor: 'system',
                result: 'SUCCESS',
                timestamp: new Date().toISOString(),
                metadata: { via: 'WebSocket Live Sync' },
              },
            ],
          },
          ...prev,
        ];
      });
      showToast(`🔔 Live Event: Ticket ${data.ticketId} received via WebSocket`);
    });

    socket.on('ticket:updated', (data: any) => {
      console.log('⚡ Received WebSocket ticket:updated event', data);
      setTickets((prev) =>
        prev.map((t) => (t.ticketId === data.ticketId || t.idempotencyKey === data.idempotencyKey ? { ...t, ...data, updatedAt: new Date().toISOString() } : t))
      );
      if (selectedTicket?.ticketId === data.ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, ...data, updatedAt: new Date().toISOString() } : null));
      }
    });

    socket.on('ticket:completed', (data: any) => {
      console.log('⚡ Received WebSocket ticket:completed event', data);
      setTickets((prev) =>
        prev.map((t) =>
          t.ticketId === data.ticketId || t.idempotencyKey === data.idempotencyKey
            ? { ...t, status: 'completed', currentStep: 'finalizing', boxFolderId: data.boxFolderId, boxFolderUrl: data.boxFolderUrl, updatedAt: new Date().toISOString() }
            : t
        )
      );
      if (selectedTicket?.ticketId === data.ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, status: 'completed', boxFolderUrl: data.boxFolderUrl, updatedAt: new Date().toISOString() } : null));
      }
      showToast(`✅ Live Event: Ticket ${data.ticketId} completed! Box folder created.`);
    });

    return () => {
      socket.off('ticket:created');
      socket.off('ticket:updated');
      socket.off('ticket:completed');
    };
  }, [socket, selectedTicket]);

  // -------------------------------------------------------------
  // Actions: Approve Ticket
  // -------------------------------------------------------------
  const handleApproveTicket = (ticketId: string) => {
    if (!hasPermission('canApprove')) {
      alert('Access Denied: Your active role does not have approval permissions.');
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
            approvedBy: `${role}@example.com`,
            approvedAt: now,
            updatedAt: now,
            auditLogs: [
              ...t.auditLogs,
              {
                id: `aud_${Date.now()}_appr`,
                action: 'APPROVAL_GRANTED',
                actor: `${role}@example.com`,
                result: 'SUCCESS',
                timestamp: now,
                metadata: { role, action: 'Authorized Enterprise Box Folder Provisioning' },
              },
              {
                id: `aud_${Date.now()}_box`,
                action: 'BOX_FOLDER_RESOLVED',
                actor: 'system',
                result: 'SUCCESS',
                timestamp: now,
                metadata: { folderId, folderPath: `/HR-Records/Employee-${t.employeeId}/CASE-${ticketId}` },
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

    showToast(`✅ Ticket ${ticketId} approved! Box folder provisioned & Zendesk updated.`);
  };

  // -------------------------------------------------------------
  // Actions: Reject Ticket
  // -------------------------------------------------------------
  const handleRejectTicket = (ticketId: string) => {
    if (!hasPermission('canReject')) {
      alert('Access Denied: Your active role does not have rejection permissions.');
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
            errorMessage: `Workflow explicitly rejected by ${role}@example.com`,
            updatedAt: now,
            auditLogs: [
              ...t.auditLogs,
              {
                id: `aud_${Date.now()}_rej`,
                action: 'APPROVAL_REJECTED',
                actor: `${role}@example.com`,
                result: 'FAILURE',
                timestamp: now,
                metadata: { role },
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

    showToast(`❌ Ticket ${ticketId} rejected by ${role}.`);
  };

  // -------------------------------------------------------------
  // Actions: Simulate New Ticket (Admin Only)
  // -------------------------------------------------------------
  const handleSimulateNew = (newTicket: WorkflowTicket) => {
    setTickets((prev) => [newTicket, ...prev]);
    showToast(`🚀 New Zendesk event received for ${newTicket.ticketId}!`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-xs sm:text-sm animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar onOpenSimulate={() => setIsSimulateOpen(true)} />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Banner with Role-Based Access Guidance */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-indigo-50 via-slate-50 to-emerald-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <span>Enterprise Reactive Dashboard</span>
              <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
                WebSocket Live Sync & RBAC Active
              </span>
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Active Role: <span className="font-bold text-slate-900 uppercase font-mono">{role}</span>.
              {role === 'admin' && ' You have full privileges (Approve, Reject, Simulate Webhook, and View Box Folders).'}
              {role === 'approver' && ' You have sign-off privileges (Approve & Reject). Simulation is restricted to Admin.'}
              {role === 'viewer' && ' Read-Only audit access. Action buttons are disabled and confidential Box links are masked.'}
            </p>
          </div>
          {role === 'viewer' && (
            <div className="flex items-center space-x-1 text-xs text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 shrink-0">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Read-Only Role Enforced</span>
            </div>
          )}
        </div>

        {/* 1. Real-time KPI Metric Cards */}
        <KpiCards tickets={tickets} />

        {/* 2. Interactive Paginated Workflow Data Table */}
        <WorkflowTable
          tickets={tickets}
          onSelectTicket={setSelectedTicket}
          onApproveTicket={handleApproveTicket}
          onRejectTicket={handleRejectTicket}
        />
      </main>

      {/* Ticket Inspection Modal with Complete Audit Timeline */}
      <WorkflowDetailModal
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onApprove={handleApproveTicket}
        onReject={handleRejectTicket}
      />

      {/* Inbound Webhook Event Simulator Modal */}
      <SimulateWebhookModal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        onSimulate={handleSimulateNew}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        Zendesk–Darwinbox–Box Support Workflow Automation Engine • Real-time WebSocket Synced
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <RbacProvider>
      <SocketProvider>
        <DashboardView />
      </SocketProvider>
    </RbacProvider>
  );
}
