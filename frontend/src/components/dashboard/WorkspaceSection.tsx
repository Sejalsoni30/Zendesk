import { WorkflowTicket } from '../../types/workflow';
import { useRbac } from '../../context/RbacContext';
import { KpiCards } from './KpiCards';
import { WorkflowTable } from './WorkflowTable';
import { ShieldAlert, Sparkles } from 'lucide-react';

interface WorkspaceSectionProps {
  tickets: WorkflowTicket[];
  onSelectTicket: (ticket: WorkflowTicket) => void;
  onApproveTicket: (ticketId: string) => void;
  onRejectTicket: (ticketId: string) => void;
  onOpenSimulate: () => void;
}

export function WorkspaceSection({
  tickets,
  onSelectTicket,
  onApproveTicket,
  onRejectTicket,
  onOpenSimulate,
}: WorkspaceSectionProps) {
  const { role, hasPermission } = useRbac();
  const canSimulate = hasPermission('canSimulate');

  return (
    <section id="workspace" className="py-10 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Workspace Header / Breadcrumbs */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Deep Analysis & Live Workspace
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Telemetry</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Real-time synchronization across Zendesk webhooks, Darwinbox HRMS records, and Box cloud storage.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-3">
            {canSimulate && (
              <button
                onClick={onOpenSimulate}
                className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate Webhook Event</span>
              </button>
            )}
          </div>
        </div>

        {/* Role & Permissions Security Banner */}
        <div className="mb-8 p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold shrink-0">
              {role.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-slate-800">
                Active Authorization Profile:{' '}
                <span className="text-indigo-600 uppercase font-mono">{role}</span>
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                {role === 'admin' && 'Full administrative governance: Approve, Reject, Simulate incoming webhooks, and view secure links.'}
                {role === 'approver' && 'Human-in-the-loop sign-off privileges: Approve or Reject sensitive HR_ACCESS tickets.'}
                {role === 'viewer' && 'Audit observer mode: Read-only access to audit logs. Direct actions and private links are restricted.'}
              </p>
            </div>
          </div>

          {role === 'viewer' && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-semibold self-start sm:self-auto shrink-0">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Read-Only Guard Active</span>
            </div>
          )}
        </div>

        {/* 1. Real-Time Aggregated KPI Cards */}
        <KpiCards tickets={tickets} />

        {/* 2. Searchable, Filterable Data Table */}
        <WorkflowTable
          tickets={tickets}
          onSelectTicket={onSelectTicket}
          onApproveTicket={onApproveTicket}
          onRejectTicket={onRejectTicket}
        />
      </div>
    </section>
  );
}
