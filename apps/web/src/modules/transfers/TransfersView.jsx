import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { useToast } from '../../shared/components/Toast.jsx';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog.jsx';
import {
  ArrowRightLeft,
  PlusCircle,
  Play,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Search,
  Filter,
  Layers,
  Coins,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Info,
  Clock,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';

export function TransfersView() {
  const { user } = useAuth();
  const toast = useToast();
  const [transfers, setTransfers] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [selectedTransferForDetails, setSelectedTransferForDetails] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [executeTarget, setExecuteTarget] = useState(null); // for confirmation dialog
  const [executing, setExecuting] = useState(false);

  // Form State
  const [tokenId, setTokenId] = useState('');
  const [fromParticipantId, setFromParticipantId] = useState('');
  const [toParticipantId, setToParticipantId] = useState('');
  const [units, setUnits] = useState(100);
  const [pricePaise, setPricePaise] = useState(0);
  const [paymentRef, setPaymentRef] = useState('');

  // Rule Evaluation test state
  const [evalResult, setEvalResult] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  const canPropose =
    user?.role === 'ISSUER' ||
    user?.role === 'INVESTOR' ||
    user?.role === 'COMPLIANCE' ||
    user?.role === 'ADMINISTRATOR';
  const canExecute =
    user?.role === 'COMPLIANCE' ||
    user?.role === 'ADMINISTRATOR' ||
    user?.role === 'INVESTOR' ||
    user?.role === 'ISSUER';

  const loadData = async () => {
    try {
      setLoading(true);
      const [transfersRes, tokensRes, participantsRes] = await Promise.allSettled([
        api.getTransfers(),
        api.getTokens(),
        api.getParticipants(),
      ]);

      if (transfersRes.status === 'fulfilled') {
        setTransfers(transfersRes.value.data || []);
      }
      if (tokensRes.status === 'fulfilled') {
        setTokens(tokensRes.value.data || []);
        if (tokensRes.value.data?.length > 0 && !tokenId) {
          setTokenId(tokensRes.value.data[0].id);
        }
      }
      if (participantsRes.status === 'fulfilled') {
        setParticipants(participantsRes.value.data || []);
        if (participantsRes.value.data?.length > 1 && !fromParticipantId) {
          setFromParticipantId(participantsRes.value.data[0].id);
          setToParticipantId(participantsRes.value.data[1].id);
        }
      }
    } catch (err) {
      console.error('Failed to load transfers data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEvaluateRules = async () => {
    if (!tokenId || !fromParticipantId || !toParticipantId || !units) {
      toast.warning('Please fill in Token, Sender, Receiver, and Units before simulating.');
      return;
    }
    try {
      setEvaluating(true);
      const res = await api.evaluateTransfer({
        tokenId,
        fromParticipantId,
        toParticipantId,
        units: Number(units),
        pricePaise: Number(pricePaise) || 0,
      });
      setEvalResult(res.data);
    } catch (err) {
      toast.error(err.message || 'Rule evaluation failed. Check parameters.');
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
        fromParticipantId,
        toParticipantId,
        units: Number(units),
        pricePaise: Number(pricePaise) || 0,
        paymentRef,
      });
      setShowProposeModal(false);
      setEvalResult(null);
      toast.success('Transfer proposal submitted to compliance queue.');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Transfer proposal failed. Check compliance rules.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteConfirmed = async () => {
    if (!executeTarget) return;
    try {
      setExecuting(true);
      await api.executeTransfer(executeTarget.id);
      setExecuteTarget(null);
      toast.success(`Transfer ${executeTarget.id} executed. Balances updated atomically on ledger.`);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Transfer execution failed.');
    } finally {
      setExecuting(false);
    }
  };

  // Stats calculation
  const totalTransfers = transfers.length;
  const executedTransfers = transfers.filter((t) => t.status === 'EXECUTED').length;
  const rejectedTransfers = transfers.filter((t) => t.status === 'REJECTED').length;
  const proposedTransfers = transfers.filter((t) => t.status === 'PROPOSED').length;

  const filteredTransfers = transfers.filter((t) => {
    const matchesStatus =
      statusFilter === 'ALL' || t.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      t.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tokenId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.fromParticipantId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.toParticipantId?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D8E0E8]">
        <div>
          <h2 className="text-xl font-bold text-[#0F2A43] flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-[#1F5A7A]" />
            Settlement & Transfer Rule Engine
          </h2>
          <p className="text-xs text-[#5A6A7E] mt-1">
            Governed secondary transfers on Hyperledger Fabric with deterministic rule validation, KYC/concentration caps, and first-class rejection audit.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-[#D8E0E8] rounded-lg text-[#5A6A7E] hover:bg-[#F8FAFC] transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

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
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-[#D8E0E8] rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#5A6A7E]">Total Transfer Logs</span>
            <Layers className="w-4 h-4 text-[#1F5A7A]" />
          </div>
          <p className="text-2xl font-bold text-[#0F2A43] mt-2">{totalTransfers}</p>
          <p className="text-[11px] text-[#5A6A7E] mt-1">Immutable records on ledger</p>
        </div>

        <div className="p-4 bg-white border border-[#D8E0E8] rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#5A6A7E]">Settled (Executed)</span>
            <CheckCircle2 className="w-4 h-4 text-[#18794E]" />
          </div>
          <p className="text-2xl font-bold text-[#18794E] mt-2">{executedTransfers}</p>
          <p className="text-[11px] text-[#5A6A7E] mt-1">Atomic balance debits/credits</p>
        </div>

        <div className="p-4 bg-white border border-[#D8E0E8] rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#5A6A7E]">Rejections Persisted</span>
            <ShieldAlert className="w-4 h-4 text-[#B42318]" />
          </div>
          <p className="text-2xl font-bold text-[#B42318] mt-2">{rejectedTransfers}</p>
          <p className="text-[11px] text-[#5A6A7E] mt-1">First-class audit records (Rule 3.4-1)</p>
        </div>

        <div className="p-4 bg-white border border-[#D8E0E8] rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#5A6A7E]">Pending Execution</span>
            <Clock className="w-4 h-4 text-[#A16207]" />
          </div>
          <p className="text-2xl font-bold text-[#A16207] mt-2">{proposedTransfers}</p>
          <p className="text-[11px] text-[#5A6A7E] mt-1">Awaiting compliance / settlement</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border border-[#D8E0E8] rounded-xl">
        <div className="flex items-center gap-2 flex-wrap">
          {['ALL', 'PROPOSED', 'EXECUTED', 'REJECTED', 'CANCELLED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === status
                  ? 'bg-[#0F2A43] text-white'
                  : 'bg-[#F8FAFC] text-[#5A6A7E] hover:bg-[#E2E8F0] border border-[#D8E0E8]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A7E]" />
          <input
            type="text"
            placeholder="Search transfer ID, token, participant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#D8E0E8] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1F5A7A]"
          />
        </div>
      </div>

      {/* Transfers Table */}
      <div className="bg-white border border-[#D8E0E8] rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#D8E0E8] text-[#5A6A7E] uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Transfer ID</th>
                <th className="px-4 py-3">Security Token</th>
                <th className="px-4 py-3">From Participant</th>
                <th className="px-4 py-3">To Participant</th>
                <th className="px-4 py-3">Units</th>
                <th className="px-4 py-3">Price (₹)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8E0E8] text-[#17202A]">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-[#5A6A7E]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1F5A7A]" />
                    Loading transfer operations from blockchain...
                  </td>
                </tr>
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-[#5A6A7E]">
                    No transfer records found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((t) => {
                  const isExecuted = t.status === 'EXECUTED';
                  const isRejected = t.status === 'REJECTED';
                  const isProposed = t.status === 'PROPOSED';
                  const priceInr = t.pricePaise ? (t.pricePaise / 100).toLocaleString('en-IN') : '0';

                  return (
                    <tr key={t.id} className="hover:bg-[#F8FAFC] transition">
                      <td className="px-4 py-3 font-mono font-bold text-[#0F2A43]">{t.id}</td>
                      <td className="px-4 py-3 font-mono text-[#1F5A7A]">
                        {t.tokenId}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{t.fromParticipantId}</td>
                      <td className="px-4 py-3 font-mono text-xs">{t.toParticipantId}</td>
                      <td className="px-4 py-3 font-bold font-mono text-xs">
                        {Number(t.units).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        ₹{priceInr}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isExecuted
                              ? 'bg-[#F0FDF4] text-[#18794E] border-[#BBF7D0]'
                              : isRejected
                              ? 'bg-[#FEF2F2] text-[#B42318] border-[#FECDD3]'
                              : 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]'
                          }`}
                        >
                          {isExecuted && <CheckCircle2 className="w-3 h-3" />}
                          {isRejected && <XCircle className="w-3 h-3" />}
                          {isProposed && <Clock className="w-3 h-3" />}
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isRejected && (
                            <button
                              onClick={() => setSelectedTransferForDetails(t)}
                              className="px-2 py-1 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B42318] border border-[#FECDD3] rounded text-[11px] font-semibold transition"
                            >
                              View Reasons ({t.rejectionReasons?.length || 1})
                            </button>
                          )}

                          {canExecute && isProposed && (
                            <button
                              onClick={() => setExecuteTarget(t)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0F2A43] hover:bg-[#1F5A7A] text-white rounded text-[11px] font-semibold transition"
                            >
                              <Play className="w-3 h-3" />
                              Execute Settlement
                            </button>
                          )}

                          {isExecuted && (
                            <button
                              onClick={() => setSelectedTransferForDetails(t)}
                              className="px-2 py-1 text-[#5A6A7E] hover:text-[#0F2A43] text-[11px] font-medium"
                            >
                              Details
                            </button>
                          )}
                        </div>
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
        <div className="fixed inset-0 z-50 bg-[#0F2A43]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E0E8] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8E0E8]">
              <h3 className="text-sm font-bold text-[#0F2A43] flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-[#1F5A7A]" />
                Propose Token Transfer
              </h3>
              <button
                onClick={() => setShowProposeModal(false)}
                className="p-1 hover:bg-[#F0F4F8] rounded text-[#5A6A7E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#5A6A7E]">
              Pre-flight compliance rules evaluate participant KYC, jurisdiction, lockup schedules, and holding limits prior to proposal submission.
            </p>

            <form onSubmit={handlePropose} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">
                  Select Security Token
                </label>
                {tokens.length > 0 ? (
                  <select
                    value={tokenId}
                    onChange={(e) => setTokenId(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono bg-white"
                    required
                  >
                    {tokens.map((tok) => (
                      <option key={tok.id} value={tok.id}>
                        {tok.id} ({tok.standard} — {tok.totalUnits} {tok.unitLabel})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. TKN-0x12345..."
                    value={tokenId}
                    onChange={(e) => setTokenId(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono"
                    required
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">
                    From Participant (Seller)
                  </label>
                  {participants.length > 0 ? (
                    <select
                      value={fromParticipantId}
                      onChange={(e) => setFromParticipantId(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono bg-white"
                      required
                    >
                      {participants.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id} ({p.kycStatus})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="PRT-ISSUER-01"
                      value={fromParticipantId}
                      onChange={(e) => setFromParticipantId(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono"
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">
                    To Participant (Buyer)
                  </label>
                  {participants.length > 0 ? (
                    <select
                      value={toParticipantId}
                      onChange={(e) => setToParticipantId(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono bg-white"
                      required
                    >
                      {participants.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id} ({p.kycStatus})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="PRT-INVESTOR-01"
                      value={toParticipantId}
                      onChange={(e) => setToParticipantId(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono"
                      required
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">
                    Transfer Units
                  </label>
                  <input
                    type="number"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">
                    Settlement Price (₹ INR)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500000"
                    value={pricePaise ? pricePaise / 100 : ''}
                    onChange={(e) => setPricePaise(Number(e.target.value) * 100)}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">
                  Payment Reference (Off-chain Settlement)
                </label>
                <input
                  type="text"
                  placeholder="e.g. NEFT-HDFC-9918237"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono"
                />
              </div>

              {/* Pre-flight Rule Check Simulator */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleEvaluateRules}
                  disabled={evaluating || !tokenId}
                  className="w-full py-2 px-3 bg-[#F0F4F8] hover:bg-[#E2E8F0] text-[#0F2A43] border border-[#D8E0E8] rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition"
                >
                  <ShieldCheck className="w-4 h-4 text-[#1F5A7A]" />
                  {evaluating ? 'Evaluating Rules...' : 'Run Pre-flight Compliance Check'}
                </button>

                {evalResult && (
                  <div className="mt-3 p-3 bg-[#F8FAFC] border border-[#D8E0E8] rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold pb-1 border-b border-[#D8E0E8]">
                      <span>Pre-flight Evaluation Result:</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          evalResult.passed
                            ? 'bg-[#F0FDF4] text-[#18794E] border border-[#BBF7D0]'
                            : 'bg-[#FEF2F2] text-[#B42318] border border-[#FECDD3]'
                        }`}
                      >
                        {evalResult.passed ? 'COMPLIANT — ELIGIBLE' : 'NON-COMPLIANT — BLOCKED'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {evalResult.results &&
                        Object.entries(evalResult.results).map(([ruleName, r]) => (
                          <div
                            key={ruleName}
                            className="flex items-center justify-between text-[11px] py-0.5"
                          >
                            <span className="text-[#5A6A7E] font-medium">{ruleName}</span>
                            <span
                              className={`flex items-center gap-1 font-bold ${
                                r.passed ? 'text-[#18794E]' : 'text-[#B42318]'
                              }`}
                            >
                              {r.passed ? (
                                <>
                                  <Check className="w-3 h-3" /> PASS
                                </>
                              ) : (
                                <>
                                  <X className="w-3 h-3" /> FAIL
                                </>
                              )}
                            </span>
                          </div>
                        ))}
                    </div>

                    {evalResult.rejectionReasons?.length > 0 && (
                      <div className="p-2 bg-[#FEF2F2] border border-[#FECDD3] rounded-lg text-[11px] text-[#B42318] space-y-1 mt-2">
                        <p className="font-bold">Violations Detected:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {evalResult.rejectionReasons.map((reason, idx) => (
                            <li key={idx}>
                              <span className="font-semibold font-mono">{reason.code}</span>: {reason.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#D8E0E8]">
                <button
                  type="button"
                  onClick={() => setShowProposeModal(false)}
                  className="px-4 py-2 border border-[#D8E0E8] rounded-lg text-[#5A6A7E] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#0F2A43] text-white rounded-lg font-semibold hover:bg-[#1F5A7A] transition"
                >
                  {submitting ? 'Submitting to Chain...' : 'Propose Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Details & Rejections Modal */}
      {selectedTransferForDetails && (
        <div className="fixed inset-0 z-50 bg-[#0F2A43]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E0E8] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8E0E8]">
              <h3 className="text-sm font-bold text-[#0F2A43] flex items-center gap-2">
                <Info className="w-4 h-4 text-[#1F5A7A]" />
                Transfer Audit Record: {selectedTransferForDetails.id}
              </h3>
              <button
                onClick={() => setSelectedTransferForDetails(null)}
                className="p-1 hover:bg-[#F0F4F8] rounded text-[#5A6A7E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-[#F8FAFC] rounded-lg border border-[#D8E0E8]">
              <div>
                <p className="text-[10px] uppercase text-[#5A6A7E]">Status</p>
                <p className="font-bold font-mono text-[#0F2A43] mt-0.5">
                  {selectedTransferForDetails.status}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-[#5A6A7E]">Token ID</p>
                <p className="font-mono text-[#1F5A7A] truncate mt-0.5">
                  {selectedTransferForDetails.tokenId}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-[#5A6A7E]">Seller (From)</p>
                <p className="font-mono text-[#17202A] mt-0.5">
                  {selectedTransferForDetails.fromParticipantId}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-[#5A6A7E]">Buyer (To)</p>
                <p className="font-mono text-[#17202A] mt-0.5">
                  {selectedTransferForDetails.toParticipantId}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-[#5A6A7E]">Units Transferred</p>
                <p className="font-bold text-[#0F2A43] mt-0.5">
                  {selectedTransferForDetails.units}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-[#5A6A7E]">Settlement Price</p>
                <p className="font-mono text-[#0F2A43] mt-0.5">
                  ₹{selectedTransferForDetails.pricePaise ? (selectedTransferForDetails.pricePaise / 100).toLocaleString('en-IN') : '0'}
                </p>
              </div>
            </div>

            {selectedTransferForDetails.rejectionReasons?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-[#B42318] flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  On-Chain Rejection Diagnostic Breakdown:
                </h4>
                <div className="space-y-2">
                  {selectedTransferForDetails.rejectionReasons.map((reason, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#FEF2F2] border border-[#FECDD3] rounded-lg text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#B42318]">
                          {reason.code}
                        </span>
                        <span className="text-[10px] bg-[#FECDD3] text-[#B42318] px-1.5 py-0.5 rounded font-semibold">
                          RULE VIOLATION
                        </span>
                      </div>
                      <p className="text-[#5A6A7E] text-[11px]">{reason.message}</p>
                      {reason.observedValue !== undefined && (
                        <p className="text-[11px] font-mono text-[#17202A]">
                          Observed: {JSON.stringify(reason.observedValue)}
                        </p>
                      )}
                      {reason.limit !== undefined && (
                        <p className="text-[11px] font-mono text-[#17202A]">
                          Limit: {JSON.stringify(reason.limit)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1 pt-2 border-t border-[#D8E0E8] text-[11px] text-[#5A6A7E]">
              <p>Created At: {selectedTransferForDetails.createdAt}</p>
              {selectedTransferForDetails.executedAt && (
                <p>Executed At: {selectedTransferForDetails.executedAt}</p>
              )}
              {selectedTransferForDetails.executedTxId && (
                <p className="font-mono truncate">
                  Tx ID: {selectedTransferForDetails.executedTxId}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setSelectedTransferForDetails(null)}
                className="px-4 py-1.5 bg-[#0F2A43] text-white rounded-lg font-semibold hover:bg-[#1F5A7A]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execute Settlement Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(executeTarget)}
        title="Execute Atomic On-Chain Settlement"
        message={`Settle transfer ${executeTarget?.id}? This will atomically debit ${executeTarget?.units?.toLocaleString()} units from ${executeTarget?.fromParticipantId} and credit ${executeTarget?.toParticipantId}. This action is irreversible on ledger.`}
        confirmLabel={executing ? 'Executing...' : 'Execute Settlement'}
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={handleExecuteConfirmed}
        onCancel={() => setExecuteTarget(null)}
      />
    </div>
  );
}
