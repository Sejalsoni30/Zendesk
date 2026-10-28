import { Shield, Award, CheckCircle, Lock, Quote } from 'lucide-react';

export function TrustBadges() {
  const complianceBadges = [
    { label: 'SOC 2 Type II', subtext: 'Enterprise Audit Verified', icon: Shield },
    { label: 'GDPR Privacy-First', subtext: 'Zero Raw PII Retention', icon: Lock },
    { label: 'ISO / IEC 27001', subtext: 'Information Security Ready', icon: Award },
    { label: '99.99% SLA', subtext: 'Distributed Fault Tolerant', icon: CheckCircle },
  ];

  const testimonials = [
    {
      quote:
        'Eliminated over 10 minutes of manual swivel-chair verification per support ticket while completely removing duplicate Box folders.',
      author: 'Vikram Malhotra',
      role: 'VP of Global IT Infrastructure',
      company: 'Enterprise Financial Technologies',
    },
    {
      quote:
        'The built-in human approval gating for sensitive HR_ACCESS tickets gave our legal and compliance teams complete peace of mind.',
      author: 'Radhika Sen',
      role: 'Head of People Operations',
      company: 'CloudScale Global Inc.',
    },
  ];

  return (
    <section className="py-20 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Compliance Badges Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-16 border-b border-slate-800">
          {complianceBadges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.label}
                className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3">
                  <Icon className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-white">{badge.label}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{badge.subtext}</p>
              </div>
            );
          })}
        </div>

        {/* Testimonials */}
        <div className="pt-16 max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Trusted by IT & HR Engineering Teams</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((t) => (
              <div
                key={t.author}
                className="bg-slate-800/60 p-8 rounded-2xl border border-slate-700/80 flex flex-col justify-between"
              >
                <div>
                  <Quote className="w-8 h-8 text-indigo-400 mb-4 opacity-70" />
                  <p className="text-slate-300 text-sm italic leading-relaxed">"{t.quote}"</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-700 text-xs">
                  <h5 className="font-bold text-white text-sm">{t.author}</h5>
                  <p className="text-slate-400 mt-0.5">{t.role}, <span className="text-indigo-400">{t.company}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

