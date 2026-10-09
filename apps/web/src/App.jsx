import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './shared/context/AuthContext.jsx';
import { Navbar } from './shared/components/Navbar.jsx';
import { Sidebar } from './shared/components/Sidebar.jsx';
import { RoleGuard } from './shared/components/RoleGuard.jsx';
import { canAccessTab } from './shared/utils/permissions.js';
import { DashboardView } from './modules/dashboard/DashboardView.jsx';
import { ParticipantsView } from './modules/participants/ParticipantsView.jsx';
import { IdentityAdminView } from './modules/identity-admin/IdentityAdminView.jsx';
import { AssetsView } from './modules/assets/AssetsView.jsx';
import { AssetTypesView } from './modules/asset-types/AssetTypesView.jsx';
import { VerificationView } from './modules/verification/VerificationView.jsx';
import { ValuationView } from './modules/valuation/ValuationView.jsx';
import { TransfersView } from './modules/transfers/TransfersView.jsx';
import { InvestView } from './modules/offers/InvestView.jsx';
import { InvestmentOffersView } from './modules/offers/InvestmentOffersView.jsx';
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

  // If the active tab is not reachable for this identity (role switch,
  // removed tab, stale state), fall back to dashboard instead of
  // stranding the user on a Segregation-of-Duties denial card.
  // Valuer has no dashboard — valuation is their home tab.
  // RoleGuard stays in place below as defense-in-depth.
  useEffect(() => {
    if (!currentRole) return;
    if (currentRole === 'VALUER' && currentTab === 'dashboard') {
      setCurrentTab('valuation');
      return;
    }
    if (currentTab === 'dashboard') return;
    if (!canAccessTab(currentRole, currentTab)) {
      setCurrentTab('dashboard');
    }
  }, [currentRole, currentTab]);

  // ─── Loading spinner ───────────────────────────────────────────────────────
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

  // ─── Unauthenticated or Landing View ───────────────────────────────────────
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

  // ─── Authenticated Console View ────────────────────────────────────────────
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
            <RoleGuard
              currentRole={currentRole}
              allowedRoles={['ADMINISTRATOR']}
              onNavigateHome={() => setCurrentTab('dashboard')}
            >
              <ParticipantsView />
            </RoleGuard>
          )}

          {currentTab === 'identity-admin' && (
            <RoleGuard
              currentRole={currentRole}
              allowedRoles={['ADMINISTRATOR']}
              onNavigateHome={() => setCurrentTab('dashboard')}
            >
              <IdentityAdminView />
            </RoleGuard>
          )}

          {currentTab === 'assets' && (
            <RoleGuard
              currentRole={currentRole}
              allowedRoles={['ISSUER', 'COMPLIANCE', 'INVESTOR', 'AUDITOR']}
              onNavigateHome={() => setCurrentTab('dashboard')}
            >
              <AssetsView />
            </RoleGuard>
          )}

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

          {currentTab === 'invest' && (
            <RoleGuard
              currentRole={currentRole}
              allowedRoles={['INVESTOR']}
              onNavigateHome={() => setCurrentTab('dashboard')}
            >
              <InvestView />
            </RoleGuard>
          )}

          {currentTab === 'investment-offers' && (
            <RoleGuard
              currentRole={currentRole}
              allowedRoles={['ISSUER']}
              onNavigateHome={() => setCurrentTab('dashboard')}
            >
              <InvestmentOffersView />
            </RoleGuard>
          )}

          {currentTab === 'transfers' && (
            <RoleGuard
              currentRole={currentRole}
              allowedRoles={['COMPLIANCE', 'AUDITOR', 'ADMINISTRATOR']}
              onNavigateHome={() => setCurrentTab('dashboard')}
            >
              <TransfersView />
            </RoleGuard>
          )}

          {currentTab === 'lifecycle' && (
            <RoleGuard
              currentRole={currentRole}
              allowedRoles={['COMPLIANCE', 'ADMINISTRATOR', 'AUDITOR']}
              onNavigateHome={() => setCurrentTab('dashboard')}
            >
              <LifecycleView />
            </RoleGuard>
          )}

          {currentTab === 'audit' && (
            <RoleGuard
              currentRole={currentRole}
              allowedRoles={['AUDITOR', 'COMPLIANCE']}
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
