import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { BrandLogo } from './BrandLogo.jsx';
import {
  UserCheck,
  Search,
  LayoutDashboard,
  Compass,
  LogOut,
  ChevronDown,
  Building2,
  ShieldCheck,
} from 'lucide-react';

const ROLE_COLORS = {
  ADMINISTRATOR: { bg: 'bg-[#0F2A43]', text: 'text-white', dot: 'bg-white' },
  ISSUER: { bg: 'bg-[#1F5A7A]', text: 'text-white', dot: 'bg-[#7ECDE8]' },
  VERIFIER: { bg: 'bg-[#18794E]', text: 'text-white', dot: 'bg-[#6EE7B7]' },
  VALUER: { bg: 'bg-[#0F766E]', text: 'text-white', dot: 'bg-[#5EEAD4]' },
  COMPLIANCE: { bg: 'bg-[#A16207]', text: 'text-white', dot: 'bg-[#FDE047]' },
  INVESTOR: { bg: 'bg-[#4F46E5]', text: 'text-white', dot: 'bg-[#A5B4FC]' },
  AUDITOR: { bg: 'bg-[#374151]', text: 'text-white', dot: 'bg-[#9CA3AF]' },
};

export function Navbar({ onOpenPublicVerify, onNavigateLanding, onNavigateConsole, isLandingView = false }) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const roleColor = user?.role ? ROLE_COLORS[user.role] : ROLE_COLORS.ADMINISTRATOR;

  return (
    <header className="h-16 border-b border-[#D8E0E8] bg-white/95 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 shadow-[0_1px_3px_rgba(15,42,67,0.06)]">
      {/* Brand & Logo */}
      <BrandLogo onClick={isLandingView ? onNavigateLanding : undefined} />

      {/* Header Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Toggle between Landing and Console */}
        {isLandingView && (
          <button
            onClick={onNavigateConsole}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#0F2A43] hover:bg-[#1F5A7A] text-white text-xs font-semibold transition shadow-xs"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Launch Console</span>
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

        {/* Authenticated User Identity — NO role switching, proper logout */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 border border-[#D8E0E8] rounded-xl hover:bg-[#F8FAFC] transition"
            >
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${roleColor.bg}`}>
                <span className={`text-[9px] font-extrabold ${roleColor.text}`}>
                  {user.name?.split(' ').slice(0, 2).map((n) => n[0]).join('') || 'U'}
                </span>
              </div>

              {/* Identity Info */}
              <div className="text-left hidden md:block">
                <div className="text-[11px] font-bold text-[#0F2A43] leading-tight truncate max-w-[130px]">
                  {user.name?.split('(')[0]?.trim() || 'Consortium User'}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${roleColor.dot || 'bg-gray-400'}`} />
                  <span className="text-[9px] font-bold text-[#5A6A7E] uppercase tracking-wider">{user.role}</span>
                </div>
              </div>

              <ChevronDown className={`w-3.5 h-3.5 text-[#5A6A7E] transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Panel */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-[#D8E0E8] rounded-xl shadow-2xl z-50 overflow-hidden">
                {/* User Header */}
                <div className={`p-4 ${roleColor.bg}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                      {user.name?.split(' ').slice(0, 2).map((n) => n[0]).join('') || 'U'}
                    </div>
                    <div>
                      <div className={`text-sm font-bold ${roleColor.text}`}>
                        {user.name?.split('(')[0]?.trim()}
                      </div>
                      <div className={`text-[10px] ${roleColor.text} opacity-80`}>{user.email}</div>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="p-3 space-y-2 text-xs">
                  <div className="flex items-center gap-2 p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E8EEF3]">
                    <ShieldCheck className="w-4 h-4 text-[#1F5A7A] shrink-0" />
                    <div>
                      <div className="text-[10px] text-[#5A6A7E] uppercase font-bold">Consortium Role</div>
                      <div className="font-bold text-[#0F2A43]">{user.role}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E8EEF3]">
                    <Building2 className="w-4 h-4 text-[#1F5A7A] shrink-0" />
                    <div>
                      <div className="text-[10px] text-[#5A6A7E] uppercase font-bold">MSP Identity</div>
                      <div className="font-mono font-semibold text-[#0F766E]">{user.mspId}</div>
                    </div>
                  </div>

                  {user.participantId && (
                    <div className="flex items-center gap-2 p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E8EEF3]">
                      <UserCheck className="w-4 h-4 text-[#1F5A7A] shrink-0" />
                      <div>
                        <div className="text-[10px] text-[#5A6A7E] uppercase font-bold">Participant ID</div>
                        <div className="font-mono font-semibold text-[#17202A]">{user.participantId}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Logout */}
                <div className="px-3 pb-3 border-t border-[#D8E0E8] pt-3">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                      onNavigateLanding?.();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B42318] border border-[#FECDD3] rounded-lg text-xs font-semibold transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out of Consortium Node
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
