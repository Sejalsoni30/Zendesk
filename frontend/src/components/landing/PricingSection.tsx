import { Check, Sparkles } from 'lucide-react';

interface PricingSectionProps {
  onOpenWorkspace: () => void;
}

export function PricingSection({ onOpenWorkspace }: PricingSectionProps) {
  const tiers = [
    {
      name: 'Team',
      price: '$499',
      period: '/month',
      description: 'Ideal for growing companies automating core IT provisioning workflows.',
      features: [
        'Up to 2,500 tickets per month',
        'Zendesk & Box integration',
        'HMAC-SHA256 signature security',
        'Standard audit logs (30-day retention)',
        'Email & community support',
      ],
      cta: 'Start 14-Day Trial',
      popular: false,
    },
    {
      name: 'Enterprise Grid',
      price: '$1,499',
      period: '/month',
      description: 'Complete three-platform orchestration for compliance-bound organizations.',
      features: [
        'Unlimited webhook ingestion volume',
        'Zendesk + Darwinbox + Box full orchestration',
        'Sub-50ms Real-Time WebSocket streaming',
        'Context-based RBAC permission matrix',
        'Human-in-the-loop approval workflows',
        'Immutable, append-only compliance audit trail',
        '99.99% Uptime SLA with 24/7 dedicated support',
      ],
      cta: 'Launch Live Workspace',
      popular: true,
    },
    {
      name: 'Custom Tenant',
      price: 'Custom',
      period: '',
      description: 'Dedicated isolated deployment for strict data residency and custom HRMS.',
      features: [
        'Dedicated isolated VPC or on-prem deployment',
        'Custom HRMS connectors (Workday, BambooHR)',
        'Custom Box retention & DLP governance',
        'Tailored SSO & custom SAML/OAuth claims',
        'Dedicated Solution Architect & onboarding',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">Transparent Plans</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Predictable Pricing for Enterprise Workflows
          </h3>
          <p className="mt-4 text-base text-slate-600">
            Every plan includes zero-trust webhook authentication, state machine validation, and duplicate prevention.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl p-8 flex flex-col justify-between transition-all ${
                tier.popular
                  ? 'bg-slate-900 text-white shadow-2xl ring-2 ring-indigo-500 scale-105 relative'
                  : 'bg-white text-slate-900 border border-slate-200 shadow-sm hover:shadow-md'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-bold uppercase tracking-wider flex items-center space-x-1 shadow-sm">
                  <Sparkles className="w-3 h-3" />
                  <span>Most Popular</span>
                </div>
              )}

              <div>
                <h4 className="text-xl font-bold">{tier.name}</h4>
                <p className={`text-xs mt-1 leading-relaxed ${tier.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                  {tier.description}
                </p>

                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-extrabold tracking-tight">{tier.price}</span>
                  <span className={`text-xs font-medium ml-1.5 ${tier.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                    {tier.period}
                  </span>
                </div>

                <div className="mt-8 space-y-3">
                  {tier.features.map((feature) => (
                    <div key={feature} className="flex items-start space-x-2.5 text-xs">
                      <Check
                        className={`w-4 h-4 shrink-0 mt-0.5 ${tier.popular ? 'text-indigo-400' : 'text-indigo-600'}`}
                      />
                      <span className={tier.popular ? 'text-slate-300' : 'text-slate-700'}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-700/50">
                <button
                  onClick={onOpenWorkspace}
                  className={`w-full py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                    tier.popular
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
