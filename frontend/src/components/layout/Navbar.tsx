import { Shield, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { useRbac, PermissionGuard } from '../../context/RbacContext';
import { useSocket } from '../../context/SocketContext';
import { UserRole } from '../../types/workflow';

interface NavbarProps {
  onOpenSimulate: () => void;
}

export function Navbar({ onOpenSimulate }: NavbarProps) {
  const { role, setRole } = useRbac();
  const { isConnected } = useSocket();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            ZD
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              Zendesk–Darwinbox–Box{' '}
              <span className="text-indigo-600 font-semibold text-xs ml-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-full">
                Automation
              </span>
            </h1>
            <p className="text-xs text-slate-500">Enterprise HR & IT Support Orchestrator</p>
          </div>
        </div>

        {/* Right Actions: WebSocket Status, RBAC Switcher, Simulate */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Real-time WebSocket Connectivity Badge */}
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
            title={isConnected ? 'Connected to live WebSocket server' : 'Reconnecting to WebSocket...'}
          >
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline font-mono">Live Sync</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                <span className="hidden md:inline font-mono">Connecting...</span>
              </>
            )}
          </div>

          {/* Interactive Role Switcher (RBAC Context) */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <Shield className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            <span className="text-xs font-medium text-slate-600 hidden sm:inline">Role:</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="bg-white text-xs font-semibold text-slate-800 py-1 px-2 rounded-md border border-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="admin">Admin (Full Control)</option>
              <option value="approver">Approver (Sign-off Only)</option>
              <option value="viewer">Viewer (Read-Only)</option>
            </select>
          </div>

          {/* Simulate Inbound Webhook Button (Gated to Admin only via PermissionGuard) */}
          <PermissionGuard
            permission="canSimulate"
            fallback={
              <button
                disabled
                className="hidden sm:flex items-center space-x-1.5 bg-slate-100 text-slate-400 px-3 py-1.5 rounded-lg text-xs font-medium cursor-not-allowed border border-slate-200"
                title="Only Admin can simulate incoming webhooks"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                <span>Simulate Webhook (Admin Only)</span>
              </button>
            }
          >
            <button
              onClick={onOpenSimulate}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulate Webhook</span>
            </button>
          </PermissionGuard>
        </div>
      </div>
    </header>
  );
}
