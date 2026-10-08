import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { useToast } from '../../shared/components/Toast.jsx';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog.jsx';
import {
  TrendingUp,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

export function ValuationView() {
  const { user } = useAuth();
  const toast = useToast();

  const [valuations, setValuations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Approve confirmation dialog
  const [approveTarget, setApproveTarget] = useState(null);
  const [approving, setApproving] = useState(false);

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

  const loadValuations = async () => {
    try {
      setLoading(true);
      const res = await api.getValuations();
      setValuations(res.data || []);
    } catch (err) {
      console.error('Failed to load valuations:', err);
      toast.error('Failed to load valuations from ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadValuations();
  }, []);

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
      setShowProposeModal(false);
      setAssetId('');
      toast.success('Valuation proposal submitted successfully. Awaiting Compliance Officer certification.');
      await loadValuations();
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
      await loadValuations();
    } catch (err) {
      toast.error(err.message || 'Failed to certify valuation.');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
            onClick={loadValuations}
            disabled={loading}
            className="p-2 border border-[#D8E0E8] rounded-lg text-[#5A6A7E] hover:bg-[#F8FAFC] transition"
            title="Refresh valuations"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
          </button>

          {isValuer && (
            <button
              onClick={() => setShowProposeModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F2A43] hover:bg-[#1F5A7A] text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              Propose Valuation
            </button>
          )}
        </div>
      </div>

      {/* SoD Notice for Valuer */}
      {isValuer && (
        <div className="flex items-start gap-2.5 p-3.5 bg-[#F0F4F8] border border-[#D8E0E8] rounded-xl text-xs text-[#5A6A7E]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#1F5A7A]" />
          <span>
            <strong className="text-[#0F2A43]">Segregation of Duties:</strong> As a Valuer, you may propose valuations but
            cannot self-certify them. A Compliance Officer must independently approve before minting is unlocked.
          </span>
        </div>
      )}

      {/* Valuations Table */}
      <div className="bg-white border border-[#D8E0E8] rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#D8E0E8] text-[#5A6A7E] uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Valuation ID</th>
                <th className="px-4 py-3">Target Asset</th>
                <th className="px-4 py-3">Certified Amount</th>
                <th className="px-4 py-3">Methodology</th>
                <th className="px-4 py-3">Valuer</th>
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
                  const isApproved = v.status === 'APPROVED';
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
                      <td className="px-4 py-3 text-[#5A6A7E]">{v.valuerId || 'Independent Appraiser'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isApproved
                              ? 'bg-[#ECFDF5] text-[#18794E] border-[#A7F3D0]'
                              : 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]'
                          }`}
                        >
                          {isApproved ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {v.status}
                        </span>
                      </td>
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

      {/* Propose Valuation Modal */}
      {showProposeModal && (
        <div className="fixed inset-0 z-50 bg-[#0F2A43]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E0E8] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#D8E0E8]">
              <h3 className="text-sm font-bold text-[#0F2A43]">Submit Certified Valuation Proposal</h3>
              <button
                onClick={() => setShowProposeModal(false)}
                className="p-1 hover:bg-[#F0F4F8] rounded text-[#5A6A7E] transition"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#5A6A7E]">
              Appraise verified underlying asset to establish authorized NAV for token issuance.
            </p>
            <form onSubmit={handlePropose} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Target Asset ID *</label>
                <input
                  type="text"
                  placeholder="e.g. ASSET-IN-BLR-001"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono focus:outline-none focus:border-[#1F5A7A]"
                  required
                />
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
                <label className="block text-[#5A6A7E] font-medium mb-1">Methodology</label>
                <select
                  value={methodology}
                  onChange={(e) => setMethodology(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg bg-white focus:outline-none focus:border-[#1F5A7A]"
                  disabled={allowedMethods.length === 0}
                  required
                >
                  {allowedMethods.length === 0 && <option value="">Enter asset ID above to load methods</option>}
                  {allowedMethods.map((method) => (
                    <option key={method} value={method}>{method.replaceAll('_', ' ')}</option>
                  ))}
                </select>
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
                  onClick={() => { setShowProposeModal(false); setAssetId(''); }}
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
