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
  Users,
  UserCheck,
  Shield,
} from 'lucide-react';

export function Sidebar({ currentTab, onSelectTab }) {
  const { user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'participants', label: 'Participant Directory', icon: Users },
    ...(user?.role === 'ADMINISTRATOR'
      ? [{ id: 'identity-admin', label: 'Consortium Governance', icon: UserCheck }]
      : []),
    { id: 'assets', label: 'Real-World Assets', icon: Layers },
    { id: 'asset-types', label: 'Asset Type Engine', icon: Building },
    { id: 'verification', label: 'Verification Audits', icon: FileCheck },
    { id: 'valuation', label: 'Valuation & Pricing', icon: TrendingUp },
    { id: 'tokens', label: 'Tokenized Securities', icon: Coins },
    { id: 'transfers', label: 'Settlement & Transfer Rules', icon: ArrowRightLeft },
    { id: 'lifecycle', label: 'Lifecycle Governance', icon: Activity },
    { id: 'audit', label: 'Consortium Audit Trail', icon: History },
  ];

  return (
    <aside className="w-64 border-r border-[#D8E0E8] bg-white flex flex-col justify-between p-4 shadow-[1px_0_3px_rgba(15,42,67,0.02)]">
      <div className="space-y-5">
        {/* Active Identity Card */}
        <div className="bg-[#F8FAFC] border border-[#D8E0E8] rounded-xl p-3.5 space-y-1.5 shadow-2xs">
          <div className="text-[10px] text-[#5A6A7E] uppercase tracking-wider font-bold flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-[#1F5A7A]" />
            Consortium Entity
          </div>
          <div className="text-xs font-bold text-[#17202A] truncate">{user?.name}</div>
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1]">
              {user?.role}
            </span>
            <span className="text-[10px] text-[#5A6A7E] font-mono truncate">{user?.mspId}</span>
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
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-[#0F2A43] text-white shadow-sm'
                    : 'text-[#5A6A7E] hover:text-[#0F2A43] hover:bg-[#F1F5F9]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-[#5A6A7E]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Network Status Footer */}
      <div className="pt-3 border-t border-[#D8E0E8] text-[10px] text-[#5A6A7E] space-y-1.5">
        <div className="flex items-center justify-between font-medium">
          <span>Fabric Channel</span>
          <span className="font-mono text-[#17202A] font-semibold">rwa-channel</span>
        </div>
        <div className="flex items-center justify-between font-medium">
          <span>Consortium Health</span>
          <span className="text-[#18794E] font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#18794E] animate-pulse" />
            6 Orgs Synced
          </span>
        </div>
      </div>
    </aside>
  );
}
