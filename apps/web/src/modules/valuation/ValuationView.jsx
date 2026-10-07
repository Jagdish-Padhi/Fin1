import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import {
  TrendingUp,
  PlusCircle,
} from 'lucide-react';

export function ValuationView() {
  const { user } = useAuth();
  const [valuations, setValuations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [assetId, setAssetId] = useState('');
  const [amountPaise, setAmountPaise] = useState(500000000); // 50 Lakhs default
  const [methodology, setMethodology] = useState('');
  const [modelUri, setModelUri] = useState('ipfs://QmValuationModel2026');
  const [validDays, setValidDays] = useState(90);
  const [validityLimit, setValidityLimit] = useState(90);
  const [allowedMethods, setAllowedMethods] = useState([]);
  const [assetTypeError, setAssetTypeError] = useState('');

  const isValuer = user?.role === 'VALUER';
  const canApprove = user?.role === 'COMPLIANCE' || user?.role === 'VALUER';

  const loadValuations = async () => {
    try {
      setLoading(true);
      const res = await api.getValuations();
      setValuations(res.data || []);
    } catch (err) {
      console.error('Failed to load valuations:', err);
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
        if (asset.status !== 'VERIFIED') throw new Error('Asset must be VERIFIED before valuation.');

        const typeResponse = await api.getAssetType(asset.typeKey, asset.typeVersion || 1);
        const methods = typeResponse.data?.valuation?.methods || [];
        if (methods.length === 0) throw new Error('This asset type has no configured valuation methods.');

        if (!active) return;
        const maxDays = typeResponse.data.valuation.validityDays || 90;
        setAllowedMethods(methods);
        setValidityLimit(maxDays);
        setMethodology((current) => methods.includes(current) ? current : methods[0]);
        setValidDays((current) => Math.min(Number(current) || maxDays, maxDays));
      } catch (err) {
        if (active) {
          setAllowedMethods([]);
          setAssetTypeError(err.message || 'Unable to load valuation rules for this asset.');
        }
      }
    };

    loadAssetValuationRules();
    return () => {
      active = false;
    };
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
      await loadValuations();
    } catch (err) {
      alert(err.message || 'Failed to submit valuation proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (valuationId) => {
    if (!confirm('Certify and approve this valuation under regulatory compliance?')) return;
    try {
      await api.approveValuation(valuationId);
      await loadValuations();
    } catch (err) {
      alert(err.message || 'Failed to approve valuation');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D8E0E8]">
        <div>
          <h2 className="text-xl font-bold text-[#0F2A43] flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#1F5A7A]" />
            Valuation & Pricing Desk
          </h2>
          <p className="text-xs text-[#5A6A7E] mt-1">
            Certified institutional appraisals, discounted cash flows, and NAV determinations before token issuance.
          </p>
        </div>

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

      {/* Valuations Table */}
      <div className="bg-white border border-[#D8E0E8] rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#D8E0E8] text-[#5A6A7E] uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Valuation ID</th>
                <th className="px-4 py-3">Target Asset</th>
                <th className="px-4 py-3">Certified Amount</th>
                <th className="px-4 py-3">Methodology</th>
                <th className="px-4 py-3">Valuer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Validity</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8E0E8] text-[#17202A]">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-[#5A6A7E]">
                    Loading valuations on ledger...
                  </td>
                </tr>
              ) : valuations.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-[#5A6A7E]">
                    No valuation records registered yet.
                  </td>
                </tr>
              ) : (
                valuations.map((v) => {
                  const amountInRupees = (v.amountPaise || 0) / 100;
                  const isApproved = v.status === 'APPROVED';
                  return (
                    <tr key={v.id} className="hover:bg-[#F8FAFC] transition">
                      <td className="px-4 py-3 font-mono font-bold text-[#0F2A43]">{v.id}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-[#1F5A7A]">{v.assetId}</td>
                      <td className="px-4 py-3 font-bold text-[#17202A]">
                        {v.currency} {amountInRupees.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F0F4F8] text-[#1F5A7A] border border-[#D8E0E8]">
                          {v.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#5A6A7E]">{v.valuerId || 'Independent Appraiser'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isApproved
                              ? 'bg-[#ECFDF5] text-[#18794E] border-[#A7F3D0]'
                              : 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]'
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#5A6A7E]">
                        {v.validUntil ? new Date(v.validUntil).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canApprove && v.status === 'PROPOSED' && v.proposedBy !== user?.userId ? (
                          <button
                            onClick={() => handleApprove(v.id)}
                            className="px-2.5 py-1 bg-[#18794E] hover:bg-[#146441] text-white rounded text-[11px] font-semibold transition"
                          >
                            Approve
                          </button>
                        ) : (
                          <span className="text-[#5A6A7E] text-[11px]">Certified</span>
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
        <div className="fixed inset-0 z-50 bg-[#0F2A43]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E0E8] rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-[#0F2A43]">Submit Certified Valuation Proposal</h3>
            <form onSubmit={handlePropose} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Target Asset ID</label>
                <input
                  type="text"
                  placeholder="e.g. ASSET-IN-BLR-001"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">Currency</label>
                  <div className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg bg-[#F8FAFC]">INR (₹)</div>
                </div>
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">Amount (in Paise)</label>
                  <input
                    type="number"
                    value={amountPaise}
                    onChange={(e) => setAmountPaise(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono"
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
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg bg-white"
                  disabled={allowedMethods.length === 0}
                  required
                >
                  {allowedMethods.map((method) => (
                    <option key={method} value={method}>{method.replaceAll('_', ' ')}</option>
                  ))}
                </select>
                {assetTypeError && <p className="mt-1 text-[10px] text-red-700">{assetTypeError}</p>}
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Financial Model IPFS URI</label>
                <input
                  type="text"
                  value={modelUri}
                  onChange={(e) => setModelUri(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono text-[11px]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Validity (Days)</label>
                <input
                  type="number"
                  value={validDays}
                  onChange={(e) => setValidDays(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg"
                  min="1"
                  max={validityLimit}
                  required
                />
                <p className="mt-1 text-[10px] text-[#5A6A7E]">Maximum for this asset type: {validityLimit} days</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProposeModal(false)}
                  className="px-4 py-2 border border-[#D8E0E8] rounded-lg text-[#5A6A7E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || allowedMethods.length === 0 || !!assetTypeError}
                  className="px-4 py-2 bg-[#0F2A43] text-white rounded-lg font-semibold hover:bg-[#1F5A7A]"
                >
                  {submitting ? 'Submitting...' : 'Sign & Propose'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
