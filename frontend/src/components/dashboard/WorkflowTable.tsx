import { useState } from 'react';
import { Search, Folder, ExternalLink, ShieldAlert, Check, X, Eye, Lock } from 'lucide-react';
import { WorkflowTicket, WorkflowStatus } from '../../types/workflow';
import { useRbac } from '../../context/RbacContext';

interface WorkflowTableProps {
  tickets: WorkflowTicket[];
  onSelectTicket: (ticket: WorkflowTicket) => void;
  onApproveTicket: (ticketId: string) => void;
  onRejectTicket: (ticketId: string) => void;
}

export function WorkflowTable({
  tickets,
  onSelectTicket,
  onApproveTicket,
  onRejectTicket,
}: WorkflowTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'all'>('all');
  const { hasPermission } = useRbac();

  const canApprove = hasPermission('canApprove');
  const canReject = hasPermission('canReject');
  const canViewBoxUrl = hasPermission('canViewBoxUrl');

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: WorkflowStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            ● Completed
          </span>
        );
      case 'needs_approval':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
            ⏱ Needs Approval
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            ↻ Processing
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            ✕ Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            Received
          </span>
        );
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'HR_ACCESS':
        return <span className="text-xs font-semibold px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200">HR Access</span>;
      case 'EQUIPMENT':
        return <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">Equipment</span>;
      case 'SECURITY_EXCEPTION':
        return <span className="text-xs font-semibold px-2 py-0.5 bg-red-50 text-red-700 rounded border border-red-200">Security</span>;
      default:
        return <span className="text-xs font-semibold px-2 py-0.5 bg-slate-50 text-slate-700 rounded border border-slate-200">{category}</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
      {/* Search and Filters Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Ticket ID (e.g. ZD-1042) or Employee ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'needs_approval', 'completed', 'failed'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                statusFilter === filter
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter === 'all' ? 'All Tickets' : filter.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200">
              <th className="py-3 px-4">Ticket</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Employee</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Box Case Folder</th>
              <th className="py-3 px-4">Updated</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 text-sm">
                  No automation workflows match your criteria.
                </td>
              </tr>
            ) : (
              filteredTickets.map((ticket) => (
                <tr key={ticket.idempotencyKey} className="hover:bg-slate-50/80 transition-colors">
                  {/* Ticket ID & Subject */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{ticket.ticketId}</div>
                    <div className="text-xs text-slate-500 truncate max-w-xs">{ticket.subject}</div>
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-4">{getCategoryBadge(ticket.category)}</td>

                  {/* Employee */}
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800">{ticket.employeeId}</div>
                    <div className="text-xs text-slate-500">{ticket.department || 'Verified Staff'}</div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">{getStatusBadge(ticket.status)}</td>

                  {/* Box Case Folder (Role-gated via canViewBoxUrl) */}
                  <td className="py-3.5 px-4">
                    {ticket.boxFolderUrl ? (
                      canViewBoxUrl ? (
                        <a
                          href={ticket.boxFolderUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          <Folder className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                          <span>CASE-{ticket.ticketId}</span>
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title="Viewer role cannot view private enterprise folders">
                          <Lock className="w-3 h-3 mr-1 text-slate-400" />
                          <span>Protected Folder (Viewer Restricted)</span>
                        </span>
                      )
                    ) : ticket.status === 'needs_approval' ? (
                      <span className="text-xs text-amber-600 italic">Pending approval</span>
                    ) : ticket.status === 'failed' ? (
                      <span className="text-xs text-rose-500 italic">Not created</span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Provisioning...</span>
                    )}
                  </td>

                  {/* Timestamp */}
                  <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>

                  {/* Actions (Gated by canApprove / canReject) */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-2">
                      {ticket.status === 'needs_approval' && (
                        canApprove ? (
                          <>
                            <button
                              onClick={() => onApproveTicket(ticket.ticketId)}
                              className="inline-flex items-center px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md shadow-sm transition-all active:scale-95"
                              title="Approve Box Folder Creation"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              Approve
                            </button>
                            {canReject && (
                              <button
                                onClick={() => onRejectTicket(ticket.ticketId)}
                                className="inline-flex items-center px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium rounded-md border border-rose-200 transition-all active:scale-95"
                                title="Reject Workflow"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic flex items-center bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            <ShieldAlert className="w-3 h-3 mr-1 text-slate-400" />
                            Read-Only Role
                          </span>
                        )
                      )}

                      <button
                        onClick={() => onSelectTicket(ticket)}
                        className="inline-flex items-center px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
