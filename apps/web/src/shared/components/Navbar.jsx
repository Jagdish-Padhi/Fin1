import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { BrandLogo } from './BrandLogo.jsx';
import { Search, LayoutDashboard, LogOut, ChevronDown } from 'lucide-react';

const ROLE_DOT = {
  ADMINISTRATOR: 'bg-slate-700',
  ISSUER: 'bg-sky-600',
  VERIFIER: 'bg-emerald-600',
  VALUER: 'bg-teal-600',
  COMPLIANCE: 'bg-amber-600',
  INVESTOR: 'bg-indigo-600',
  AUDITOR: 'bg-slate-500',
};

const formatRole = (role) =>
  role ? role.charAt(0) + role.slice(1).toLowerCase() : '';

const initials = (name) =>
  name?.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() || 'U';

export function Navbar({ onOpenPublicVerify, onNavigateLanding, onNavigateConsole, isLandingView = false }) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayName = user?.name?.split('(')[0]?.trim() || 'Consortium user';
  const roleDot = ROLE_DOT[user?.role] || 'bg-slate-400';

  return (
    <header className="h-14 border-b border-trust-border bg-white px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
      <BrandLogo size="compact" showSubtitle={false} onClick={isLandingView ? onNavigateLanding : undefined} />

      <div className="flex items-center gap-2">
        {isLandingView && (
          <button onClick={onNavigateConsole} className="trust-btn-primary">
            <LayoutDashboard className="w-4 h-4" />
            <span>Open console</span>
          </button>
        )}

        <button onClick={onOpenPublicVerify} className="trust-btn-secondary">
          <Search className="w-4 h-4 text-trust-text-muted" />
          <span className="hidden sm:inline">Public verify</span>
        </button>

        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={showUserMenu}
              className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-md border border-trust-border bg-white hover:bg-slate-50"
            >
              <span className="w-7 h-7 rounded-full bg-trust-primary text-white text-xs font-medium flex items-center justify-center">
                {initials(user.name)}
              </span>
              <span className="text-left hidden md:block leading-tight">
                <span className="block text-sm font-medium text-trust-text truncate max-w-[140px]">
                  {displayName}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-trust-text-muted">
                  <span className={`w-1.5 h-1.5 rounded-full ${roleDot}`} />
                  {formatRole(user.role)}
                </span>
              </span>
              <ChevronDown
                className={`w-4 h-4 text-trust-text-subtle transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
              />
            </button>

            {showUserMenu && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-72 bg-white border border-trust-border rounded-lg shadow-popover z-50 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-trust-border-subtle">
                  <div className="text-sm font-medium text-trust-text">{displayName}</div>
                  <div className="text-xs text-trust-text-muted truncate">{user.email}</div>
                </div>

                <dl className="px-4 py-3 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-trust-text-muted">Role</dt>
                    <dd className="font-medium text-trust-text">{formatRole(user.role)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-trust-text-muted">MSP</dt>
                    <dd className="font-mono text-trust-text">{user.mspId}</dd>
                  </div>
                  {user.participantId && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-trust-text-muted">Participant ID</dt>
                      <dd className="font-mono text-trust-text truncate">{user.participantId}</dd>
                    </div>
                  )}
                </dl>

                <div className="border-t border-trust-border-subtle p-1.5">
                  <button
                    role="menuitem"
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                      onNavigateLanding?.();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-trust-error hover:bg-trust-error-bg"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
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
