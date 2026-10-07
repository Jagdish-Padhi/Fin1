import React from 'react';
import { HeroTokenAnimation } from '../Animations/hero-token.jsx';
import {
  ShieldCheck,
  Search,
  ArrowRight,
  Layers,
  FileCheck,
  TrendingUp,
  Coins,
  ArrowRightLeft,
  History,
} from 'lucide-react';

export function LandingPage({ onEnterConsole, onOpenPublicVerify }) {
  const features = [
    {
      icon: Layers,
      title: 'Parametric Asset Registry',
      desc: 'Extensible asset schemas with automated duplicate prevention and off-chain cryptographic digest anchoring.',
    },
    {
      icon: FileCheck,
      title: 'Independent Verification',
      desc: 'Strict segregation of duties requiring certified verifier audit approval before tokenization eligibility.',
    },
    {
      icon: TrendingUp,
      title: 'Certified Valuations',
      desc: 'Institutional appraiser valuation entries complete with methodology notes and validity timestamps.',
    },
    {
      icon: Coins,
      title: 'Legally-Bound Tokenization',
      desc: 'Issuance of fungible and non-fungible digital tokens with immutable legal claim representation.',
    },
    {
      icon: ArrowRightLeft,
      title: 'Compliance Transfer Rules',
      desc: 'On-chain transfer rule evaluation ensuring KYC, jurisdictional eligibility, and investor qualifications.',
    },
    {
      icon: History,
      title: 'Consortium Audit Trail',
      desc: 'Immutable provenance recording on Hyperledger Fabric 2.5 accessible to regulatory oversight bodies.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#17202A] flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navigation */}
      <header className="h-16 md:h-20 border-b border-[#D8E0E8] bg-white/95 backdrop-blur-md px-6 md:px-12 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3.5">
          <img src="/logo.png" alt="AsseTrust" className="w-11 h-11 md:w-12 md:h-12 object-contain hover:scale-105 transition-transform" />
          <span className="text-2xl font-extrabold tracking-tight font-['Outfit',sans-serif]">
            <span className="text-[#0F2A43]">Asse</span>
            <span className="text-[#0F766E]">Trust</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#5A6A7E]">
          <a href="#features" className="hover:text-[#0F2A43] transition">Capabilities</a>
          <a href="#architecture" className="hover:text-[#0F2A43] transition">Consortium Trust</a>
          <button 
            onClick={onOpenPublicVerify} 
            className="hover:text-[#0F2A43] transition flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Public Verify</span>
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenPublicVerify}
            className="md:hidden p-2 rounded-lg text-[#5A6A7E] hover:text-[#0F2A43] hover:bg-[#F8FAFC]"
            title="Public Verify"
          >
            <Search className="w-4 h-4 text-[#0F766E]" />
          </button>
          <button
            onClick={onEnterConsole}
            className="px-4 py-2 rounded-lg bg-[#0F2A43] hover:bg-[#1F5A7A] text-white text-xs font-semibold flex items-center gap-2 transition shadow-xs"
          >
            <span>Launch Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section — Fits in 1 Screen View with Left Aligned Copy & Right Animation */}
      <section className="h-[calc(100vh-4rem)] max-h-[850px] min-h-[560px] flex items-center px-6 md:px-12 lg:px-16 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          {/* Left Hero Text Section */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0F2A43] tracking-tight leading-[1.1] font-['Outfit',sans-serif]">
              Verify the Asset.
              <br />
              <span className="text-[#0F766E]">Trust the Token.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#5A6A7E] leading-relaxed max-w-xl font-normal">
              Register, verify, value, tokenize and trace real-world assets through a permissioned trust network.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={onEnterConsole}
                className="px-6 py-3 rounded-xl bg-[#0F2A43] hover:bg-[#1F5A7A] text-white font-semibold text-sm transition shadow-sm flex items-center gap-2"
              >
                <span>Launch Console</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenPublicVerify}
                className="px-6 py-3 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#0F2A43] border border-[#D8E0E8] font-semibold text-sm transition shadow-xs flex items-center gap-2"
              >
                <Search className="w-4 h-4 text-[#0F766E]" />
                <span>Verify an Asset</span>
              </button>
            </div>
          </div>

          {/* Right Hero Animation (Transparent, No Div Boundary) */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <HeroTokenAnimation />
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section id="features" className="py-20 px-6 md:px-12 lg:px-16 border-t border-[#D8E0E8] bg-white">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F2A43] tracking-tight font-['Outfit',sans-serif]">
              Institutional Asset Lifecycle
            </h2>
            <p className="text-sm text-[#5A6A7E]">
              Governed workflows designed for originators, audit firms, appraisers, and institutional investors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#D8E0E8] hover:border-[#1F5A7A] hover:shadow-xs transition space-y-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#D8E0E8] flex items-center justify-center text-[#0F766E] shadow-2xs">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#0F2A43]">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-[#5A6A7E] leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Architecture Highlights Section */}
      <section id="architecture" className="py-16 px-6 md:px-12 lg:px-16 border-t border-[#D8E0E8] bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-white border border-[#D8E0E8] space-y-2">
            <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider block">Security</span>
            <h4 className="text-lg font-bold text-[#0F2A43]">Permissioned Ledger</h4>
            <p className="text-xs text-[#5A6A7E] leading-relaxed">
              Consortium consensus on Hyperledger Fabric 2.5 with cryptographic signature enforcement per organization MSP.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#D8E0E8] space-y-2">
            <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider block">Privacy</span>
            <h4 className="text-lg font-bold text-[#0F2A43]">Private Data Collections</h4>
            <p className="text-xs text-[#5A6A7E] leading-relaxed">
              Confidential commercial attributes and participant PII remain partitioned within side-channel PDC boundaries.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#D8E0E8] space-y-2">
            <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider block">Compliance</span>
            <h4 className="text-lg font-bold text-[#0F2A43]">Smart Transfer Rules</h4>
            <p className="text-xs text-[#5A6A7E] leading-relaxed">
              Real-time validation of KYC expiration, investor accreditation, and lockup covenants prior to execution.
            </p>
          </div>
        </div>
      </section>

      {/* Industry Grade Footer */}
      <footer className="mt-auto border-t border-[#D8E0E8] bg-white py-12 px-6 md:px-12 lg:px-16">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-[#D8E0E8]">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="AsseTrust" className="w-10 h-10 object-contain" />
                <span className="text-xl font-extrabold tracking-tight font-['Outfit',sans-serif]">
                  <span className="text-[#0F2A43]">Asse</span>
                  <span className="text-[#0F766E]">Trust</span>
                </span>
              </div>
              <p className="text-xs text-[#5A6A7E] max-w-sm">
                Institutional Real-World Asset Governance & Tokenization Infrastructure.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-[#5A6A7E]">
              <button onClick={onEnterConsole} className="hover:text-[#0F2A43] transition">
                Consortium Console
              </button>
              <span>•</span>
              <button onClick={onOpenPublicVerify} className="hover:text-[#0F2A43] transition">
                Public Ledger Verify
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#5A6A7E]">
            <p>© 2026 AsseTrust Consortium. All rights reserved.</p>
            <p className="font-mono text-[11px]">Permissioned RWA Infrastructure • Hyperledger Fabric</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
