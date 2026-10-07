import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  LayoutDashboard,
  Layers,
  FileCheck,
  TrendingUp,
  Coins,
  ArrowRightLeft,
  Activity,
  History,
  Building,
} from 'lucide-react';

export function Sidebar({ currentTab, onSelectTab }) {
  const { user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assets', label: 'Assets & Registration', icon: Layers },
    { id: 'verification', label: 'Verification Queue', icon: FileCheck },
    { id: 'valuation', label: 'Valuation & Pricing', icon: TrendingUp },
    { id: 'tokens', label: 'Tokens & Cap Tables', icon: Coins },
    { id: 'transfers', label: 'Transfers & Rules', icon: ArrowRightLeft },
    { id: 'lifecycle', label: 'Lifecycle & Holds', icon: Activity },
    { id: 'audit', label: 'Consortium Audit Trail', icon: History },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/30 flex flex-col justify-between p-4">
      <div className="space-y-6">
        {/* Active Role Tag */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-indigo-400" />
            Current Identity
          </div>
          <div className="text-sm font-semibold text-slate-100 truncate">{user?.name}</div>
          <div className="flex items-center gap-1.5 pt-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {user?.role}
            </span>
            <span className="text-[10px] text-slate-400 font-mono truncate">{user?.mspId}</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Network Footer */}
      <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1">
        <div className="flex items-center justify-between">
          <span>Channel:</span>
          <span className="font-mono text-slate-400">rwa-channel</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Consortium:</span>
          <span className="text-emerald-400">6 Orgs Connected</span>
        </div>
      </div>
    </aside>
  );
}
