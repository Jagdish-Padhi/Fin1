import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldCheck, UserCheck, Search, ChevronDown } from 'lucide-react';

export function Navbar({ onOpenPublicVerify }) {
  const { user, roles, switchRole } = useAuth();

  return (
    <header className="h-16 border-b border-[#D8E0E8] bg-white/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40 shadow-[0_1px_2px_rgba(15,42,67,0.03)]">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F2A43] via-[#1F5A7A] to-[#0F766E] flex items-center justify-center shadow-md shadow-[#0F2A43]/15">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold tracking-tight font-['Outfit',sans-serif]">
              <span className="text-[#0F2A43]">Asse</span>
              <span className="text-[#0F766E]">Trust</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1] font-medium tracking-wide">
              Network Active
            </span>
          </div>
          <p className="text-[11px] text-[#5A6A7E] -mt-0.5 font-medium">
            Institutional Real-World Asset Governance
          </p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3.5">
        {/* Public passport verify button */}
        <button
          onClick={onOpenPublicVerify}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#D8E0E8] text-xs font-semibold text-[#1F5A7A] transition shadow-xs"
        >
          <Search className="w-3.5 h-3.5 text-[#0F766E]" />
          <span>Public Verify Portal</span>
        </button>

        {/* Identity & Role Switcher */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-[#D8E0E8]">
          <div className="w-7 h-7 rounded-lg bg-[#F0F4F8] border border-[#D8E0E8] flex items-center justify-center text-[#0F2A43]">
            <UserCheck className="w-4 h-4 text-[#1F5A7A]" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] text-[#5A6A7E] uppercase tracking-wider font-bold">
              Active Identity
            </span>
            <div className="relative">
              <select
                value={user?.role || 'ADMINISTRATOR'}
                onChange={(e) => switchRole(e.target.value)}
                className="bg-white border border-[#D8E0E8] text-[#0F2A43] text-xs rounded-md px-2.5 py-1 pr-6 focus:outline-none focus:border-[#1F5A7A] cursor-pointer font-semibold shadow-xs"
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
      </div>
    </header>
  );
}
