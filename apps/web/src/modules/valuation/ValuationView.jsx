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
  PROPOSED: 'bg-trust-warning-bg text-trust-warning border-trust-warning-border',
  APPROVED: 'bg-[#ECFDF5] text-trust-success border-[#A7F3D0]',
  REJECTED: 'bg-trust-error-bg text-trust-error border-[#FECACA]',
  SUPERSEDED: 'bg-slate-100 text-trust-text-muted border-trust-border',
  EXPIRED: 'bg-trust-error-bg text-trust-error border-[#FECACA]',
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

  // Indication engine state (read-only compute, fills the form on accept)
  const [indicationInputsText, setIndicationInputsText] = useState('{}');
  const [indication, setIndication] = useState(null);
  const [indicating, setIndicating] = useState(false);

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

  const selectedAsset = useMemo(
    () => assets.find((a) => a.id === assetId) || null,
    [assets, assetId]
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
    setIndication(null);
    setIndicationInputsText('{}');
  };

  const handleComputeIndication = async () => {
    if (!assetId.trim() || !methodology) {
      toast.error('Select a verified asset and method first.');
      return;
    }
    let extra = {};
    if (indicationInputsText.trim() !== '' && indicationInputsText.trim() !== '{}') {
      try {
        extra = JSON.parse(indicationInputsText);
      } catch {
        toast.error('Method inputs are not valid JSON.');
        return;
      }
    }
    try {
      setIndicating(true);
      const res = await api.getValuationIndication(assetId.trim(), methodology, extra);
      setIndication(res.data || null);
    } catch (err) {
      setIndication(null);
      toast.error(err.message || 'Indication failed.');
    } finally {
      setIndicating(false);
    }
  };

  const handleUseIndication = () => {
    if (!indication) return;
    setAmountPaise(indication.recommendedPaise);
    toast.success('Indication accepted — amount filled. Review and sign to propose.');
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
        methodDetails: { ...(indication?.suggestedMethodDetails || {}), financialModelUri: modelUri },
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
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${pill}`}>
        {v.status === 'APPROVED' && !stale ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
        {stale && v.status !== 'EXPIRED' ? 'EXPIRED' : v.status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header — compliance / auditor only; valuer works straight from the queue below */}
      {!isValuer && (
        <div className="page-header">
          <div>
            <h2 className="page-title">
              Valuation &amp; Pricing Desk
            </h2>
            <p className="page-subtitle">
              Certified institutional appraisals, discounted cash flows, and NAV determinations before token issuance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="trust-btn-secondary !px-2.5"
              title="Refresh desk"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-trust-accent' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* ─── Valuer: pipeline counters ─── */}
      {isValuer && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white border border-trust-border rounded-lg shadow-subtle">
            <span className="text-xs font-medium text-trust-text-muted">Verified Assets Awaiting You</span>
            <p className="text-2xl font-semibold tabular-nums text-trust-primary mt-2">{loading ? '—' : awaitingCount}</p>
            <p className="text-xs text-trust-text-muted mt-1">No pending or certified valuation yet</p>
          </div>
          <div className="p-4 bg-white border border-trust-border rounded-lg shadow-subtle">
            <span className="text-xs font-medium text-trust-text-muted">My Pending Proposals</span>
            <p className="text-2xl font-semibold tabular-nums text-trust-primary mt-2">{loading ? '—' : myPendingCount}</p>
            <p className="text-xs text-trust-text-muted mt-1">With compliance officers</p>
          </div>
          <div className="p-4 bg-white border border-trust-border rounded-lg shadow-subtle">
            <span className="text-xs font-medium text-trust-text-muted">My Certified Valuations</span>
            <p className="text-2xl font-semibold tabular-nums text-trust-primary mt-2">{loading ? '—' : myCertifiedCount}</p>
            <p className="text-xs text-trust-text-muted mt-1">Approved NAV on ledger</p>
          </div>
        </div>
      )}

      {/* ─── Valuer: verified-asset queue ─── */}
      {isValuer && (
        <div className="bg-white border border-trust-border rounded-lg overflow-hidden shadow-subtle">
          <div className="p-4 border-b border-trust-border bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-trust-primary flex items-center gap-2">
              <Layers className="w-4 h-4 text-trust-secondary" />
              Verified Assets — Ready for Valuation ({filteredQueue.length})
            </h3>
            <div className="relative sm:min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-trust-text-subtle" />
              <input
                type="text"
                placeholder="Search asset ID, name, type..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="trust-input w-full pl-8 pr-3"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-slate-50 border-b border-trust-border text-trust-text-muted font-medium text-xs">
                <tr>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Jurisdiction</th>
                  <th className="px-4 py-3">Evidence</th>
                  <th className="px-4 py-3">Valuation State</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-trust-border text-trust-text">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-trust-text-muted">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-trust-secondary" />
                      Loading verified assets from ledger...
                    </td>
                  </tr>
                ) : filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-trust-text-muted">
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
                        className={`transition ${blocked ? '' : 'cursor-pointer hover:bg-slate-50'}`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-trust-primary">{a.displayName || a.id}</div>
                          <div className="font-mono text-xs text-trust-text-muted flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span>{a.id}</span>
                            {a.attributes?.surveyNumber && <span>• Survey: {a.attributes.surveyNumber}</span>}
                            {a.attributes?.registrationNumber && <span>• Reg: {a.attributes.registrationNumber}</span>}
                            {a.attributes?.areaSqMeters && <span>• {Number(a.attributes.areaSqMeters).toLocaleString()} sqm</span>}
                            {a.attributes?.builtUpSqFt && <span>• {Number(a.attributes.builtUpSqFt).toLocaleString()} sqft</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 text-trust-secondary border border-trust-border">
                            {a.typeKey}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-trust-text-muted">{a.jurisdiction || 'IN'}</td>
                        <td className="px-4 py-3 text-trust-text-muted">{evidenceCount} doc{evidenceCount === 1 ? '' : 's'}</td>
                        <td className="px-4 py-3">
                          {approved ? (
                            <span className="inline-flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#ECFDF5] text-trust-success border border-[#A7F3D0]">
                                <CheckCircle2 className="w-3 h-3" /> CERTIFIED
                              </span>
                              <span className="text-xs text-trust-text-muted">
                                valid till {new Date(approved.validUntil).toLocaleDateString('en-IN')}
                              </span>
                            </span>
                          ) : pending ? (
                            <span className="inline-flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-trust-warning-bg text-trust-warning border border-trust-warning-border">
                                <Clock className="w-3 h-3" /> AWAITING COMPLIANCE
                              </span>
                              <span className="text-xs text-trust-text-muted">
                                {pending.proposedBy === myId ? 'proposed by you' : `proposed by ${pending.proposedBy}`}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#EFF6FF] text-trust-secondary border border-[#BFDBFE]">
                              <FileCheck className="w-3 h-3" /> READY FOR VALUATION
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openProposeForAsset(a)}
                            disabled={blocked}
                            title={blocked ? 'A proposal is already pending for this asset — one pending proposal per asset' : 'Define a valuation for this asset'}
                            className="trust-btn-primary"
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
        <div className="bg-white border border-trust-border rounded-lg overflow-hidden shadow-subtle">
          <div className="p-4 border-b border-trust-border bg-slate-50">
            <h3 className="text-xs font-semibold text-trust-primary">
              My Valuation Proposals ({myProposals.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-slate-50 border-b border-trust-border text-trust-text-muted font-medium text-xs">
                <tr>
                  <th className="px-4 py-3">Valuation ID</th>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Pipeline Stage</th>
                  <th className="px-4 py-3">Valid Until</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-trust-border text-trust-text">
                {loading ? (
                  <tr><td colSpan="6" className="p-8 text-center text-trust-text-muted">Loading your proposals...</td></tr>
                ) : myProposals.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-trust-text-muted">You have not defined any valuations yet. Pick a verified asset above to start.</td></tr>
                ) : (
                  myProposals.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono font-semibold text-trust-primary">{v.id}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-trust-secondary">{v.assetId}</td>
                      <td className="px-4 py-3 font-semibold">₹{((v.amountPaise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-trust-secondary border border-trust-border">
                          {v.method}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          {renderValuationStatus(v)}
                          <span className="text-xs text-trust-text-muted">
                            {v.status === 'PROPOSED' && '→ awaiting compliance certification'}
                            {v.status === 'APPROVED' && !isStale(v) && '→ asset VALUED, minting unlocked'}
                            {isStale(v) && '→ expired, define a fresh valuation'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-trust-text-muted">
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
        <div className="bg-white border border-trust-border rounded-lg overflow-hidden shadow-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-slate-50 border-b border-trust-border text-trust-text-muted font-medium text-xs">
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
              <tbody className="divide-y divide-trust-border text-trust-text">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-trust-text-muted">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-trust-secondary" />
                      Loading valuations from ledger state...
                    </td>
                  </tr>
                ) : valuations.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-trust-text-muted">
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
                      <tr key={v.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-mono font-semibold text-trust-primary">{v.id}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-trust-secondary">{v.assetId}</td>
                        <td className="px-4 py-3 font-semibold text-trust-text">
                          ₹{amountInRupees.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-trust-secondary border border-trust-border">
                            {v.method}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-trust-text-muted font-mono text-xs">{v.proposedBy || 'Independent Appraiser'}</td>
                        <td className="px-4 py-3">{renderValuationStatus(v)}</td>
                        <td className="px-4 py-3 text-trust-text-muted">
                          {v.validUntil ? new Date(v.validUntil).toLocaleDateString('en-IN') : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canApproveThis ? (
                            <button
                              onClick={() => setApproveTarget(v)}
                              className="px-2.5 py-1 bg-trust-success hover:bg-[#146441] text-white rounded text-xs font-semibold transition"
                            >
                              Certify &amp; Approve
                            </button>
                          ) : isApproved ? (
                            <span className="text-trust-text-muted text-xs flex items-center gap-1 justify-end">
                              <CheckCircle2 className="w-3 h-3 text-trust-success" />
                              Certified
                            </span>
                          ) : (
                            <span className="text-trust-warning text-xs">Awaiting Compliance</span>
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-trust-border rounded-lg max-w-lg w-full p-6 shadow-popover space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-trust-border">
              <h3 className="text-sm font-semibold text-trust-primary">Define Valuation</h3>
              <button
                onClick={closePropose}
                className="p-1 hover:bg-slate-100 rounded text-trust-text-muted transition"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-trust-text-muted">
              Appraise a verified asset to establish authorized NAV. Certification by Compliance moves the asset to VALUED and unlocks token minting.
            </p>
            <form onSubmit={handlePropose} className="space-y-3 text-xs">
              <div>
                <label className="block text-trust-text-muted font-medium mb-1">Verified Asset *</label>
                <select
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="trust-input w-full font-mono"
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
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-trust-error">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {assetTypeError}
                  </div>
                )}
                {selectedAsset && (
                  <div className="p-3 bg-slate-50 border border-trust-border rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-trust-primary font-semibold">
                      <span>{selectedAsset.displayName || selectedAsset.id}</span>
                      <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-[#ECFDF5] text-trust-success border border-[#A7F3D0]">
                        Verified Evidence Anchored
                      </span>
                    </div>
                    <div className="text-xs text-trust-text-muted flex flex-wrap gap-x-3 gap-y-1 font-mono">
                      {selectedAsset.attributes?.surveyNumber && (
                        <span>Survey: {selectedAsset.attributes.surveyNumber}</span>
                      )}
                      {selectedAsset.attributes?.district && (
                        <span>District: {selectedAsset.attributes.district}</span>
                      )}
                      {selectedAsset.attributes?.areaSqMeters && (
                        <span>Area: {Number(selectedAsset.attributes.areaSqMeters).toLocaleString()} sqm</span>
                      )}
                      {selectedAsset.attributes?.builtUpSqFt && (
                        <span>Built-up: {Number(selectedAsset.attributes.builtUpSqFt).toLocaleString()} sqft</span>
                      )}
                      {selectedAsset.attributes?.registrationNumber && (
                        <span>Reg No: {selectedAsset.attributes.registrationNumber}</span>
                      )}
                      {selectedAsset.attributes?.make && (
                        <span>Make: {selectedAsset.attributes.make}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-trust-text-muted font-medium mb-1">Currency</label>
                  <div className="w-full px-3 py-2 border border-trust-border rounded-lg bg-slate-50 text-trust-text-muted">INR (₹)</div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-trust-text-muted font-medium">Amount (in Paise)</label>
                    {selectedAsset && (
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedAsset.typeKey === 'LAND') {
                            setAmountPaise(500000000);
                          } else if (selectedAsset.typeKey === 'VEHICLE') {
                            setAmountPaise(75000000);
                          } else if (selectedAsset.typeKey === 'REAL_ESTATE') {
                            setAmountPaise(150000000);
                          }
                        }}
                        className="text-xs text-trust-secondary hover:underline font-semibold cursor-pointer"
                        title="Populate authorized benchmark rate"
                      >
                        Apply Benchmark
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    value={amountPaise}
                    onChange={(e) => setAmountPaise(e.target.value)}
                    className="trust-input w-full font-mono"
                    required
                  />
                  <div className="text-xs text-trust-text-muted mt-0.5">
                    = ₹{(Number(amountPaise) / 100).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-trust-text-muted font-medium mb-1">Valuation Method *</label>
                <select
                  value={methodology}
                  onChange={(e) => setMethodology(e.target.value)}
                  className="trust-input w-full"
                  disabled={allowedMethods.length === 0}
                  required
                >
                  {allowedMethods.length === 0 && <option value="">Select an asset above to load allowed methods</option>}
                  {allowedMethods.map((method) => (
                    <option key={method} value={method}>{method.replaceAll('_', ' ')}</option>
                  ))}
                </select>
                {allowedMethods.length > 0 && (
                  <div className="text-xs text-trust-text-muted mt-0.5">
                    Methods governed by the asset-type schema
                  </div>
                )}
              </div>

              {/* Indication engine: deterministic benchmark, valuer decides */}
              <div className="p-3 bg-slate-50 border border-trust-border rounded-lg space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-trust-primary">Indication Engine</span>
                  <button
                    type="button"
                    onClick={handleComputeIndication}
                    disabled={indicating || !methodology || !assetId.trim()}
                    className="trust-btn-secondary"
                  >
                    {indicating ? 'Computing...' : 'Compute Indication'}
                  </button>
                </div>
                <textarea
                  rows="2"
                  value={indicationInputsText}
                  onChange={(e) => setIndicationInputsText(e.target.value)}
                  placeholder='Method inputs, e.g. {"ratePerSqM": 600, "rateSource": "Kaveri guidance 2024-25"}'
                  className="trust-input w-full font-mono"
                />
                <div className="text-xs text-trust-text-muted">
                  Closed-form methods only (discount, depreciation, mandi, circle-rate, cap-rate). Open methods need your judgment.
                </div>
                {indication && (
                  <div className="p-2.5 bg-white border border-trust-border rounded-lg space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-trust-success">
                        ₹{(indication.recommendedPaise / 100).toLocaleString('en-IN')} <span className="font-medium text-trust-text-muted">indicated</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleUseIndication}
                        className="px-2.5 py-1 bg-trust-success hover:bg-[#146441] text-white rounded-lg text-xs font-semibold transition"
                      >
                        Use This Amount
                      </button>
                    </div>
                    <div className="text-xs text-trust-text-muted">
                      Range ₹{(indication.indicatedLowPaise / 100).toLocaleString('en-IN')} – ₹{(indication.indicatedHighPaise / 100).toLocaleString('en-IN')}
                      {' '}• {indication.method} • hash <span className="font-mono">{indication.indicationHash?.slice(0, 12)}…</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-trust-text-muted font-medium mb-1">Financial Model IPFS URI</label>
                <input
                  type="text"
                  value={modelUri}
                  onChange={(e) => setModelUri(e.target.value)}
                  className="trust-input w-full font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-trust-text-muted font-medium mb-1">
                  Validity Period (Days, max: {validityLimit})
                </label>
                <input
                  type="number"
                  value={validDays}
                  onChange={(e) => setValidDays(e.target.value)}
                  className="trust-input w-full"
                  min="1"
                  max={validityLimit}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closePropose}
                  className="px-4 py-2 border border-trust-border rounded-lg text-trust-text-muted hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || allowedMethods.length === 0 || !!assetTypeError}
                  className="trust-btn-primary"
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
