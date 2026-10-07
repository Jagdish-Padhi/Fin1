import React, { useState } from 'react';
import { AuthProvider, useAuth } from './shared/context/AuthContext.jsx';
import { Navbar } from './shared/components/Navbar.jsx';
import { Sidebar } from './shared/components/Sidebar.jsx';
import { DashboardView } from './modules/dashboard/DashboardView.jsx';
import { ParticipantsView } from './modules/participants/ParticipantsView.jsx';
import { IdentityAdminView } from './modules/identity-admin/IdentityAdminView.jsx';
import { AssetsView } from './modules/assets/AssetsView.jsx';
import { AssetTypesView } from './modules/asset-types/AssetTypesView.jsx';
import { PublicVerifyPage } from './modules/public-verify/PublicVerifyPage.jsx';
import { ShieldCheck, ArrowLeft, Lock } from 'lucide-react';

function MainLayout() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [showPublicVerify, setShowPublicVerify] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#5A6A7E]">
          <div className="w-8 h-8 border-2 border-[#0F2A43] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold font-mono tracking-wide text-[#1F5A7A]">
            Initializing AsseTrust Security Node...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#17202A]">
      <Navbar onOpenPublicVerify={() => setShowPublicVerify(true)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl mx-auto w-full">
          {currentTab === 'dashboard' && <DashboardView onNavigate={setCurrentTab} />}
          {currentTab === 'participants' && <ParticipantsView />}
          {currentTab === 'identity-admin' && <IdentityAdminView />}
          {currentTab === 'assets' && <AssetsView />}
          {currentTab === 'asset-types' && <AssetTypesView />}

          {currentTab !== 'dashboard' &&
            currentTab !== 'participants' &&
            currentTab !== 'identity-admin' &&
            currentTab !== 'assets' &&
            currentTab !== 'asset-types' && (
            <div className="trust-card p-8 space-y-4 max-w-2xl">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-xl bg-[#F0F4F8] text-[#0F2A43] border border-[#D8E0E8]">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0F2A43] capitalize">
                    {currentTab.replace('-', ' ')} Module
                  </h3>
                  <p className="text-xs text-[#5A6A7E] mt-0.5">
                    Governed under Hyperledger Fabric 2.5 smart contract specifications
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#D8E0E8] text-xs text-[#17202A] space-y-2">
                <div className="font-semibold text-[#0F766E] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Consortium Governance Policy
                </div>
                <p className="text-[#5A6A7E] leading-relaxed">
                  Cryptographic transaction endpoints and multi-signatory access matrices for this module are active on the chaincode ledger. Access is scoped by institutional role assignments.
                </p>
              </div>

              <button
                onClick={() => setCurrentTab('dashboard')}
                className="text-xs font-semibold text-[#1F5A7A] hover:text-[#0F2A43] flex items-center gap-1.5 transition pt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Executive Dashboard
              </button>
            </div>
          )}
        </main>
      </div>

      {showPublicVerify && <PublicVerifyPage onClose={() => setShowPublicVerify(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
