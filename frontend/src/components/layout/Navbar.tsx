import { Shield, Sparkles, Activity } from 'lucide-react';
import { UserRole } from '../../types/workflow';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenSimulate: () => void;
}

export function Navbar({ currentRole, onRoleChange, onOpenSimulate }: NavbarProps) {
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
              Zendesk–Darwinbox–Box <span className="text-indigo-600 font-semibold text-xs ml-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-full">Automation</span>
            </h1>
            <p className="text-xs text-slate-500">Enterprise HR & IT Support Orchestrator</p>
          </div>
        </div>

        {/* Right Actions: Role Selector & Simulate Webhook */}
        <div className="flex items-center space-x-4">
          {/* Mock Mode Pill */}
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-medium">
            <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Mock Engine Active</span>
          </div>

          {/* Interactive Role Switcher (RBAC) */}
          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <Shield className="w-4 h-4 text-slate-500 ml-1.5" />
            <span className="text-xs font-medium text-slate-600 hidden sm:inline">Role:</span>
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="bg-white text-xs font-semibold text-slate-800 py-1 px-2 rounded-md border border-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="admin">Admin (Full Control)</option>
              <option value="approver">Approver (Can Approve/Reject)</option>
              <option value="viewer">Viewer (Read-Only Audit)</option>
            </select>
          </div>

          {/* Simulate Inbound Webhook Button */}
          <button
            onClick={onOpenSimulate}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Ticket Event</span>
          </button>
        </div>
      </div>
    </header>
  );
}

