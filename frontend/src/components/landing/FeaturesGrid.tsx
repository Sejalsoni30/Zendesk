import { Zap, ShieldCheck, RefreshCw, UserCheck, Lock, Activity } from 'lucide-react';

export function FeaturesGrid() {
  const features = [
    {
      icon: Zap,
      title: 'Real-Time WebSocket Sync',
      description:
        'Bi-directional Socket.io streaming pushes state machine updates to the browser in under 50ms without expensive polling.',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      icon: ShieldCheck,
      title: 'Context-Based RBAC Matrix',
      description:
        'Granular role-based access control (Admin, Approver, Viewer) enforced both on UI action buttons and backend API routes.',
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
    },
    {
      icon: RefreshCw,
      title: 'Deterministic Idempotency',
      description:
        'Guaranteed zero duplicate Box folders or duplicate ticket comments during rapid network retries or replay attacks.',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      icon: UserCheck,
      title: 'Human-in-the-Loop Gating',
      description:
        'Irreversible or high-privilege operations (like confidential HR access) pause safely in needs_approval until sign-off.',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      icon: Lock,
      title: 'Privacy-First Architecture',
      description:
        'Compliant with GDPR and least-privilege standards. Requester IDs are hashed and sensitive tokens are automatically redacted.',
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
    },
    {
      icon: Activity,
      title: 'Resilient Failure Recovery',
      description:
        'Bounded exponential backoff with randomized jitter handles third-party API 429 rate limits and 503 cloud outages.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
  ];

  return (
    <section id="features" className="py-20 bg-slate-50 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">Core Capabilities</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Engineered for Mission-Critical Reliability
          </h3>
          <p className="mt-4 text-base text-slate-600">
            A production-style automation stack designed with distributed locks, formal state machines, and real-time observability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${feature.bgColor}`}>
                  <Icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
