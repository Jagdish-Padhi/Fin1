import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { BrandLogo } from './BrandLogo.jsx';
import { UserCheck, Search, LayoutDashboard, Compass } from 'lucide-react';

export function Navbar({ onOpenPublicVerify, onNavigateLanding, onNavigateConsole, isLandingView = false }) {
  const { user, roles, switchRole } = useAuth();

  return (
    <header className="h-16 border-b border-[#D8E0E8] bg-white/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40 shadow-[0_1px_2px_rgba(15,42,67,0.03)]">
      {/* Brand & Logo */}
      <BrandLogo onClick={onNavigateLanding} />

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {/* Toggle between Landing and Console */}
        {isLandingView ? (
          <button
            onClick={onNavigateConsole}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#0F2A43] hover:bg-[#1F5A7A] text-white text-xs font-semibold transition shadow-xs"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Launch Console</span>
          </button>
        ) : (
          <button
            onClick={onNavigateLanding}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#5A6A7E] hover:text-[#0F2A43] hover:bg-[#F8FAFC] border border-[#D8E0E8] transition"
          >
            <Compass className="w-3.5 h-3.5 text-[#1F5A7A]" />
            <span>Overview</span>
          </button>
        )}

        {/* Public passport verify button */}
        <button
          onClick={onOpenPublicVerify}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#D8E0E8] text-xs font-semibold text-[#1F5A7A] transition shadow-xs"
        >
          <Search className="w-3.5 h-3.5 text-[#0F766E]" />
          <span className="hidden sm:inline">Public Verify</span>
        </button>

        {/* Identity & Role Switcher (shown on Console or available for testing) */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-[#D8E0E8]">
          <div className="w-7 h-7 rounded-lg bg-[#F0F4F8] border border-[#D8E0E8] flex items-center justify-center text-[#0F2A43]">
            <UserCheck className="w-4 h-4 text-[#1F5A7A]" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] text-[#5A6A7E] uppercase tracking-wider font-bold">
              Identity
            </span>
            <select
              value={user?.role || 'ADMINISTRATOR'}
              onChange={(e) => switchRole(e.target.value)}
              className="bg-white border border-[#D8E0E8] text-[#0F2A43] text-xs rounded-md px-2 py-0.5 focus:outline-none focus:border-[#1F5A7A] cursor-pointer font-semibold shadow-xs"
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
