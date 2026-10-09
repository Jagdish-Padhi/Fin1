import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { useToast } from '../../shared/components/Toast.jsx';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog.jsx';
import {
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers,
  FileCheck,
  ArrowRight,
  Search,
} from 'lucide-react';

const VALUATION_PILL = {
  PROPOSED: 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]',
  APPROVED: 'bg-[#ECFDF5] text-[#18794E] border-[#A7F3D0]',
  REJECTED: 'bg-[#FEF2F2] text-[#B42318] border-[#FECACA]',
  SUPERSEDED: 'bg-[#F1F5F9] text-[#5A6A7E] border-[#D8E0E8]',
  EXPIRED: 'bg-[#FEF2F2] text-[#B42318] border-[#FECACA]',
};

function isStale(v) {
  if (!v) return false;
  if (v.status === 'EXPIRED') return true;
  if (!v.validUntil) return false;
  return new Date(v.validUntil).getTime() < Date.now();
}

function latestByDate(list) {
  return [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0] || null;
}

export function ValuationView() {
  const { user } = useAuth();
  const toast = useToast();
  const myId = user?.userId || user?.participantId || '';

  const [valuations, setValuations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Approve confirmation dialog (compliance)
  const [approveTarget, setApproveTarget] = useState(null);
  const [approving, setApproving] = useState(false);

  // Queue search (valuer)
  const [queueSearch, setQueueSearch] = useState('');

  // Form State
  const [assetId, setAssetId] = useState('');
  const [amountPaise, setAmountPaise] = useState(500000000); // 50 Lakhs default
  const [methodology, setMethodology] = useState('');
  const [modelUri, setModelUri] = useState('ipfs://QmValuationModel2026');
  const [validDays, setValidDays] = useState(90);
  const [validityLimit, setValidityLimit] = useState(90);
  const [allowedMethods, setAllowedMethods] = useState([]);
  const [assetTypeError, setAssetTypeError] = useState('');

  /**
   * SoD ENFORCEMENT: Only COMPLIANCE officer can approve/certify valuations.
   * VALUER submits valuations but CANNOT approve their own — strict SoD as per PS-01.
   */
  const isValuer = user?.role === 'VALUER';
  const canApprove = user?.role === 'COMPLIANCE'; // ONLY compliance, not valuer

  const loadData = async () => {
    try {
      setLoading(true);
      const [valRes, assetRes] = await Promise.allSettled([
        api.getValuations(),
        api.getAssets(),
      ]);
      if (valRes.status === 'fulfilled') {
        setValuations(valRes.value.data || []);
      } else {
        toast.error('Failed to load valuations from ledger.');
      }
      if (assetRes.status === 'fulfilled') {
        setAssets(assetRes.value.data || []);
      }
    } catch (err) {
      console.error('Failed to load valuation desk:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ─── Derived pipeline state ──────────────────────────────────────────────
  const verifiedAssets = useMemo(
    () => assets.filter((a) => a.status === 'VERIFIED'),
    [assets]
  );

  const valuationsByAsset = useMemo(() => {
    const map = {};
    for (const v of valuations) {
      if (!map[v.assetId]) map[v.assetId] = [];
      map[v.assetId].push(v);
    }
    return map;
  }, [valuations]);

  const assetPipeline = (asset) => {
    const list = valuationsByAsset[asset.id] || [];
    const pending = list.find((v) => v.status === 'PROPOSED') || null;
    const approved = latestByDate(list.filter((v) => v.status === 'APPROVED' && !isStale(v)));
    return { pending, approved, count: list.length };
  };

  const myProposals = useMemo(
    () =>
      [...valuations]
        .filter((v) => v.proposedBy === myId)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [valuations, myId]
  );

  const awaitingCount = useMemo(
    () => verifiedAssets.filter((a) => !assetPipeline(a).pending && !assetPipeline(a).approved).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [verifiedAssets, valuationsByAsset]
  );
  const myPendingCount = myProposals.filter((v) => v.status === 'PROPOSED').length;
  const myCertifiedCount = myProposals.filter((v) => v.status === 'APPROVED' && !isStale(v)).length;

  const filteredQueue = verifiedAssets.filter((a) => {
    if (!queueSearch) return true;
    const q = queueSearch.toLowerCase();
    return (
      a.id?.toLowerCase().includes(q) ||
      a.displayName?.toLowerCase().includes(q) ||
      a.typeKey?.toLowerCase().includes(q)
    );
  });

  // ─── Asset-type valuation rules for the modal's chosen asset ─────────────
  useEffect(() => {
    if (!showProposeModal || !assetId.trim()) {
      setAllowedMethods([]);
      setAssetTypeError('');
      return undefined;
    }

    let active = true;
    const loadAssetValuationRules = async () => {
      try {
        setAssetTypeError('');
        const assetResponse = await api.getAsset(assetId.trim());
        const asset = assetResponse.data;
        if (!asset) throw new Error('Asset was not found.');
        if (asset.status !== 'VERIFIED') throw new Error('Asset must be in VERIFIED state before valuation can be submitted.');

        const typeResponse = await api.getAssetType(asset.typeKey, asset.typeVersion || 1);
        const methods = typeResponse.data?.valuation?.methods || [];
        if (methods.length === 0) throw new Error('This asset type has no configured valuation methods.');

        if (!active) return;
        const maxDays = typeResponse.data.valuation.validityDays || 90;
        setAllowedMethods(methods);
        setValidityLimit(maxDays);
        setMethodology((current) => (methods.includes(current) ? current : methods[0]));
        setValidDays((current) => Math.min(Number(current) || maxDays, maxDays));
      } catch (err) {
        if (active) {
          setAllowedMethods([]);
          setAssetTypeError(err.message || 'Unable to load valuation rules for this asset.');
        }
      }
    };

    loadAssetValuationRules();
    return () => { active = false; };
  }, [assetId, showProposeModal]);

  const openProposeForAsset = (asset) => {
    setAssetId(asset.id);
    setShowProposeModal(true);
  };

  const closePropose = () => {
    setShowProposeModal(false);
    setAssetId('');
    setAssetTypeError('');
  };

  const handlePropose = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (!allowedMethods.includes(methodology)) {
        throw new Error('Select a valuation method allowed for this asset type.');
      }
      const valuationDate = new Date(Date.now() - 60_000);
      const validUntil = new Date(valuationDate.getTime() + Number(validDays) * 86400000).toISOString();
      await api.proposeValuation({
        assetId,
        currency: 'INR',
        amountPaise: Number(amountPaise),
        method: methodology,
        methodDetails: { financialModelUri: modelUri },
        source: {
          valuerName: user?.name || 'Registered Valuer',
          valuerOrg: user?.orgId || 'Valuation Organization',
          reportReference: modelUri,
        },
        valuationDate: valuationDate.toISOString(),
        validUntil,
      });
      closePropose();
      toast.success('Valuation defined and submitted. Awaiting Compliance Officer certification — approval moves the asset to VALUED and unlocks minting.');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to submit valuation proposal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveConfirmed = async () => {
    if (!approveTarget) return;
    try {
      setApproving(true);
      await api.approveValuation(approveTarget.id);
      setApproveTarget(null);
      toast.success(`Valuation ${approveTarget.id} certified and approved on ledger.`);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to certify valuation.');
    } finally {
      setApproving(false);
    }
  };

  const renderValuationStatus = (v) => {
    const pill = VALUATION_PILL[v.status] || VALUATION_PILL.PROPOSED;
    const stale = isStale(v);
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${pill}`}>
        {v.status === 'APPROVED' && !stale ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
        {stale && v.status !== 'EXPIRED' ? 'EXPIRED' : v.status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header — compliance / auditor only; valuer works straight from the queue below */}
      {!isValuer && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D8E0E8]">
          <div>
            <h2 className="text-xl font-bold text-[#0F2A43] flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#1F5A7A]" />
              Valuation &amp; Pricing Desk
            </h2>
            <p className="text-xs text-[#5A6A7E] mt-1">
              Certified institutional appraisals, discounted cash flows, and NAV determinations before token issuance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 border border-[#D8E0E8] rounded-lg text-[#5A6A7E] hover:bg-[#F8FAFC] transition"
              title="Refresh desk"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* ─── Valuer: pipeline counters ─── */}
      {isValuer && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white border border-[#D8E0E8] rounded-xl shadow-2xs">
            <span className="text-xs font-medium text-[#5A6A7E]">Verified Assets Awaiting You</span>
            <p className="text-2xl font-bold text-[#0F2A43] mt-2">{loading ? '—' : awaitingCount}</p>
            <p className="text-[11px] text-[#5A6A7E] mt-1">No pending or certified valuation yet</p>
          </div>
          <div className="p-4 bg-white border border-[#D8E0E8] rounded-xl shadow-2xs">
            <span className="text-xs font-medium text-[#5A6A7E]">My Pending Proposals</span>
            <p className="text-2xl font-bold text-[#A16207] mt-2">{loading ? '—' : myPendingCount}</p>
            <p className="text-[11px] text-[#5A6A7E] mt-1">With compliance officers</p>
          </div>
          <div className="p-4 bg-white border border-[#D8E0E8] rounded-xl shadow-2xs">
            <span className="text-xs font-medium text-[#5A6A7E]">My Certified Valuations</span>
            <p className="text-2xl font-bold text-[#18794E] mt-2">{loading ? '—' : myCertifiedCount}</p>
            <p className="text-[11px] text-[#5A6A7E] mt-1">Approved NAV on ledger</p>
          </div>
        </div>
      )}

      {/* ─── Valuer: verified-asset queue ─── */}
      {isValuer && (
        <div className="bg-white border border-[#D8E0E8] rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-[#D8E0E8] bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-[#0F2A43] uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1F5A7A]" />
              Verified Assets — Ready for Valuation ({filteredQueue.length})
            </h3>
            <div className="relative sm:min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8795A5]" />
              <input
                type="text"
                placeholder="Search asset ID, name, type..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#D8E0E8] rounded-lg focus:outline-none focus:border-[#1F5A7A] bg-white"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#D8E0E8] text-[#5A6A7E] uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Jurisdiction</th>
                  <th className="px-4 py-3">Evidence</th>
                  <th className="px-4 py-3">Valuation State</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E0E8] text-[#17202A]">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-[#5A6A7E]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1F5A7A]" />
                      Loading verified assets from ledger...
                    </td>
                  </tr>
                ) : filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-[#5A6A7E]">
                      No verified assets {queueSearch ? 'match your search' : 'await valuation right now'}. Newly verified assets appear here automatically.
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((a) => {
                    const { pending, approved } = assetPipeline(a);
                    const evidenceCount = (a.evidence || a.evidenceFiles || []).length;
                    const blocked = Boolean(pending);
                    return (
                      <tr
                        key={a.id}
                        onClick={() => { if (!blocked) openProposeForAsset(a); }}
                        title={blocked ? 'A proposal is already pending for this asset' : 'Click to define a valuation for this asset'}
                        className={`transition ${blocked ? '' : 'cursor-pointer hover:bg-[#F8FAFC]'}`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-bold text-[#0F2A43]">{a.displayName || a.id}</div>
                          <div className="font-mono text-[10px] text-[#5A6A7E]">{a.id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#F0F4F8] text-[#1F5A7A] border border-[#D8E0E8]">
                            {a.typeKey}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#5A6A7E]">{a.jurisdiction || 'IN'}</td>
                        <td className="px-4 py-3 text-[#5A6A7E]">{evidenceCount} doc{evidenceCount === 1 ? '' : 's'}</td>
                        <td className="px-4 py-3">
                          {approved ? (
                            <span className="inline-flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#ECFDF5] text-[#18794E] border border-[#A7F3D0]">
                                <CheckCircle2 className="w-3 h-3" /> CERTIFIED
                              </span>
                              <span className="text-[10px] text-[#5A6A7E]">
                                valid till {new Date(approved.validUntil).toLocaleDateString('en-IN')}
                              </span>
                            </span>
                          ) : pending ? (
                            <span className="inline-flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEFCE8] text-[#A16207] border border-[#FEF08A]">
                                <Clock className="w-3 h-3" /> AWAITING COMPLIANCE
                              </span>
                              <span className="text-[10px] text-[#5A6A7E]">
                                {pending.proposedBy === myId ? 'proposed by you' : `proposed by ${pending.proposedBy}`}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#1F5A7A] border border-[#BFDBFE]">
                              <FileCheck className="w-3 h-3" /> READY FOR VALUATION
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openProposeForAsset(a)}
                            disabled={blocked}
                            title={blocked ? 'A proposal is already pending for this asset — one pending proposal per asset' : 'Define a valuation for this asset'}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0F2A43] hover:bg-[#1F5A7A] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[11px] font-semibold transition"
                          >
                            Define Valuation <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Valuer: my proposals with pipeline stage ─── */}
      {isValuer && (
        <div className="bg-white border border-[#D8E0E8] rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-[#D8E0E8] bg-[#F8FAFC]">
            <h3 className="text-xs font-bold text-[#0F2A43] uppercase tracking-wider">
              My Valuation Proposals ({myProposals.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#D8E0E8] text-[#5A6A7E] uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Valuation ID</th>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Pipeline Stage</th>
                  <th className="px-4 py-3">Valid Until</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E0E8] text-[#17202A]">
                {loading ? (
                  <tr><td colSpan="6" className="p-8 text-center text-[#5A6A7E]">Loading your proposals...</td></tr>
                ) : myProposals.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-[#5A6A7E]">You have not defined any valuations yet. Pick a verified asset above to start.</td></tr>
                ) : (
                  myProposals.map((v) => (
                    <tr key={v.id} className="hover:bg-[#F8FAFC] transition">
                      <td className="px-4 py-3 font-mono font-bold text-[#0F2A43]">{v.id}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-[#1F5A7A]">{v.assetId}</td>
                      <td className="px-4 py-3 font-bold">₹{((v.amountPaise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F0F4F8] text-[#1F5A7A] border border-[#D8E0E8]">
                          {v.method}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          {renderValuationStatus(v)}
                          <span className="text-[10px] text-[#5A6A7E]">
                            {v.status === 'PROPOSED' && '→ awaiting compliance certification'}
                            {v.status === 'APPROVED' && !isStale(v) && '→ asset VALUED, minting unlocked'}
                            {isStale(v) && '→ expired, define a fresh valuation'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#5A6A7E]">
                        {v.validUntil ? new Date(v.validUntil).toLocaleDateString('en-IN') : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Compliance / Auditor: full certification queue (unchanged flow) ─── */}
      {!isValuer && (
        <div className="bg-white border border-[#D8E0E8] rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#D8E0E8] text-[#5A6A7E] uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Valuation ID</th>
                  <th className="px-4 py-3">Target Asset</th>
                  <th className="px-4 py-3">Certified Amount</th>
                  <th className="px-4 py-3">Methodology</th>
                  <th className="px-4 py-3">Proposed By</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Valid Until</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E0E8] text-[#17202A]">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-[#5A6A7E]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1F5A7A]" />
                      Loading valuations from ledger state...
                    </td>
                  </tr>
                ) : valuations.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-[#5A6A7E]">
                      No certified valuation records exist on ledger yet.
                    </td>
                  </tr>
                ) : (
                  valuations.map((v) => {
                    const amountInRupees = (v.amountPaise || 0) / 100;
                    const isApproved = v.status === 'APPROVED' && !isStale(v);
                    const isPending = v.status === 'PROPOSED';
                    // Compliance officer can approve only proposals NOT submitted by themselves
                    const canApproveThis = canApprove && isPending;

                    return (
                      <tr key={v.id} className="hover:bg-[#F8FAFC] transition">
                        <td className="px-4 py-3 font-mono font-bold text-[#0F2A43]">{v.id}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-[#1F5A7A]">{v.assetId}</td>
                        <td className="px-4 py-3 font-bold text-[#17202A]">
                          ₹{amountInRupees.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F0F4F8] text-[#1F5A7A] border border-[#D8E0E8]">
                            {v.method}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#5A6A7E] font-mono text-[11px]">{v.proposedBy || 'Independent Appraiser'}</td>
                        <td className="px-4 py-3">{renderValuationStatus(v)}</td>
                        <td className="px-4 py-3 text-[#5A6A7E]">
                          {v.validUntil ? new Date(v.validUntil).toLocaleDateString('en-IN') : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canApproveThis ? (
                            <button
                              onClick={() => setApproveTarget(v)}
                              className="px-2.5 py-1 bg-[#18794E] hover:bg-[#146441] text-white rounded text-[11px] font-semibold transition"
                            >
                              Certify &amp; Approve
                            </button>
                          ) : isApproved ? (
                            <span className="text-[#5A6A7E] text-[11px] flex items-center gap-1 justify-end">
                              <CheckCircle2 className="w-3 h-3 text-[#18794E]" />
                              Certified
                            </span>
                          ) : (
                            <span className="text-[#A16207] text-[11px]">Awaiting Compliance</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Define Valuation Modal (valuer) */}
      {showProposeModal && (
        <div className="fixed inset-0 z-50 bg-[#0F2A43]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E0E8] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#D8E0E8]">
              <h3 className="text-sm font-bold text-[#0F2A43]">Define Valuation</h3>
              <button
                onClick={closePropose}
                className="p-1 hover:bg-[#F0F4F8] rounded text-[#5A6A7E] transition"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#5A6A7E]">
              Appraise a verified asset to establish authorized NAV. Certification by Compliance moves the asset to VALUED and unlocks token minting.
            </p>
            <form onSubmit={handlePropose} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Verified Asset *</label>
                <select
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono bg-white focus:outline-none focus:border-[#1F5A7A]"
                  required
                >
                  <option value="">Select a verified asset...</option>
                  {verifiedAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id} — {a.displayName || a.typeKey}
                    </option>
                  ))}
                </select>
                {assetTypeError && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#B42318]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {assetTypeError}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">Currency</label>
                  <div className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg bg-[#F8FAFC] text-[#5A6A7E]">INR (₹)</div>
                </div>
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">Amount (in Paise)</label>
                  <input
                    type="number"
                    value={amountPaise}
                    onChange={(e) => setAmountPaise(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono focus:outline-none focus:border-[#1F5A7A]"
                    required
                  />
                  <div className="text-[10px] text-[#5A6A7E] mt-0.5">
                    = ₹{(Number(amountPaise) / 100).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Valuation Method *</label>
                <select
                  value={methodology}
                  onChange={(e) => setMethodology(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg bg-white focus:outline-none focus:border-[#1F5A7A]"
                  disabled={allowedMethods.length === 0}
                  required
                >
                  {allowedMethods.length === 0 && <option value="">Select an asset above to load allowed methods</option>}
                  {allowedMethods.map((method) => (
                    <option key={method} value={method}>{method.replaceAll('_', ' ')}</option>
                  ))}
                </select>
                {allowedMethods.length > 0 && (
                  <div className="text-[10px] text-[#5A6A7E] mt-0.5">
                    Methods governed by the asset-type schema
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Financial Model IPFS URI</label>
                <input
                  type="text"
                  value={modelUri}
                  onChange={(e) => setModelUri(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono text-[11px] focus:outline-none focus:border-[#1F5A7A]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">
                  Validity Period (Days, max: {validityLimit})
                </label>
                <input
                  type="number"
                  value={validDays}
                  onChange={(e) => setValidDays(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg focus:outline-none focus:border-[#1F5A7A]"
                  min="1"
                  max={validityLimit}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closePropose}
                  className="px-4 py-2 border border-[#D8E0E8] rounded-lg text-[#5A6A7E] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || allowedMethods.length === 0 || !!assetTypeError}
                  className="px-4 py-2 bg-[#0F2A43] text-white rounded-lg font-semibold hover:bg-[#1F5A7A] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Sign & Propose'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(approveTarget)}
        title="Certify &amp; Approve Valuation"
        message={`Certify valuation ${approveTarget?.id} for asset ${approveTarget?.assetId} at ₹${approveTarget ? (approveTarget.amountPaise / 100).toLocaleString('en-IN') : ''}? This will unlock token minting for the asset under compliance sign-off.`}
        confirmLabel={approving ? 'Certifying...' : 'Certify & Approve'}
        onConfirm={handleApproveConfirmed}
        onCancel={() => setApproveTarget(null)}
        variant="default"
      />
    </div>
  );
}
