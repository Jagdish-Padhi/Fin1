import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { useToast } from '../../shared/components/Toast.jsx';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog.jsx';
import {
  counterRef,
  counterpartyOf,
  groupThreads,
  involvesMe,
  inrToPaise,
  isIncoming,
  myLedgerId,
  pricePaiseToInr,
} from './offerUtils.js';
import {
  HandCoins,
  PlusCircle,
  Play,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Search,
  RefreshCw,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  MessageSquareText,
  ArrowRight,
} from 'lucide-react';

const STATUS_PILL = {
  PROPOSED: 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]',
  EXECUTED: 'bg-[#F0FDF4] text-[#18794E] border-[#BBF7D0]',
  REJECTED: 'bg-[#FEF2F2] text-[#B42318] border-[#FECDD3]',
  CANCELLED: 'bg-[#F1F5F9] text-[#5A6A7E] border-[#D8E0E8]',
};

export function InvestView() {
  const { user } = useAuth();
  const toast = useToast();
  const me = myLedgerId(user);

  const [transfers, setTransfers] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState({});

  // Propose state
  const [showPropose, setShowPropose] = useState(false);
  const [tokenId, setTokenId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [sellerOptions, setSellerOptions] = useState([]);
  const [units, setUnits] = useState(100);
  const [priceInr, setPriceInr] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  // Counter state (revise terms on a thread)
  const [counterTarget, setCounterTarget] = useState(null);
  const [counterUnits, setCounterUnits] = useState(100);
  const [counterPriceInr, setCounterPriceInr] = useState('');
  const [counterNote, setCounterNote] = useState('');
  const [counterSubmitting, setCounterSubmitting] = useState(false);

  // Decline / execute
  const [declineTarget, setDeclineTarget] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declining, setDeclining] = useState(false);
  const [executeTarget, setExecuteTarget] = useState(null);
  const [executing, setExecuting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [trRes, tokRes, partRes] = await Promise.allSettled([
        api.getTransfers(),
        api.getTokens(),
        api.getParticipants(),
      ]);
      if (trRes.status === 'fulfilled') setTransfers(trRes.value.data || []);
      if (tokRes.status === 'fulfilled') {
        const list = tokRes.value.data || [];
        setTokens(list);
        if (list.length > 0 && !tokenId) setTokenId(list[0].id);
      }
      if (partRes.status === 'fulfilled') setParticipants(partRes.value.data || []);
    } catch (err) {
      console.error('Failed to load investment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When the chosen token changes, default the seller to its largest holder
  // (usually the issuer holding the initial supply).
  useEffect(() => {
    if (!tokenId || !showPropose) return;
    let cancelled = false;
    (async () => {
      try {
        const hRes = await api.getTokenHolders(tokenId);
        const holdersList = hRes?.data || [];
        if (cancelled) return;
        const opts = holdersList
          .map((h) => ({
            id: h.participantId || h.holderId,
            units: h.units !== undefined ? h.units : h.balance || 0,
          }))
          .filter((h) => h.id && h.id !== me)
          .sort((a, b) => b.units - a.units);
        setSellerOptions(opts);
        if (opts.length > 0) setSellerId(opts[0].id);
      } catch {
        if (!cancelled) {
          setSellerOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenId, showPropose]);

  const myThreads = useMemo(() => {
    const mine = transfers.filter((t) => involvesMe(t, user));
    const filtered = mine.filter((t) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.id?.toLowerCase().includes(q) ||
        t.tokenId?.toLowerCase().includes(q) ||
        counterpartyOf(t, user)?.toLowerCase().includes(q)
      );
    });
    return groupThreads(filtered);
  }, [transfers, searchQuery, user]);

  const myProposed = transfers.filter((t) => t.status === 'PROPOSED' && !isIncoming(t, user) && involvesMe(t, user)).length;
  const awaitingMe = transfers.filter((t) => t.status === 'PROPOSED' && isIncoming(t, user) && involvesMe(t, user)).length;
  const settled = transfers.filter((t) => t.status === 'EXECUTED' && involvesMe(t, user)).length;

  const handleEvaluate = async () => {
    if (!tokenId || !sellerId || !units) {
      toast.warning('Pick an offering, seller and units before checking compliance.');
      return;
    }
    try {
      setEvaluating(true);
      const res = await api.evaluateTransfer({
        tokenId,
        fromParticipantId: sellerId,
        toParticipantId: me,
        units: Number(units),
        pricePaise: inrToPaise(priceInr),
      });
      setEvalResult(res.data);
    } catch (err) {
      toast.error(err.message || 'Compliance check failed.');
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
        fromParticipantId: sellerId,
        toParticipantId: me,
        units: Number(units),
        pricePaise: inrToPaise(priceInr),
        paymentRef: note || '',
      });
      setShowPropose(false);
      setEvalResult(null);
      setNote('');
      toast.success('Investment offer sent to the issuer for review.');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Offer failed. Check compliance rules.');
    } finally {
      setSubmitting(false);
    }
  };

  const openCounter = (transfer) => {
    setCounterTarget(transfer);
    setCounterUnits(transfer.units);
    setCounterPriceInr(transfer.pricePaise ? String(transfer.pricePaise / 100) : '');
    setCounterNote('');
  };

  const handleCounter = async (e) => {
    e.preventDefault();
    if (!counterTarget) return;
    try {
      setCounterSubmitting(true);
      const res = await api.proposeTransfer({
        tokenId: counterTarget.tokenId,
        fromParticipantId: counterTarget.fromParticipantId,
        toParticipantId: counterTarget.toParticipantId,
        units: Number(counterUnits),
        pricePaise: inrToPaise(counterPriceInr),
        paymentRef: counterRef(counterTarget.id, counterNote),
      });
      // Supersede the parent so the thread has a single actionable offer.
      try {
        await api.cancelTransfer(counterTarget.id, `Superseded by counter ${res?.data?.id || 'revised offer'}`);
      } catch {
        // Parent may already be settled/cancelled — the new offer still stands.
      }
      setCounterTarget(null);
      toast.success('Revised offer sent. Previous terms superseded.');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Revised offer failed.');
    } finally {
      setCounterSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!declineTarget) return;
    try {
      setDeclining(true);
      await api.cancelTransfer(declineTarget.id, declineReason || 'Offer declined');
      setDeclineTarget(null);
      setDeclineReason('');
      toast.success('Offer declined and recorded on ledger.');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Decline failed.');
    } finally {
      setDeclining(false);
    }
  };

  const handleExecute = async () => {
    if (!executeTarget) return;
    try {
      setExecuting(true);
      await api.executeTransfer(executeTarget.id);
      setExecuteTarget(null);
      toast.success(`Offer ${executeTarget.id} settled on ledger.`);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Settlement failed — see rejection reasons.');
      await loadData();
    } finally {
      setExecuting(false);
    }
  };

  const toggleThread = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D8E0E8]">
        <div>
          <h2 className="text-xl font-bold text-[#0F2A43] flex items-center gap-2">
            <HandCoins className="w-6 h-6 text-[#1F5A7A]" />
            Invest & Offers
          </h2>
          <p className="text-xs text-[#5A6A7E] mt-1">
            Propose a purchase offer to the issuer, negotiate terms, and settle on ledger.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-[#D8E0E8] rounded-lg text-[#5A6A7E] hover:bg-[#F8FAFC] transition"
            title="Refresh offers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setEvalResult(null);
              setShowPropose(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F2A43] hover:bg-[#1F5A7A] text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            Propose Investment Offer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'My Active Offers', value: myProposed, sub: 'Awaiting issuer review' },
          { label: 'Issuer Counter-Offers', value: awaitingMe, sub: 'Needs your response' },
          { label: 'Settled Investments', value: settled, sub: 'Executed on ledger' },
        ].map((s) => (
          <div key={s.label} className="p-4 bg-white border border-[#D8E0E8] rounded-xl shadow-2xs">
            <span className="text-xs font-medium text-[#5A6A7E]">{s.label}</span>
            <p className="text-2xl font-bold text-[#0F2A43] mt-2">{s.value}</p>
            <p className="text-[11px] text-[#5A6A7E] mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 bg-white p-4 border border-[#D8E0E8] rounded-xl">
        <div className="relative min-w-[260px] flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A7E]" />
          <input
            type="text"
            placeholder="Search token, counterparty, offer ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#D8E0E8] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1F5A7A]"
          />
        </div>
        <span className="text-[11px] text-[#5A6A7E] shrink-0">
          Buying as <span className="font-mono font-semibold text-[#0F2A43]">{me || '—'}</span>
        </span>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#5A6A7E] bg-white border border-[#D8E0E8] rounded-xl">
            Loading your investment offers...
          </div>
        ) : myThreads.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#5A6A7E] bg-white border border-[#D8E0E8] rounded-xl">
            No offers yet. Propose your first investment offer to an issuer.
          </div>
        ) : (
          myThreads.map((thread) => {
            const open = expanded[thread.key];
            const latest = thread.latest;
            const incoming = latest?.status === 'PROPOSED' && isIncoming(latest, user);
            return (
              <div key={thread.key} className="bg-white border border-[#D8E0E8] rounded-xl overflow-hidden shadow-2xs">
                <button onClick={() => toggleThread(thread.key)} className="w-full text-left p-4 hover:bg-[#F8FAFC] transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {open ? <ChevronDown className="w-4 h-4 text-[#5A6A7E] shrink-0" /> : <ChevronRight className="w-4 h-4 text-[#5A6A7E] shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-[#0F2A43]">{thread.tokenId}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_PILL[latest?.status] || STATUS_PILL.CANCELLED}`}>
                            {latest?.status}
                          </span>
                          {incoming && latest?.status === 'PROPOSED' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEFCE8] text-[#A16207] border border-[#FEF08A]">
                              ISSUER COUNTERED — REVIEW
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#5A6A7E] mt-1">
                          With <span className="font-mono font-semibold text-[#17202A]">{counterpartyOf(latest, user)}</span>
                          {' · '}
                          {Number(latest?.units).toLocaleString()} units @ ₹{pricePaiseToInr(latest?.pricePaise)}
                          {' · '}
                          {thread.items.length} message{thread.items.length > 1 ? 's' : ''} in negotiation
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#8795A5] shrink-0" />
                  </div>
                </button>

                {open && (
                  <div className="border-t border-[#D8E0E8] p-4 space-y-3 bg-[#F8FAFC]/50">
                    {thread.items.map((item) => {
                      const mine = !isIncoming(item, user);
                      return (
                        <div key={item.id} className={`p-3 rounded-lg border text-xs ${mine ? 'bg-white border-[#D8E0E8]' : 'bg-[#FFFBEB] border-[#FDE68A]'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[#0F2A43] flex items-center gap-1.5">
                              <MessageSquareText className="w-3.5 h-3.5 text-[#1F5A7A]" />
                              {mine ? 'You offered' : `${counterpartyOf(item, user)} proposed`}
                            </span>
                            <span className="font-mono text-[10px] text-[#5A6A7E]">{item.id}</span>
                          </div>
                          <div className="mt-1.5 font-mono">
                            {Number(item.units).toLocaleString()} units @ ₹{pricePaiseToInr(item.pricePaise)}
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold border ${STATUS_PILL[item.status] || STATUS_PILL.CANCELLED}`}>
                              {item.status}
                            </span>
                          </div>
                          {item.paymentRef && <p className="mt-1 text-[#5A6A7E]">“{item.paymentRef}”</p>}
                          <p className="mt-1 text-[10px] text-[#8795A5]">{item.createdAt}</p>
                        </div>
                      );
                    })}

                    {thread.actionable && (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => openCounter(thread.actionable)}
                          className="px-3 py-1.5 rounded-lg border border-[#D8E0E8] text-[#0F2A43] hover:bg-white text-[11px] font-semibold transition"
                        >
                          Revise Terms
                        </button>
                        <button
                          onClick={() => {
                            setDeclineReason('');
                            setDeclineTarget(thread.actionable);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B42318] border border-[#FECDD3] text-[11px] font-semibold transition"
                        >
                          Withdraw
                        </button>
                        <button
                          onClick={() => setExecuteTarget(thread.actionable)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0F2A43] hover:bg-[#1F5A7A] text-white rounded-lg text-[11px] font-semibold transition"
                        >
                          <Play className="w-3 h-3" />
                          Accept & Settle
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showPropose && (
        <div className="fixed inset-0 z-50 bg-[#0F2A43]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E0E8] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8E0E8]">
              <h3 className="text-sm font-bold text-[#0F2A43]">Propose Investment Offer</h3>
              <button onClick={() => setShowPropose(false)} className="p-1 hover:bg-[#F0F4F8] rounded text-[#5A6A7E]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handlePropose} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Tokenized Offering</label>
                <select value={tokenId} onChange={(e) => setTokenId(e.target.value)} className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono bg-white" required>
                  {tokens.map((tok) => (
                    <option key={tok.id} value={tok.id}>
                      {tok.id} ({tok.standard} — {Number(tok.totalUnits || tok.totalSupply || 0).toLocaleString()} {tok.unitLabel})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">Seller (Issuer Holding)</label>
                  {sellerOptions.length > 0 ? (
                    <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono bg-white" required>
                      {sellerOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.id} ({Number(s.units).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" value={sellerId} onChange={(e) => setSellerId(e.target.value)} placeholder="PRT-ISSUER-01" className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono" required />
                  )}
                </div>
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">Buyer (You)</label>
                  <input type="text" value={me} readOnly className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono bg-[#F8FAFC] text-[#5A6A7E]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">Units Requested</label>
                  <input type="number" value={units} onChange={(e) => setUnits(e.target.value)} className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono" min="1" required />
                </div>
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">Offer Price (₹)</label>
                  <input type="number" value={priceInr} onChange={(e) => setPriceInr(e.target.value)} placeholder="e.g. 500000" className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono" min="0" />
                </div>
              </div>
              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Message to Issuer</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. Long-term hold, can settle this week" className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg" />
              </div>
              <button type="button" onClick={handleEvaluate} disabled={evaluating || !tokenId} className="w-full py-2 px-3 bg-[#F0F4F8] hover:bg-[#E2E8F0] text-[#0F2A43] border border-[#D8E0E8] rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition">
                <ShieldCheck className="w-4 h-4 text-[#1F5A7A]" />
                {evaluating ? 'Checking Compliance...' : 'Run Pre-flight Compliance Check'}
              </button>
              {evalResult && (
                <div className="p-3 bg-[#F8FAFC] border border-[#D8E0E8] rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold">
                    <span>Compliance Result:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${evalResult.passed ? 'bg-[#F0FDF4] text-[#18794E] border border-[#BBF7D0]' : 'bg-[#FEF2F2] text-[#B42318] border border-[#FECDD3]'}`}>
                      {evalResult.passed ? 'ELIGIBLE' : 'BLOCKED'}
                    </span>
                  </div>
                  {evalResult.results && Object.entries(evalResult.results).map(([rule, r]) => (
                    <div key={rule} className="flex items-center justify-between text-[11px]">
                      <span className="text-[#5A6A7E]">{rule}</span>
                      <span className={`flex items-center gap-1 font-bold ${r.passed ? 'text-[#18794E]' : 'text-[#B42318]'}`}>
                        {r.passed ? <><Check className="w-3 h-3" /> PASS</> : <><X className="w-3 h-3" /> FAIL</>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-3 border-t border-[#D8E0E8]">
                <button type="button" onClick={() => setShowPropose(false)} className="px-4 py-2 border border-[#D8E0E8] rounded-lg text-[#5A6A7E]">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#0F2A43] text-white rounded-lg font-semibold hover:bg-[#1F5A7A]">
                  {submitting ? 'Sending...' : 'Send Offer to Issuer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {counterTarget && (
        <div className="fixed inset-0 z-50 bg-[#0F2A43]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E0E8] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8E0E8]">
              <h3 className="text-sm font-bold text-[#0F2A43]">Revise Offer Terms</h3>
              <button onClick={() => setCounterTarget(null)} className="p-1 hover:bg-[#F0F4F8] rounded text-[#5A6A7E]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCounter} className="space-y-3 text-xs">
              <p className="text-[#5A6A7E]">Revising <span className="font-mono text-[#0F2A43]">{counterTarget.id}</span> — the previous terms are superseded on ledger.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">Units</label>
                  <input type="number" value={counterUnits} onChange={(e) => setCounterUnits(e.target.value)} className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono" min="1" required />
                </div>
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">Price (₹)</label>
                  <input type="number" value={counterPriceInr} onChange={(e) => setCounterPriceInr(e.target.value)} className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono" min="0" />
                </div>
              </div>
              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Note</label>
                <textarea value={counterNote} onChange={(e) => setCounterNote(e.target.value)} rows={2} className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setCounterTarget(null)} className="px-4 py-2 border border-[#D8E0E8] rounded-lg text-[#5A6A7E]">Cancel</button>
                <button type="submit" disabled={counterSubmitting} className="px-4 py-2 bg-[#0F2A43] text-white rounded-lg font-semibold hover:bg-[#1F5A7A]">
                  {counterSubmitting ? 'Sending...' : 'Send Revised Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {declineTarget && (
        <div className="fixed inset-0 z-50 bg-[#0F2A43]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E0E8] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-sm font-bold text-[#0F2A43]">Withdraw Offer {declineTarget.id}?</h3>
            <textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} rows={2} placeholder="Reason (recorded on ledger)" className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeclineTarget(null)} className="px-4 py-2 border border-[#D8E0E8] rounded-lg text-[#5A6A7E]">Keep</button>
              <button onClick={handleDecline} disabled={declining} className="px-4 py-2 bg-[#B42318] text-white rounded-lg font-semibold">
                {declining ? 'Withdrawing...' : 'Withdraw Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(executeTarget)}
        title="Accept & Settle on Ledger"
        message={`Settle offer ${executeTarget?.id}? This atomically moves ${executeTarget?.units?.toLocaleString()} units from ${executeTarget?.fromParticipantId} to ${executeTarget?.toParticipantId}. Irreversible.`}
        confirmLabel={executing ? 'Settling...' : 'Accept & Settle'}
        variant="warning"
        onConfirm={handleExecute}
        onCancel={() => setExecuteTarget(null)}
      />
    </div>
  );
}
