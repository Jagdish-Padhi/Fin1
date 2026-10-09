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
  Inbox,
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
} from 'lucide-react';

const STATUS_PILL = {
  PROPOSED: 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]',
  EXECUTED: 'bg-[#F0FDF4] text-[#18794E] border-[#BBF7D0]',
  REJECTED: 'bg-[#FEF2F2] text-[#B42318] border-[#FECDD3]',
  CANCELLED: 'bg-[#F1F5F9] text-[#5A6A7E] border-[#D8E0E8]',
};

const FILTERS = ['ALL', 'NEEDS_REVIEW', 'SETTLED', 'MINE'];

export function InvestmentOffersView() {
  const { user } = useAuth();
  const toast = useToast();
  const me = myLedgerId(user);

  const [transfers, setTransfers] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expanded, setExpanded] = useState({});

  const [counterTarget, setCounterTarget] = useState(null);
  const [counterUnits, setCounterUnits] = useState(100);
  const [counterPriceInr, setCounterPriceInr] = useState('');
  const [counterNote, setCounterNote] = useState('');
  const [counterSubmitting, setCounterSubmitting] = useState(false);

  const [declineTarget, setDeclineTarget] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declining, setDeclining] = useState(false);
  const [executeTarget, setExecuteTarget] = useState(null);
  const [executing, setExecuting] = useState(false);

  const [checkingId, setCheckingId] = useState(null);
  const [checkResults, setCheckResults] = useState({});

  const loadData = async () => {
    try {
      setLoading(true);
      const [trRes, tokRes] = await Promise.allSettled([
        api.getTransfers(),
        api.getTokens(),
      ]);
      if (trRes.status === 'fulfilled') setTransfers(trRes.value.data || []);
      if (tokRes.status === 'fulfilled') setTokens(tokRes.value.data || []);
    } catch (err) {
      console.error('Failed to load investment offers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const tokenById = useMemo(() => {
    const map = {};
    for (const t of tokens) map[t.id] = t;
    return map;
  }, [tokens]);

  const threads = useMemo(() => {
    const mine = transfers.filter((t) => involvesMe(t, user));
    const bySearch = mine.filter((t) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.id?.toLowerCase().includes(q) ||
        t.tokenId?.toLowerCase().includes(q) ||
        counterpartyOf(t, user)?.toLowerCase().includes(q) ||
        t.paymentRef?.toLowerCase().includes(q)
      );
    });
    const grouped = groupThreads(bySearch);
    return grouped.filter((th) => {
      const latest = th.latest;
      switch (statusFilter) {
        case 'NEEDS_REVIEW':
          return latest?.status === 'PROPOSED' && isIncoming(latest, user);
        case 'SETTLED':
          return latest?.status === 'EXECUTED';
        case 'MINE':
          return latest && !isIncoming(latest, user);
        default:
          return true;
      }
    });
  }, [transfers, searchQuery, statusFilter, user]);

  const incoming = transfers.filter((t) => t.status === 'PROPOSED' && isIncoming(t, user) && involvesMe(t, user)).length;
  const total = transfers.filter((t) => involvesMe(t, user)).length;
  const settledCount = transfers.filter((t) => t.status === 'EXECUTED' && involvesMe(t, user)).length;

  const handleCheck = async (transfer) => {
    try {
      setCheckingId(transfer.id);
      const res = await api.evaluateTransfer({
        tokenId: transfer.tokenId,
        fromParticipantId: transfer.fromParticipantId,
        toParticipantId: transfer.toParticipantId,
        units: transfer.units,
        pricePaise: transfer.pricePaise || 0,
      });
      setCheckResults((p) => ({ ...p, [transfer.id]: res.data }));
    } catch (err) {
      toast.error(err.message || 'Compliance check failed.');
    } finally {
      setCheckingId(null);
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
    const investor = counterTarget.toParticipantId;
    try {
      setCounterSubmitting(true);
      const res = await api.proposeTransfer({
        tokenId: counterTarget.tokenId,
        fromParticipantId: me,
        toParticipantId: investor,
        units: Number(counterUnits),
        pricePaise: inrToPaise(counterPriceInr),
        paymentRef: counterRef(counterTarget.id, counterNote),
      });
      try {
        await api.cancelTransfer(counterTarget.id, `Superseded by issuer counter ${res?.data?.id || 'revised terms'}`);
      } catch {
        // Parent may already be resolved — revised terms still stand.
      }
      setCounterTarget(null);
      toast.success(`Counter-offer sent to ${investor}.`);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Counter-offer failed.');
    } finally {
      setCounterSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!declineTarget) return;
    try {
      setDeclining(true);
      await api.cancelTransfer(declineTarget.id, declineReason || 'Declined by issuer');
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
      toast.success(`Offer ${executeTarget.id} settled — units moved on ledger.`);
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
            <Inbox className="w-6 h-6 text-[#1F5A7A]" />
            Investment Offers
          </h2>
          <p className="text-xs text-[#5A6A7E] mt-1">
            Purchase requests from investors — review, negotiate, then accept & settle.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 border border-[#D8E0E8] rounded-lg text-[#5A6A7E] hover:bg-[#F8FAFC] transition self-start md:self-auto"
          title="Refresh offers"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Needs Your Review', value: incoming, sub: 'Investor offers awaiting decision' },
          { label: 'Total Requests', value: total, sub: 'All threads involving you' },
          { label: 'Settled', value: settledCount, sub: 'Executed on ledger' },
        ].map((s) => (
          <div key={s.label} className="p-4 bg-white border border-[#D8E0E8] rounded-xl shadow-2xs">
            <span className="text-xs font-medium text-[#5A6A7E]">{s.label}</span>
            <p className="text-2xl font-bold text-[#0F2A43] mt-2">{s.value}</p>
            <p className="text-[11px] text-[#5A6A7E] mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border border-[#D8E0E8] rounded-xl">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === f
                  ? 'bg-[#0F2A43] text-white'
                  : 'bg-[#F8FAFC] text-[#5A6A7E] hover:bg-[#E2E8F0] border border-[#D8E0E8]'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A7E]" />
          <input
            type="text"
            placeholder="Search investor, token, offer ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#D8E0E8] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1F5A7A]"
          />
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#5A6A7E] bg-white border border-[#D8E0E8] rounded-xl">
            Loading investment offers...
          </div>
        ) : threads.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#5A6A7E] bg-white border border-[#D8E0E8] rounded-xl">
            No investment offers match. When an investor proposes a purchase, it appears here.
          </div>
        ) : (
          threads.map((thread) => {
            const open = expanded[thread.key];
            const latest = thread.latest;
            const needsReview = latest?.status === 'PROPOSED' && isIncoming(latest, user);
            const investor = counterpartyOf(latest, user);
            const token = tokenById[thread.tokenId];
            const check = checkResults[latest?.id];
            return (
              <div key={thread.key} className="bg-white border border-[#D8E0E8] rounded-xl overflow-hidden shadow-2xs">
                <button onClick={() => toggleThread(thread.key)} className="w-full text-left p-4 hover:bg-[#F8FAFC] transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {open ? <ChevronDown className="w-4 h-4 text-[#5A6A7E] shrink-0" /> : <ChevronRight className="w-4 h-4 text-[#5A6A7E] shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-[#5A6A7E]">Request from</span>
                          <span className="font-mono font-bold text-xs text-[#0F2A43]">{investor}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_PILL[latest?.status] || STATUS_PILL.CANCELLED}`}>
                            {latest?.status}
                          </span>
                          {needsReview && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEFCE8] text-[#A16207] border border-[#FEF08A]">
                              NEEDS REVIEW
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#5A6A7E] mt-1">
                          <span className="font-mono text-[#1F5A7A]">{thread.tokenId}</span>
                          {token && <span> · {token.standard} · {Number(token.totalUnits || token.totalSupply || 0).toLocaleString()} {token.unitLabel}</span>}
                          {' · '}
                          {Number(latest?.units).toLocaleString()} units @ ₹{pricePaiseToInr(latest?.pricePaise)}
                          {' · '}
                          {thread.items.length} round{thread.items.length > 1 ? 's' : ''} of negotiation
                        </div>
                      </div>
                    </div>
                  </div>
                </button>

                {open && (
                  <div className="border-t border-[#D8E0E8] p-4 space-y-3 bg-[#F8FAFC]/50">
                    {thread.items.map((item) => {
                      const fromInvestor = isIncoming(item, user);
                      return (
                        <div key={item.id} className={`p-3 rounded-lg border text-xs ${fromInvestor ? 'bg-[#FFFBEB] border-[#FDE68A]' : 'bg-white border-[#D8E0E8]'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[#0F2A43] flex items-center gap-1.5">
                              <MessageSquareText className="w-3.5 h-3.5 text-[#1F5A7A]" />
                              {fromInvestor ? `${counterpartyOf(item, user)} offered` : 'You countered'}
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

                    {check && (
                      <div className="p-3 bg-white border border-[#D8E0E8] rounded-lg text-xs space-y-1.5">
                        <div className="flex items-center justify-between font-bold">
                          <span>Compliance pre-check</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] ${check.passed ? 'bg-[#F0FDF4] text-[#18794E] border border-[#BBF7D0]' : 'bg-[#FEF2F2] text-[#B42318] border border-[#FECDD3]'}`}>
                            {check.passed ? 'ELIGIBLE' : 'BLOCKED'}
                          </span>
                        </div>
                        {check.results && Object.entries(check.results).map(([rule, r]) => (
                          <div key={rule} className="flex items-center justify-between text-[11px]">
                            <span className="text-[#5A6A7E]">{rule}</span>
                            <span className={`flex items-center gap-1 font-bold ${r.passed ? 'text-[#18794E]' : 'text-[#B42318]'}`}>
                              {r.passed ? <><Check className="w-3 h-3" /> PASS</> : <><X className="w-3 h-3" /> FAIL</>}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {thread.actionable && (
                      <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                        <button
                          onClick={() => handleCheck(thread.actionable)}
                          disabled={checkingId === thread.actionable.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F0F4F8] hover:bg-[#E2E8F0] text-[#0F2A43] border border-[#D8E0E8] text-[11px] font-semibold transition"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-[#1F5A7A]" />
                          {checkingId === thread.actionable.id ? 'Checking...' : 'Check Compliance'}
                        </button>
                        <button
                          onClick={() => openCounter(thread.actionable)}
                          className="px-3 py-1.5 rounded-lg border border-[#D8E0E8] text-[#0F2A43] hover:bg-white text-[11px] font-semibold transition"
                        >
                          Counter Offer
                        </button>
                        <button
                          onClick={() => {
                            setDeclineReason('');
                            setDeclineTarget(thread.actionable);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B42318] border border-[#FECDD3] text-[11px] font-semibold transition"
                        >
                          Decline
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
                    {!thread.actionable && latest?.status === 'EXECUTED' && (
                      <p className="text-[11px] text-[#18794E] flex items-center gap-1.5 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Settled on ledger.
                      </p>
                    )}
                    {!thread.actionable && (latest?.status === 'REJECTED' || latest?.status === 'CANCELLED') && (
                      <p className="text-[11px] text-[#5A6A7E] flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" /> Closed ({latest?.status}).
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {counterTarget && (
        <div className="fixed inset-0 z-50 bg-[#0F2A43]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E0E8] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8E0E8]">
              <h3 className="text-sm font-bold text-[#0F2A43]">Counter-Offer to {counterTarget.toParticipantId}</h3>
              <button onClick={() => setCounterTarget(null)} className="p-1 hover:bg-[#F0F4F8] rounded text-[#5A6A7E]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCounter} className="space-y-3 text-xs">
              <p className="text-[#5A6A7E]">
                Token <span className="font-mono text-[#0F2A43]">{counterTarget.tokenId}</span> · from you ({me}) to{' '}
                <span className="font-mono text-[#0F2A43]">{counterTarget.toParticipantId}</span>. Original{' '}
                <span className="font-mono">{counterTarget.id}</span> is superseded.
              </p>
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
                <label className="block text-[#5A6A7E] font-medium mb-1">Message to Investor</label>
                <textarea value={counterNote} onChange={(e) => setCounterNote(e.target.value)} rows={2} placeholder="e.g. Can do 80 units at this valuation" className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setCounterTarget(null)} className="px-4 py-2 border border-[#D8E0E8] rounded-lg text-[#5A6A7E]">Cancel</button>
                <button type="submit" disabled={counterSubmitting} className="px-4 py-2 bg-[#0F2A43] text-white rounded-lg font-semibold hover:bg-[#1F5A7A]">
                  {counterSubmitting ? 'Sending...' : 'Send Counter-Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {declineTarget && (
        <div className="fixed inset-0 z-50 bg-[#0F2A43]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E0E8] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-sm font-bold text-[#0F2A43]">Decline Offer {declineTarget.id}?</h3>
            <p className="text-[#5A6A7E]">From <span className="font-mono text-[#0F2A43]">{counterpartyOf(declineTarget, user)}</span> — recorded on ledger.</p>
            <textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} rows={2} placeholder="Reason (e.g. valuation too low)" className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeclineTarget(null)} className="px-4 py-2 border border-[#D8E0E8] rounded-lg text-[#5A6A7E]">Keep</button>
              <button onClick={handleDecline} disabled={declining} className="px-4 py-2 bg-[#B42318] text-white rounded-lg font-semibold">
                {declining ? 'Declining...' : 'Decline Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(executeTarget)}
        title="Accept & Settle Investment"
        message={`Accept offer ${executeTarget?.id} from ${executeTarget ? counterpartyOf(executeTarget, user) : ''}? This moves ${executeTarget?.units?.toLocaleString()} units from ${executeTarget?.fromParticipantId} to ${executeTarget?.toParticipantId}. Irreversible.`}
        confirmLabel={executing ? 'Settling...' : 'Accept & Settle'}
        variant="warning"
        onConfirm={handleExecute}
        onCancel={() => setExecuteTarget(null)}
      />
    </div>
  );
}
