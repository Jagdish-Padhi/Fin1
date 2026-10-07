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

function MainLayout() {
  const { user, loading } = useAuth();
  const [view, setView] = useState('landing'); // 'landing' | 'console'
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [showPublicVerify, setShowPublicVerify] = useState(false);

  const currentRole = user?.role || 'ADMINISTRATOR';

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

  // 1. Landing Page View
  if (view === 'landing') {
    return (
      <>
        <LandingPage
          onEnterConsole={() => setView('console')}
          onOpenPublicVerify={() => setShowPublicVerify(true)}
        />
        {showPublicVerify && (
          <PublicVerifyPage onClose={() => setShowPublicVerify(false)} />
        )}
      </>
    );
  }

  // 2. Consortium Management Console View
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#17202A]">
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
          onNavigateLanding={() => setView('landing')}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl mx-auto w-full">
          {currentTab === 'dashboard' && <DashboardView onNavigate={setCurrentTab} />}
          
          {currentTab === 'participants' && <ParticipantsView />}

          {currentTab === 'identity-admin' && (
            <RoleGuard
              currentRole={currentRole}
              allowedRoles={['ADMINISTRATOR']}
              onNavigateHome={() => setCurrentTab('dashboard')}
            >
              <IdentityAdminView />
            </RoleGuard>
          )}

          {currentTab === 'assets' && <AssetsView />}

          {currentTab === 'asset-types' && (
            <RoleGuard
              currentRole={currentRole}
              allowedRoles={['ADMINISTRATOR', 'COMPLIANCE']}
              onNavigateHome={() => setCurrentTab('dashboard')}
            >
              <AssetTypesView />
            </RoleGuard>
          )}

          {currentTab === 'verification' && (
            <RoleGuard
              currentRole={currentRole}
              allowedRoles={['VERIFIER', 'COMPLIANCE', 'AUDITOR', 'ADMINISTRATOR']}
              onNavigateHome={() => setCurrentTab('dashboard')}
            >
              <VerificationView />
            </RoleGuard>
          )}

          {currentTab === 'valuation' && (
            <RoleGuard
              currentRole={currentRole}
              allowedRoles={['VALUER', 'COMPLIANCE', 'AUDITOR', 'ADMINISTRATOR']}
              onNavigateHome={() => setCurrentTab('dashboard')}
            >
              <ValuationView />
            </RoleGuard>
          )}

          {currentTab === 'tokens' && (
            <RoleGuard
              currentRole={currentRole}
              allowedRoles={['ISSUER', 'COMPLIANCE', 'INVESTOR', 'AUDITOR', 'ADMINISTRATOR']}
              onNavigateHome={() => setCurrentTab('dashboard')}
            >
              <TokensView />
            </RoleGuard>
          )}

          {currentTab === 'transfers' && (
            <RoleGuard
              currentRole={currentRole}
              allowedRoles={['ISSUER', 'INVESTOR', 'COMPLIANCE', 'AUDITOR', 'ADMINISTRATOR']}
              onNavigateHome={() => setCurrentTab('dashboard')}
            >
              <TransfersView />
            </RoleGuard>
          )}

          {currentTab === 'lifecycle' && (
            <RoleGuard
              currentRole={currentRole}
              allowedRoles={['COMPLIANCE', 'AUDITOR', 'ADMINISTRATOR', 'ISSUER']}
              onNavigateHome={() => setCurrentTab('dashboard')}
            >
              <LifecycleView />
            </RoleGuard>
          )}

          {currentTab === 'audit' && (
            <RoleGuard
              currentRole={currentRole}
              allowedRoles={['AUDITOR', 'COMPLIANCE', 'ADMINISTRATOR', 'VERIFIER', 'VALUER']}
              onNavigateHome={() => setCurrentTab('dashboard')}
            >
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
