import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldCheck, UserCheck, Search } from 'lucide-react';

export function Navbar({ onOpenPublicVerify }) {
  const { user, roles, switchRole } = useAuth();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            EkamVistar
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono font-normal">
              RWA Ledger
            </span>
          </h1>
          <p className="text-xs text-slate-400">Hyperledger Fabric 2.5 Asset Governance</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Public passport verify button */}
        <button
          onClick={onOpenPublicVerify}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition"
        >
          <Search className="w-3.5 h-3.5 text-indigo-400" />
          <span>Public Verify Portal</span>
        </button>

        {/* Dev Mode Role Switcher */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
          <UserCheck className="w-4 h-4 text-slate-400" />
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Switch Role</span>
            <select
              value={user?.role || 'ADMINISTRATOR'}
              onChange={(e) => switchRole(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded px-2.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
            >
              {roles.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
