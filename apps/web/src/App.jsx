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
import { ShieldCheck, Layers, FileCheck, TrendingUp, Coins, ArrowRightLeft, Activity, History } from 'lucide-react';

function MainLayout() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [showPublicVerify, setShowPublicVerify] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Initializing EkamVistar Consortium Node...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
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
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white capitalize">{currentTab} Module</h3>
                  <p className="text-xs text-slate-400">
                    Foundation Stage ready. This module runs as an independent vertical slice governed by contract specs in docs/contracts/
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 space-y-2">
                <div className="font-semibold text-indigo-400">Phase 0 Architectural Independence:</div>
                <p>
                  API endpoints, ChainGateway mock state, and permission matrices for this module are verified and active on the backend. Vertical slice development can be continued independently without merge collisions.
                </p>
              </div>

              <button
                onClick={() => setCurrentTab('dashboard')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition"
              >
                ← Return to Role Dashboard
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
