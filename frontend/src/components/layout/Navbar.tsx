import { Shield, Sparkles, Wifi, WifiOff, LayoutDashboard, Home, BookOpen } from 'lucide-react';
import { useRbac, PermissionGuard } from '../../context/RbacContext';
import { useSocket } from '../../context/SocketContext';
import { UserRole } from '../../types/workflow';

interface NavbarProps {
  activeView: 'landing' | 'workspace' | 'docs';
  onViewChange: (view: 'landing' | 'workspace' | 'docs') => void;
  onOpenSimulate: () => void;
}

export function Navbar({ activeView, onViewChange, onOpenSimulate }: NavbarProps) {
  const { role, setRole } = useRbac();
  const { isConnected } = useSocket();

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Logo & Title */}
        <div
          onClick={() => onViewChange('landing')}
          className="flex items-center space-x-2.5 cursor-pointer select-none shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-600/30">
            ZD
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white flex items-center space-x-1.5 whitespace-nowrap">
              <span>Zendesk Automation</span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Enterprise
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden xl:block whitespace-nowrap">
              Darwinbox & Box Cloud Orchestrator
            </p>
          </div>
        </div>

        {/* Center: In-page Section Anchor Links (Shown on wide screens when on landing page) */}
        {activeView === 'landing' && (
          <nav className="hidden 2xl:flex items-center space-x-5 text-xs font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">
              Capabilities
            </a>
            <a href="#workflow" className="hover:text-white transition-colors">
              Pipeline
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
          </nav>
        )}

        {/* Right Actions: Segmented View Switcher, Live Sync, RBAC Role, Simulate */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
          {/* Segmented View Switcher (Overview | Workspace | Docs) */}
          <div className="flex bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 text-xs font-medium shrink-0">
            <button
              onClick={() => onViewChange('landing')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeView === 'landing'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
              title="Overview & Landing Page"
            >
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">Overview</span>
            </button>
            <button
              onClick={() => onViewChange('workspace')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeView === 'workspace'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
              title="Deep Analysis Live Workspace"
            >
              <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">Workspace</span>
            </button>
            <button
              onClick={() => onViewChange('docs')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeView === 'docs'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
              title="Architecture Docs & Legal Specs"
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">Docs</span>
            </button>
          </div>

          {/* WebSocket Connectivity Status Badge */}
          <div
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg text-xs font-medium border shrink-0 transition-colors ${
              isConnected
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                : 'bg-amber-950/60 text-amber-300 border-amber-800'
            }`}
            title={isConnected ? 'Connected to live WebSocket server' : 'Reconnecting to WebSocket...'}
          >
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden lg:inline font-mono text-[11px] whitespace-nowrap">Live Sync</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                <span className="hidden lg:inline font-mono text-[11px] whitespace-nowrap">Connecting</span>
              </>
            )}
          </div>

          {/* RBAC Role Selector Dropdown */}
          <div className="flex items-center space-x-1 bg-slate-800/90 py-1 px-1.5 rounded-xl border border-slate-700/80 text-xs shrink-0">
            <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="bg-slate-900 text-slate-200 text-xs font-semibold py-0.5 px-1 rounded-md border border-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="admin">Admin</option>
              <option value="approver">Approver</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          {/* Simulate Action Button (Gated to Admin only via PermissionGuard) */}
          <PermissionGuard
            permission="canSimulate"
            fallback={null}
          >
            <button
              onClick={onOpenSimulate}
              className="flex items-center space-x-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/30 active:scale-95 shrink-0 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Simulate</span>
            </button>
          </PermissionGuard>
        </div>
      </div>
    </header>
  );
}
