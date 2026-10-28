import { ArrowRight, Sparkles, Shield, CheckCircle2, Play, Layers } from 'lucide-react';

interface HeroSectionProps {
  onOpenWorkspace: () => void;
  onExploreFeatures: () => void;
}

export function HeroSection({ onOpenWorkspace, onExploreFeatures }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[250px] bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          {/* Top Pill */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-6 backdrop-blur-sm shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Next-Gen Enterprise Workflow Orchestration</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight sm:leading-none">
            Orchestrate Employee Support With{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              Zero Human Latency
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Unify <span className="text-white font-semibold">Zendesk</span> ticket ingestion,{' '}
            <span className="text-white font-semibold">Darwinbox</span> HR verification, and{' '}
            <span className="text-white font-semibold">Box Content Cloud</span> provisioning into a deterministic, privacy-first automation engine.
          </p>

          {/* Dual Call-to-Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onOpenWorkspace}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <span>Explore Live Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onExploreFeatures}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-semibold text-sm transition-all hover:text-white"
            >
              <Play className="w-4 h-4 text-indigo-400" />
              <span>How It Works</span>
            </button>
          </div>

          {/* Key Value Highlights */}
          <div className="mt-10 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-slate-400">
            <div className="flex items-center justify-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Sub-500ms Average Execution</span>
            </div>
            <div className="flex items-center justify-center space-x-1.5">
              <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>SOC2 & GDPR Compliant</span>
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-center justify-center space-x-1.5">
              <Layers className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Zero Duplicate Folders</span>
            </div>
          </div>
        </div>

        {/* Product Preview Mockup Card */}
        <div className="mt-14 max-w-5xl mx-auto rounded-2xl p-2 bg-gradient-to-b from-indigo-500/20 to-slate-800/40 border border-slate-700/60 shadow-2xl backdrop-blur-md">
          <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-inner">
            {/* Window title bar */}
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span className="text-xs text-slate-400 font-mono ml-2">automation-pipeline.internal</span>
              </div>
              <div className="text-[11px] font-mono text-emerald-400 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>STATE_MACHINE_IDLE</span>
              </div>
            </div>

            {/* Visual Workflow Steps Demonstration */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-sans">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                <div className="flex items-center space-x-2 text-indigo-400 font-bold mb-1">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px]">1</span>
                  <span>Zendesk Ingestion</span>
                </div>
                <p className="text-slate-400 text-[11px] mt-1">HMAC-SHA256 verified raw body with deterministic idempotency.</p>
                <div className="mt-3 px-2 py-1 bg-slate-900 rounded text-[10px] font-mono text-emerald-400">202 Accepted</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                <div className="flex items-center space-x-2 text-purple-400 font-bold mb-1">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px]">2</span>
                  <span>Darwinbox Check</span>
                </div>
                <p className="text-slate-400 text-[11px] mt-1">OAuth2 token cached. Active status & manager hierarchy verified.</p>
                <div className="mt-3 px-2 py-1 bg-slate-900 rounded text-[10px] font-mono text-indigo-300">ACTIVE: EMP-1001</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                <div className="flex items-center space-x-2 text-blue-400 font-bold mb-1">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]">3</span>
                  <span>Box Provisioning</span>
                </div>
                <p className="text-slate-400 text-[11px] mt-1">Creates /HR-Records/... and binds granular collaborator roles.</p>
                <div className="mt-3 px-2 py-1 bg-slate-900 rounded text-[10px] font-mono text-blue-400">CASE-ZD-1042</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold mb-1">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">4</span>
                  <span>Zendesk Update</span>
                </div>
                <p className="text-slate-400 text-[11px] mt-1">Posts secure shared link to ticket; audit log persisted.</p>
                <div className="mt-3 px-2 py-1 bg-slate-900 rounded text-[10px] font-mono text-emerald-400">STATUS: COMPLETED</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

