import { FooterDocTopic } from '../pages/FooterDocPage';

interface FooterProps {
  onOpenWorkspace: () => void;
  onOpenDocTopic?: (topic: FooterDocTopic) => void;
}

export function Footer({ onOpenWorkspace, onOpenDocTopic }: FooterProps) {
  const handleDocClick = (topic: FooterDocTopic) => {
    if (onOpenDocTopic) {
      onOpenDocTopic(topic);
    } else {
      onOpenWorkspace();
    }
  };

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand Info */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2.5 text-white font-bold text-base mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs shadow-md shadow-indigo-600/30">
                ZD
              </div>
              <span>Zendesk–Darwinbox–Box Automation</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              Enterprise employee support orchestrator integrating service desk events, HRMS verification, and cloud document provisioning with zero human latency.
            </p>
            <div className="mt-4 flex items-center space-x-2 text-emerald-400 text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational (99.99% SLA)</span>
            </div>
          </div>

          {/* Links Column 1: Platform */}
          <div>
            <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Platform</h5>
            <ul className="space-y-2.5">
              <li>
                <button onClick={onOpenWorkspace} className="hover:text-white transition-colors text-left">
                  Interactive Workspace
                </button>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Core Capabilities
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-white transition-colors">
                  Execution Pipeline
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  Enterprise Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Links Column 2: Architecture & Engineering Docs */}
          <div>
            <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Architecture & Docs</h5>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={() => handleDocClick('zendesk-hmac')}
                  className="hover:text-indigo-400 text-slate-400 cursor-pointer transition-colors text-left"
                >
                  Zendesk HMAC Webhooks
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleDocClick('darwinbox-oauth')}
                  className="hover:text-indigo-400 text-slate-400 cursor-pointer transition-colors text-left"
                >
                  Darwinbox OAuth2 Token Cache
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleDocClick('box-conflict')}
                  className="hover:text-indigo-400 text-slate-400 cursor-pointer transition-colors text-left"
                >
                  Box Conflict Prevention
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleDocClick('firestore-leases')}
                  className="hover:text-indigo-400 text-slate-400 cursor-pointer transition-colors text-left"
                >
                  Firestore Lease Locking
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter Column */}
          <div>
            <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Stay Informed</h5>
            <p className="text-[11px] text-slate-400 mb-3">
              Receive updates on enterprise compliance, SOC2 automation, and security audits.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); alert('Subscribed for compliance and release notes!'); }} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Enter work email..."
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs transition-colors shadow-md shadow-indigo-600/20"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar: Legal & Compliance */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© 2026 Zendesk–Darwinbox–Box Support Workflow Automation Engine. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <button
              onClick={() => handleDocClick('privacy-policy')}
              className="hover:text-indigo-400 cursor-pointer transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => handleDocClick('terms-of-service')}
              className="hover:text-indigo-400 cursor-pointer transition-colors"
            >
              Terms of Service
            </button>
            <button
              onClick={() => handleDocClick('gdpr-commitment')}
              className="hover:text-indigo-400 cursor-pointer transition-colors"
            >
              GDPR Commitment
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
