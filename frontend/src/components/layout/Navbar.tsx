import { Shield, Sparkles, Wifi, WifiOff, LayoutDashboard, Home } from 'lucide-react';
import { useRbac, PermissionGuard } from '../../context/RbacContext';
import { useSocket } from '../../context/SocketContext';
import { UserRole } from '../../types/workflow';

interface NavbarProps {
  activeView: 'landing' | 'workspace';
  onViewChange: (view: 'landing' | 'workspace') => void;
  onOpenSimulate: () => void;
}

export function Navbar({ activeView, onViewChange, onOpenSimulate }: NavbarProps) {
  const { role, setRole } = useRbac();
  const { isConnected } = useSocket();

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Logo & Navigation */}
        <div className="flex items-center space-x-6">
          <div
            onClick={() => onViewChange('landing')}
            className="flex items-center space-x-2.5 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-600/30">
              ZD
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white flex items-center space-x-1.5">
                <span>Zendesk–Darwinbox–Box</span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Automated Support Orchestrator</p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden lg:flex items-center space-x-5 text-xs font-semibold text-slate-300">
            <button
              onClick={() => onViewChange('landing')}
              className={`hover:text-white transition-colors ${activeView === 'landing' ? 'text-indigo-400' : ''}`}
            >
              Overview
            </button>
            <a href="#features" className="hover:text-white transition-colors">
              Capabilities
            </a>
            <a href="#workflow" className="hover:text-white transition-colors">
              Pipeline
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
            <button
              onClick={() => onViewChange('workspace')}
              className={`flex items-center space-x-1 hover:text-white transition-colors ${
                activeView === 'workspace' ? 'text-indigo-400' : ''
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Deep Analysis Workspace</span>
            </button>
          </nav>
        </div>

        {/* Right Actions: WebSocket Status, View Toggle, Role Switcher, Simulate */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Real-time WebSocket Connectivity Badge */}
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              isConnected
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                : 'bg-amber-950/60 text-amber-300 border-amber-800'
            }`}
            title={isConnected ? 'Connected to live WebSocket server' : 'Reconnecting to WebSocket...'}
          >
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xl:inline font-mono text-[11px]">Live Sync</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="hidden xl:inline font-mono text-[11px]">Connecting</span>
              </>
            )}
          </div>

          {/* View Toggle: Landing vs Workspace */}
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => onViewChange('landing')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                activeView === 'landing' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="View SaaS Landing Page"
            >
              <Home className="w-3 h-3" />
              <span className="hidden sm:inline">Overview</span>
            </button>
            <button
              onClick={() => onViewChange('workspace')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                activeView === 'workspace' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Open Deep Analysis Workspace"
            >
              <LayoutDashboard className="w-3 h-3" />
              <span>Workspace</span>
            </button>
          </div>

          {/* Interactive Role Switcher (RBAC Context) */}
          <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            <Shield className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="bg-slate-900 text-slate-200 text-xs font-semibold py-1 px-1.5 rounded border border-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="admin">Admin</option>
              <option value="approver">Approver</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          {/* Simulate Inbound Webhook Button (Gated to Admin only via PermissionGuard) */}
          <PermissionGuard
            permission="canSimulate"
            fallback={null}
          >
            <button
              onClick={onOpenSimulate}
              className="hidden md:flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulate</span>
            </button>
          </PermissionGuard>
        </div>
      </div>
    </header>
  );
}
