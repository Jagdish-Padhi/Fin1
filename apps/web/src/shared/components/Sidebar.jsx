import React, { useState } from 'react';
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
  Users,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { tabAccess } from '../utils/permissions.js';

export function Sidebar({ currentTab, onSelectTab }) {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const userRole = user?.role || null;

  const allNavItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
<<<<<<< HEAD
    { id: 'participants', label: 'Participant Directory', icon: Users },
    { id: 'identity-admin', label: 'Consortium Governance', icon: UserCheck },
    { id: 'asset-types', label: 'Asset Type Engine', icon: Building },
=======
    { id: 'participants', label: 'Participant Directory', icon: Users, requiredRole: 'ADMINISTRATOR' },
    { id: 'identity-admin', label: 'Consortium Governance', icon: UserCheck, requiredRole: 'ADMINISTRATOR' },
>>>>>>> 3acd21411c5b9f7d11e403d7eb4aa0a33256278c
    { id: 'assets', label: 'Real-World Assets', icon: Layers },
    { id: 'verification', label: 'Verification Audits', icon: FileCheck },
    { id: 'valuation', label: 'Valuation & Pricing', icon: TrendingUp },
    { id: 'tokens', label: 'Tokenized Securities', icon: Coins },
    { id: 'transfers', label: 'Settlement & Transfer Rules', icon: ArrowRightLeft },
    { id: 'lifecycle', label: 'Lifecycle Governance', icon: Activity },
    { id: 'audit', label: 'Consortium Audit Trail', icon: History },
  ];

<<<<<<< HEAD
  // Filter strictly based on user's authorized tabs under segregation of duties
  const filteredNavItems = userRole
    ? allNavItems.filter((item) => tabAccess(userRole, item.id) !== null)
    : [];
=======
  // Filter based on user's authorized tabs under segregation of duties
  const filteredNavItems = allNavItems.filter((item) => {
    if (item.id === 'dashboard') return true;
    if (item.requiredRole && item.requiredRole !== userRole) return false;
    return canAccessTab(userRole, item.id);
  });
>>>>>>> 3acd21411c5b9f7d11e403d7eb4aa0a33256278c

  return (
    <aside
      className={`border-r border-[#D8E0E8] bg-white flex flex-col justify-between transition-all duration-300 ease-in-out select-none shadow-[1px_0_3px_rgba(15,42,67,0.02)] shrink-0 ${
        isCollapsed ? 'w-[72px] p-2.5' : 'w-64 p-4'
      }`}
    >
      <div className="space-y-4">
        {/* Navigation Section Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          {!isCollapsed ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A99AD]">
              Management Modules
            </span>
          ) : (
            <span className="mx-auto w-1.5 h-1.5 rounded-full bg-[#1F5A7A]/40" />
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md text-[#8A99AD] hover:text-[#0F2A43] hover:bg-[#F1F5F9] transition"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 mx-auto" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-xl text-xs font-semibold transition group relative ${
                  isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-[#0F2A43] text-white shadow-sm'
                    : 'text-[#5A6A7E] hover:text-[#0F2A43] hover:bg-[#F1F5F9]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isActive ? 'text-white' : 'text-[#5A6A7E] group-hover:text-[#0F2A43]'
                  } ${isCollapsed && !isActive ? 'group-hover:scale-110' : ''}`}
                />

                {!isCollapsed && (
                  <span className="truncate tracking-tight">{item.label}</span>
                )}

                {/* Collapsed Tooltip Flyout */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2.5 px-2.5 py-1.5 bg-[#0F2A43] text-white text-[11px] font-medium rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Node / Organization Footer */}
      <div className="pt-3 border-t border-[#E8EEF3]">
        {!isCollapsed ? (
          <div className="flex items-center justify-between px-2 py-1 text-[11px] text-[#5A6A7E]">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-medium text-[#0F2A43] truncate">{user?.organization || 'Connected'}</span>
            </div>
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-[#8A99AD] hover:text-[#0F2A43] transition p-1"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full flex justify-center py-2 text-[#8A99AD] hover:text-[#0F2A43] hover:bg-[#F1F5F9] rounded-lg transition"
            title={`Connected • ${user?.organization || 'Node'}`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          </button>
        )}
      </div>
    </aside>
  );
}
