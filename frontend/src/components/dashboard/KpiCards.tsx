import { CheckCircle2, AlertCircle, Clock, Layers } from 'lucide-react';
import { WorkflowTicket } from '../../types/workflow';

interface KpiCardsProps {
  tickets: WorkflowTicket[];
}

export function KpiCards({ tickets }: KpiCardsProps) {
  const total = tickets.length;
  const completed = tickets.filter((t) => t.status === 'completed').length;
  const needsApproval = tickets.filter((t) => t.status === 'needs_approval').length;
  const failed = tickets.filter((t) => t.status === 'failed').length;

  const cards = [
    {
      label: 'Total Tickets Received',
      value: total,
      subtext: 'Zendesk Webhook Ingestions',
      icon: Layers,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
    },
    {
      label: 'Completed Workflows',
      value: completed,
      subtext: 'Verified & Box Case Created',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
    },
    {
      label: 'Pending Approvals',
      value: needsApproval,
      subtext: 'Awaiting HR Sign-Off',
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
    },
    {
      label: 'Exceptions / Failed',
      value: failed,
      subtext: 'Terminated / Not Found',
      icon: AlertCircle,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`bg-white rounded-xl border ${card.borderColor} p-5 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{card.value}</h3>
              <p className="text-xs text-slate-500 mt-1">{card.subtext}</p>
            </div>
            <div className={`p-3 rounded-lg ${card.bgColor}`}>
              <Icon className={`w-5 h-5 ${card.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

