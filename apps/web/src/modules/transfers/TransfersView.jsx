import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import {
  ArrowRightLeft,
  PlusCircle,
  Play,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export function TransfersView() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [tokenId, setTokenId] = useState('');
  const [fromHolder, setFromHolder] = useState('PARTICIPANT-ISSUER-001');
  const [toHolder, setToHolder] = useState('PARTICIPANT-INVESTOR-001');
  const [amount, setAmount] = useState(100);
  const [purpose, setPurpose] = useState('SECONDARY_TRADE');

  // Rule Evaluation test state
  const [evalResult, setEvalResult] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  const canPropose = user?.role === 'ISSUER' || user?.role === 'INVESTOR';
  const canExecute = user?.role === 'COMPLIANCE' || user?.role === 'ADMINISTRATOR' || user?.role === 'INVESTOR';

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const res = await api.getTransfers();
      setTransfers(res.data || []);
    } catch (err) {
      console.error('Failed to load transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, []);

  const handleEvaluateRules = async () => {
    try {
      setEvaluating(true);
      const res = await api.evaluateTransfer({
        tokenId,
        fromHolder,
        toHolder,
        amount: Number(amount),
      });
      setEvalResult(res.data);
    } catch (err) {
      alert(err.message || 'Evaluation error');
    } finally {
      setEvaluating(false);
    }
  };

  const handlePropose = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.proposeTransfer({
        tokenId,
        fromHolder,
        toHolder,
        amount: Number(amount),
        purpose,
      });
      setShowProposeModal(false);
      await loadTransfers();
    } catch (err) {
      alert(err.message || 'Transfer proposal failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecute = async (transferId) => {
    if (!confirm('Execute atomic on-chain settlement for this transfer?')) return;
    try {
      await api.executeTransfer(transferId);
      await loadTransfers();
    } catch (err) {
      alert(err.message || 'Transfer execution failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D8E0E8]">
        <div>
          <h2 className="text-xl font-bold text-[#0F2A43] flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-[#1F5A7A]" />
            Settlement & Transfer Rule Engine
          </h2>
          <p className="text-xs text-[#5A6A7E] mt-1">
            Automated compliance evaluation (KYC, jurisdiction, concentration caps, lockups) and atomic on-chain settlement.
          </p>
        </div>

        {canPropose && (
          <button
            onClick={() => {
              setEvalResult(null);
              setShowProposeModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F2A43] hover:bg-[#1F5A7A] text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            Propose Transfer
          </button>
        )}
      </div>

      {/* Transfers Table */}
      <div className="bg-white border border-[#D8E0E8] rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#D8E0E8] text-[#5A6A7E] uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Transfer ID</th>
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3">From Holder</th>
                <th className="px-4 py-3">To Holder</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Compliance Status</th>
                <th className="px-4 py-3">Settlement</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8E0E8] text-[#17202A]">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-[#5A6A7E]">
                    Loading transfer operations...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-[#5A6A7E]">
                    No transfer transactions recorded on ledger yet.
                  </td>
                </tr>
              ) : (
                transfers.map((t) => {
                  const isExecuted = t.status === 'EXECUTED';
                  return (
                    <tr key={t.id} className="hover:bg-[#F8FAFC] transition">
                      <td className="px-4 py-3 font-mono font-bold text-[#0F2A43]">{t.id}</td>
                      <td className="px-4 py-3 font-mono text-[#1F5A7A]">{t.tokenId}</td>
                      <td className="px-4 py-3 font-mono text-xs">{t.fromHolder}</td>
                      <td className="px-4 py-3 font-mono text-xs">{t.toHolder}</td>
                      <td className="px-4 py-3 font-bold font-mono">
                        {Number(t.amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#ECFDF5] text-[#18794E] border border-[#A7F3D0]">
                          PASSED
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isExecuted
                              ? 'bg-[#F0FDF4] text-[#18794E] border-[#BBF7D0]'
                              : 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]'
                          }`}
                        >
                          {t.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canExecute && !isExecuted ? (
                          <button
                            onClick={() => handleExecute(t.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0F2A43] hover:bg-[#1F5A7A] text-white rounded text-[11px] font-semibold transition"
                          >
                            <Play className="w-3 h-3" />
                            Execute
                          </button>
                        ) : (
                          <span className="text-[#5A6A7E] text-[11px]">Settled</span>
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

      {/* Propose Transfer Modal with Real-time Rule Simulation */}
      {showProposeModal && (
        <div className="fixed inset-0 z-50 bg-[#0F2A43]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E0E8] rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-[#0F2A43]">Propose Security Token Transfer</h3>
            <p className="text-xs text-[#5A6A7E]">
              Evaluated against on-chain smart rules before atomic settlement execution.
            </p>

            <form onSubmit={handlePropose} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Security Token ID</label>
                <input
                  type="text"
                  placeholder="e.g. TOKEN-BLR-001"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">From Holder ID</label>
                  <input
                    type="text"
                    value={fromHolder}
                    onChange={(e) => setFromHolder(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">To Recipient ID</label>
                  <input
                    type="text"
                    value={toHolder}
                    onChange={(e) => setToHolder(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">Transfer Units</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">Purpose</label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg bg-white"
                  >
                    <option value="SECONDARY_TRADE">Secondary Trade</option>
                    <option value="PRIMARY_ISSUANCE">Primary Allocation</option>
                    <option value="REDEMPTION">Redemption</option>
                  </select>
                </div>
              </div>

              {/* Real-time Rule Check Simulator */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleEvaluateRules}
                  disabled={evaluating || !tokenId}
                  className="w-full py-1.5 px-3 bg-[#F0F4F8] hover:bg-[#E2E8F0] text-[#0F2A43] border border-[#D8E0E8] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1F5A7A]" />
                  {evaluating ? 'Simulating On-Chain Rules...' : 'Simulate Rule Evaluation Engine'}
                </button>

                {evalResult && (
                  <div className="mt-2 p-3 bg-[#F8FAFC] border border-[#D8E0E8] rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold">
                      <span>Engine Verdict:</span>
                      <span className={evalResult.canTransfer ? 'text-[#18794E]' : 'text-[#B42318]'}>
                        {evalResult.canTransfer ? 'ELIGIBLE TO SETTLE' : 'FAILED CHECKS'}
                      </span>
                    </div>
                    {evalResult.checks?.map((c, i) => (
                      <div key={i} className="text-[11px] text-[#5A6A7E] flex items-center justify-between">
                        <span>{c.rule}</span>
                        <span className={c.passed ? 'text-[#18794E]' : 'text-[#B42318]'}>
                          {c.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
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
                  disabled={submitting}
                  className="px-4 py-2 bg-[#0F2A43] text-white rounded-lg font-semibold hover:bg-[#1F5A7A]"
                >
                  {submitting ? 'Submitting...' : 'Propose Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
