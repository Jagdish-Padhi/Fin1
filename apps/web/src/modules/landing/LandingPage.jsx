import React from 'react';
import { HeroTokenAnimation } from '../Animations/hero-token.jsx';
import { BrandLogo } from '../../shared/components/BrandLogo.jsx';
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
  ExternalLink,
} from 'lucide-react';

export function LandingPage({ onEnterConsole, onOpenPublicVerify, onOpenAuth }) {
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
      <header className="h-16 border-b border-[#D8E0E8] bg-white/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <BrandLogo onClick={onEnterConsole} />

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
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#5A6A7E] hover:text-[#0F2A43] hover:bg-[#F8FAFC] border border-[#D8E0E8] transition"
            title="Public Verify"
          >
            <Search className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Public Verify</span>
          </button>

          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 rounded-lg border border-[#D8E0E8] bg-white hover:bg-[#F8FAFC] text-[#0F2A43] text-xs font-semibold transition shadow-2xs"
            >
              Sign In
            </button>
          )}

          <button
            onClick={onEnterConsole}
            className="px-4 py-2 rounded-lg bg-[#0F2A43] hover:bg-[#1F5A7A] text-white text-xs font-semibold flex items-center gap-2 transition shadow-xs"
          >
            <span>Console</span>
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
      <section id="features" className="py-24 px-6 md:px-12 lg:px-16 border-t border-[#D8E0E8] bg-white">
        <div className="max-w-7xl mx-auto space-y-16">
          {/* Centered Section Header */}
          <div className="max-w-3xl mx-auto text-center space-y-3">
            
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F2A43] tracking-tight font-['Outfit',sans-serif]">
              Institutional Asset Lifecycle
            </h2>
            <p className="text-sm sm:text-base text-[#5A6A7E] max-w-2xl mx-auto leading-relaxed">
              Governed on-chain workflows engineered for originators, audit firms, certified appraisers, and institutional capital partners.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="rounded-2xl bg-white border border-[#E2E8F0] p-7 transition-all duration-300 ease-out hover:border-[#0F766E]/50 hover:shadow-[0_12px_28px_-8px_rgba(15,42,67,0.08)] hover:-translate-y-1 group"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-[#0F766E] group-hover:bg-[#0F2A43] group-hover:border-[#0F2A43] group-hover:text-white transition-all duration-300 shadow-2xs mb-4">
                    <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                  </div>

                  <h3 className="text-base font-bold text-[#0F2A43] group-hover:text-[#0F766E] transition-colors duration-200 mb-2">
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

      {/* Industry Grade Dark Footer */}
      <footer className="mt-auto bg-[#091E30] text-[#94A3B8] border-t border-[#132A40] pt-16 pb-12 px-6 md:px-12 lg:px-16">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Main Footer Columns */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            {/* Brand & Platform Summary */}
            <div className="md:col-span-5 space-y-4">
              <BrandLogo onClick={onEnterConsole} showSubtitle={false} dark={true} />
              <p className="text-xs text-[#94A3B8] leading-relaxed max-w-sm">
                Enterprise Real-World Asset (RWA) tokenization and lifecycle governance infrastructure on Hyperledger Fabric 2.5. Delivering cryptographic audit trails, private data collection partitioning, and automated transfer compliance rules.
              </p>
              <div className="flex items-center gap-3 pt-2 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-[#132A40] text-[#2DD4BF] font-mono text-[11px] font-semibold">
                  Hyperledger Fabric 2.5
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[#132A40] text-[#CBD5E1] font-mono text-[11px]">
                  Raft Consensus
                </span>
              </div>
            </div>

            {/* Standards & Official Docs */}
            <div className="md:col-span-3 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Specifications &amp; Standards
              </h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <a
                    href="https://hyperledger-fabric.readthedocs.io/en/release-2.5/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition flex items-center gap-1.5"
                  >
                    <span>Hyperledger Fabric Docs</span>
                    <ExternalLink className="w-3 h-3 text-[#64748B]" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.lfdecentralizedtrust.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition flex items-center gap-1.5"
                  >
                    <span>LF Decentralized Trust</span>
                    <ExternalLink className="w-3 h-3 text-[#64748B]" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.erc3643.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition flex items-center gap-1.5"
                  >
                    <span>ERC-3643 Permissioned Token</span>
                    <ExternalLink className="w-3 h-3 text-[#64748B]" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://interwork.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition flex items-center gap-1.5"
                  >
                    <span>Token Taxonomy Framework (TTF)</span>
                    <ExternalLink className="w-3 h-3 text-[#64748B]" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Architecture & Institutional Framework */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Architecture
              </h4>
              <ul className="space-y-2.5 text-xs text-[#94A3B8]">
                <li>Private Data Collections</li>
                <li>Merkle Evidence Trees</li>
                <li>Segregation of Duties (SoD)</li>
                <li>Pre-Flight Transfer Rules</li>
              </ul>
            </div>

            {/* Regulatory & Verification */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Verification
              </h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <button
                    onClick={onOpenPublicVerify}
                    className="text-[#2DD4BF] hover:underline font-medium text-left"
                  >
                    Public Passport Lookup
                  </button>
                </li>
                <li>
                  <button
                    onClick={onEnterConsole}
                    className="hover:text-white transition text-left"
                  >
                    Consortium Console
                  </button>
                </li>
                <li className="text-[#64748B]">IFSCA Sandbox Aligned</li>
                <li className="text-[#64748B]">Independent Verifier MSP</li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-[#162C40] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#64748B]">
            <p>© 2026 AsseTrust Consortium. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-mono text-[11px] text-[#94A3B8]">
                Permissioned Network Active • Zero-Knowledge PDC Boundary
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
