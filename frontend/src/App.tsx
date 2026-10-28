import { useState, useEffect } from 'react';
import { RbacProvider, useRbac } from './context/RbacContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { Navbar } from './components/layout/Navbar';
import { HeroSection } from './components/landing/HeroSection';
import { FeaturesGrid } from './components/landing/FeaturesGrid';
import { WorkflowPreviewSection } from './components/landing/WorkflowPreviewSection';
import { TrustBadges } from './components/landing/TrustBadges';
import { PricingSection } from './components/landing/PricingSection';
import { Footer } from './components/landing/Footer';
import { WorkspaceSection } from './components/dashboard/WorkspaceSection';
import { WorkflowDetailModal } from './components/dashboard/WorkflowDetailModal';
import { SimulateWebhookModal } from './components/dashboard/SimulateWebhookModal';
import { FooterDocPage, FooterDocTopic } from './components/pages/FooterDocPage';
import { INITIAL_TICKETS } from './data/mockData';
import { WorkflowTicket } from './types/workflow';
import { CheckCircle2 } from 'lucide-react';

function MainApp() {
  const [activeView, setActiveView] = useState<'landing' | 'workspace' | 'docs'>('landing');
  const [activeDocTopic, setActiveDocTopic] = useState<FooterDocTopic>('zendesk-hmac');
  const [tickets, setTickets] = useState<WorkflowTicket[]>(INITIAL_TICKETS);
  const [selectedTicket, setSelectedTicket] = useState<WorkflowTicket | null>(null);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { role, hasPermission } = useRbac();
  const { socket } = useSocket();

  const handleOpenDocTopic = (topic: FooterDocTopic) => {
    setActiveDocTopic(topic);
    setActiveView('docs');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // -------------------------------------------------------------
  // Real-Time WebSocket Synchronization (Socket.io)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    socket.on('ticket:created', (data: any) => {
      console.log('⚡ Received WebSocket ticket:created event', data);
      setTickets((prev) => {
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
  // Workflow Action Handlers
  // -------------------------------------------------------------
  const handleApproveTicket = (ticketId: string) => {
    if (!hasPermission('canApprove')) {
      alert('Unauthorized: Your active role does not have approval permissions.');
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

  const handleRejectTicket = (ticketId: string) => {
    if (!hasPermission('canReject')) {
      alert('Unauthorized: Your active role does not have rejection permissions.');
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

  const handleSimulateNew = (newTicket: WorkflowTicket) => {
    setTickets((prev) => [newTicket, ...prev]);
    showToast(`🚀 New Zendesk event received for ${newTicket.ticketId}!`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Real-time Toast Notifications */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2.5 text-xs sm:text-sm border border-slate-700 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Enterprise Navigation Bar */}
      <Navbar
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenSimulate={() => setIsSimulateOpen(true)}
      />

      {/* Main View Router: Landing Page vs. Deep Analysis Workspace vs. Docs */}
      <main className="flex-1 w-full">
        {activeView === 'landing' && (
          <>
            {/* 1. Hero Section */}
            <HeroSection
              onOpenWorkspace={() => setActiveView('workspace')}
              onExploreFeatures={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            {/* 2. Core Capabilities Grid */}
            <FeaturesGrid />

            {/* 3. Interactive Execution Pipeline Preview */}
            <WorkflowPreviewSection />

            {/* 4. Trust Badges & Enterprise Testimonials */}
            <TrustBadges />

            {/* 5. Enterprise Pricing Section */}
            <PricingSection onOpenWorkspace={() => setActiveView('workspace')} />
          </>
        )}

        {activeView === 'workspace' && (
          <WorkspaceSection
            tickets={tickets}
            onSelectTicket={setSelectedTicket}
            onApproveTicket={handleApproveTicket}
            onRejectTicket={handleRejectTicket}
            onOpenSimulate={() => setIsSimulateOpen(true)}
          />
        )}

        {activeView === 'docs' && (
          <FooterDocPage
            initialTopic={activeDocTopic}
            onBackToLanding={() => setActiveView('landing')}
            onOpenWorkspace={() => setActiveView('workspace')}
          />
        )}
      </main>

      {/* Multi-Tab Detailed Inspection Modal */}
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

      {/* Comprehensive Enterprise Footer */}
      <Footer
        onOpenWorkspace={() => setActiveView('workspace')}
        onOpenDocTopic={handleOpenDocTopic}
      />
    </div>
  );
}

export default function App() {
  return (
    <RbacProvider>
      <SocketProvider>
        <MainApp />
      </SocketProvider>
    </RbacProvider>
  );
}
