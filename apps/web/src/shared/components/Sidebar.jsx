import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  LayoutDashboard,
  Layers,
  FileCheck,
  TrendingUp,
  ArrowRightLeft,
  Activity,
  History,
  Building,
  Users,
  UserCheck,
  PanelLeftClose,
  PanelLeftOpen,
  HandCoins,
  Inbox,
} from 'lucide-react';
import { canAccessTab } from '../utils/permissions.js';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hideFor: ['VALUER'] }],
  },
  {
    label: 'Administration',
    items: [
      { id: 'participants', label: 'Participants', icon: Users, requiredRole: 'ADMINISTRATOR' },
      { id: 'identity-admin', label: 'Governance', icon: UserCheck, requiredRole: 'ADMINISTRATOR' },
      { id: 'asset-types', label: 'Asset types', icon: Building, requiredRole: 'ADMINISTRATOR' },
    ],
  },
  {
    label: 'Asset lifecycle',
    items: [
      { id: 'assets', label: 'Assets', icon: Layers },
      { id: 'verification', label: 'Verification', icon: FileCheck },
      { id: 'valuation', label: 'Valuation', icon: TrendingUp },
      { id: 'invest', label: 'My investments', icon: HandCoins },
      { id: 'investment-offers', label: 'Investment offers', icon: Inbox },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { id: 'transfers', label: 'Transfers', icon: ArrowRightLeft },
      { id: 'lifecycle', label: 'Lifecycle', icon: Activity },
      { id: 'audit', label: 'Audit trail', icon: History },
    ],
  },
];

export function Sidebar({ currentTab, onSelectTab }) {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const userRole = user?.role || 'ADMINISTRATOR';

  const isVisible = (item) => {
    if (item.hideFor?.includes(userRole)) return false;
    if (item.id === 'dashboard') return true;
    if (item.requiredRole && item.requiredRole !== userRole) return false;
    return canAccessTab(userRole, item.id);
  };

  const sections = NAV_SECTIONS
    .map((s) => ({ ...s, items: s.items.filter(isVisible) }))
    .filter((s) => s.items.length > 0);

  return (
    <aside
      className={`border-r border-trust-border bg-white flex flex-col justify-between select-none shrink-0 transition-[width] duration-200 sticky top-14 self-start h-[calc(100vh-3.5rem)] ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      <nav aria-label="Primary" className="p-3 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label} className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 pb-1 text-xs font-medium text-trust-text-subtle">{section.label}</div>
            )}
            {isCollapsed && <div className="mx-3 border-t border-trust-border-subtle first:hidden" />}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative w-full flex items-center rounded-md text-sm transition-colors ${
                    isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'
                  } ${
                    isActive
                      ? 'bg-slate-100 text-trust-primary font-medium'
                      : 'text-trust-text-muted hover:text-trust-text hover:bg-slate-50'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-trust-primary" />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-trust-primary' : ''}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-trust-border-subtle">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`w-full flex items-center rounded-md py-2 text-sm text-trust-text-muted hover:text-trust-text hover:bg-slate-50 ${
            isCollapsed ? 'justify-center' : 'gap-3 px-3'
          }`}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          {!isCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
