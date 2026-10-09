import React, { useState } from 'react';
import { AuthProvider, useAuth } from './shared/context/AuthContext.jsx';
import { Navbar } from './shared/components/Navbar.jsx';
import { Sidebar } from './shared/components/Sidebar.jsx';
import { RoleGuard } from './shared/components/RoleGuard.jsx';
import { DashboardView } from './modules/dashboard/DashboardView.jsx';
import { ParticipantsView } from './modules/participants/ParticipantsView.jsx';
import { IdentityAdminView } from './modules/identity-admin/IdentityAdminView.jsx';
import { AssetsView } from './modules/assets/AssetsView.jsx';
import { AssetTypesView } from './modules/asset-types/AssetTypesView.jsx';
import { VerificationView } from './modules/verification/VerificationView.jsx';
import { ValuationView } from './modules/valuation/ValuationView.jsx';
import { TokensView } from './modules/tokens/TokensView.jsx';
import { TransfersView } from './modules/transfers/TransfersView.jsx';
import { LifecycleView } from './modules/lifecycle/LifecycleView.jsx';
import { AuditView } from './modules/audit/AuditView.jsx';
import { PublicVerifyPage } from './modules/public-verify/PublicVerifyPage.jsx';
import { LandingPage } from './modules/landing/LandingPage.jsx';
import { AuthModal } from './modules/auth/AuthModal.jsx';
import { ShieldCheck } from 'lucide-react';

function MainLayout() {
  const { user, loading } = useAuth();
  const [view, setView] = useState('landing'); // 'landing' | 'console'
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [showPublicVerify, setShowPublicVerify] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const currentRole = user?.role || null;

  // ΓöÇΓöÇΓöÇ Loading spinner ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-[#5A6A7E]">
          <ShieldCheck className="w-10 h-10 text-[#1F5A7A] animate-pulse" />
          <div className="w-8 h-8 border-2 border-[#0F2A43] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold font-mono tracking-wide text-[#1F5A7A]">
            Validating Consortium Node Certificate...
          </span>
        </div>
      </div>
    );
  }

  // ΓöÇΓöÇΓöÇ Unauthenticated or Landing View ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  if (!user || view === 'landing') {
    return (
      <div className="app-view-transition">
        <LandingPage
          onEnterConsole={() => {
            if (user) {
              setView('console');
            } else {
              setShowAuthModal(true);
            }
          }}
          onOpenPublicVerify={() => setShowPublicVerify(true)}
          onOpenAuth={() => setShowAuthModal(true)}
        />
        {showPublicVerify && (
          <PublicVerifyPage onClose={() => setShowPublicVerify(false)} />
        )}
        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => {
              setShowAuthModal(false);
              setView('console');
            }}
          />
        )}
      </div>
    );
  }

  // ΓöÇΓöÇΓöÇ Authenticated Console View ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#17202A] app-view-transition">
      <Navbar
        onOpenPublicVerify={() => setShowPublicVerify(true)}
        onNavigateLanding={() => setView('landing')}
        onNavigateConsole={() => setView('console')}
        isLandingView={false}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
        />

        <main key={currentTab} className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl mx-auto w-full app-view-transition">
          {currentTab === 'dashboard' && <DashboardView onNavigate={setCurrentTab} />}

          {currentTab === 'participants' && (
            <RoleGuard currentRole={currentRole} tab="participants" onNavigateHome={() => setCurrentTab('dashboard')}>
              <ParticipantsView />
            </RoleGuard>
          )}

          {currentTab === 'identity-admin' && (
            <RoleGuard currentRole={currentRole} tab="identity-admin" onNavigateHome={() => setCurrentTab('dashboard')}>
              <IdentityAdminView />
            </RoleGuard>
          )}

          {currentTab === 'assets' && (
            <RoleGuard currentRole={currentRole} tab="assets" onNavigateHome={() => setCurrentTab('dashboard')}>
              <AssetsView />
            </RoleGuard>
          )}

          {currentTab === 'asset-types' && (
            <RoleGuard currentRole={currentRole} tab="asset-types" onNavigateHome={() => setCurrentTab('dashboard')}>
              <AssetTypesView />
            </RoleGuard>
          )}

          {currentTab === 'verification' && (
            <RoleGuard currentRole={currentRole} tab="verification" onNavigateHome={() => setCurrentTab('dashboard')}>
              <VerificationView />
            </RoleGuard>
          )}

          {currentTab === 'valuation' && (
            <RoleGuard currentRole={currentRole} tab="valuation" onNavigateHome={() => setCurrentTab('dashboard')}>
              <ValuationView />
            </RoleGuard>
          )}

          {currentTab === 'tokens' && (
            <RoleGuard currentRole={currentRole} tab="tokens" onNavigateHome={() => setCurrentTab('dashboard')}>
              <TokensView />
            </RoleGuard>
          )}

          {currentTab === 'transfers' && (
            <RoleGuard currentRole={currentRole} tab="transfers" onNavigateHome={() => setCurrentTab('dashboard')}>
              <TransfersView />
            </RoleGuard>
          )}

          {currentTab === 'lifecycle' && (
            <RoleGuard currentRole={currentRole} tab="lifecycle" onNavigateHome={() => setCurrentTab('dashboard')}>
              <LifecycleView />
            </RoleGuard>
          )}

          {currentTab === 'audit' && (
            <RoleGuard currentRole={currentRole} tab="audit" onNavigateHome={() => setCurrentTab('dashboard')}>
              <AuditView />
            </RoleGuard>
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
