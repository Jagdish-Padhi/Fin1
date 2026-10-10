import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { useToast } from '../../shared/components/Toast.jsx';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog.jsx';
import { StatusBadge } from '../../shared/components/StatusBadge.jsx';
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
  PROPOSED: 'bg-trust-warning-bg text-trust-warning border-trust-warning-border',
  EXECUTED: 'bg-trust-success-bg text-trust-success border-trust-success-border',
  REJECTED: 'bg-trust-error-bg text-trust-error border-trust-error-border',
  CANCELLED: 'bg-slate-100 text-trust-text-muted border-trust-border',
};

export function InvestView({ onNavigate }) {
  const { user } = useAuth();
  const toast = useToast();
  const me = myLedgerId(user);

  const [transfers, setTransfers] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [assets, setAssets] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState({});

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
      const [trRes, tokRes, partRes, assetRes] = await Promise.allSettled([
        api.getTransfers(),
        api.getTokens(),
        api.getParticipants(),
        api.getAssets(),
      ]);
      if (assetRes.status === 'fulfilled') setAssets(assetRes.value.data || []);
      if (trRes.status === 'fulfilled') setTransfers(trRes.value.data || []);
      if (tokRes.status === 'fulfilled') {
        setTokens(tokRes.value.data || []);
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

  const assetForToken = (tokenId) => {
    const assetId = tokens.find((t) => t.id === tokenId)?.assetId;
    return assets.find((a) => a.id === assetId) || null;
  };

  const myThreads = useMemo(() => {
    const mine = transfers.filter((t) => involvesMe(t, user));
    const filtered = mine.filter((t) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.id?.toLowerCase().includes(q) ||
        t.tokenId?.toLowerCase().includes(q) ||
        assetForToken(t.tokenId)?.displayName?.toLowerCase().includes(q) ||
        counterpartyOf(t, user)?.toLowerCase().includes(q)
      );
    });
    return groupThreads(filtered);
  }, [transfers, searchQuery, user, tokens, assets]);

  const myProposed = transfers.filter((t) => t.status === 'PROPOSED' && !isIncoming(t, user) && involvesMe(t, user)).length;
  const awaitingMe = transfers.filter((t) => t.status === 'PROPOSED' && isIncoming(t, user) && involvesMe(t, user)).length;
  const settled = transfers.filter((t) => t.status === 'EXECUTED' && involvesMe(t, user)).length;

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
      <div className="page-header">
        <div>
          <h2 className="page-title">
            My investments
          </h2>
          <p className="page-subtitle">
            Track the offers you have made, respond to issuer counter-offers, and settle accepted offers on the ledger.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onNavigate?.('assets')} className="trust-btn-primary">
            Browse assets
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="trust-btn-secondary !px-2.5"
            title="Refresh offers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Active offers', value: myProposed, sub: 'Awaiting issuer review' },
          { label: 'Counter-offers', value: awaitingMe, sub: 'Need your response' },
          { label: 'Settled investments', value: settled, sub: 'Executed on the ledger' },
        ].map((s) => (
          <div key={s.label} className="p-4 bg-white border border-trust-border rounded-lg shadow-subtle">
            <span className="text-xs font-medium text-trust-text-muted">{s.label}</span>
            <p className="text-2xl font-semibold tabular-nums text-trust-primary mt-2">{s.value}</p>
            <p className="text-xs text-trust-text-muted mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 bg-white p-4 border border-trust-border rounded-lg">
        <div className="relative min-w-[260px] flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-trust-text-muted" />
          <input
            type="text"
            placeholder="Search by asset, counterparty or offer ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-trust-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-trust-secondary"
          />
        </div>
        <span className="text-xs text-trust-text-muted shrink-0">
          Buying as <span className="font-mono font-semibold text-trust-primary">{me || '—'}</span>
        </span>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-trust-text-muted bg-white border border-trust-border rounded-lg">
            Loading your investment offers...
          </div>
        ) : myThreads.length === 0 ? (
          <div className="p-8 text-center text-xs text-trust-text-muted bg-white border border-trust-border rounded-lg">
            No offers yet. Browse assets to make your first offer.
          </div>
        ) : (
          myThreads.map((thread) => {
            const open = expanded[thread.key];
            const latest = thread.latest;
            const incoming = latest?.status === 'PROPOSED' && isIncoming(latest, user);
            return (
              <div key={thread.key} className="bg-white border border-trust-border rounded-lg overflow-hidden shadow-subtle">
                <button onClick={() => toggleThread(thread.key)} className="w-full text-left p-4 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {open ? <ChevronDown className="w-4 h-4 text-trust-text-muted shrink-0" /> : <ChevronRight className="w-4 h-4 text-trust-text-muted shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-trust-text">
                            {assetForToken(thread.tokenId)?.displayName || 'Tokenized asset'}
                          </span>
                          <StatusBadge status={latest?.status} />
                          {incoming && latest?.status === 'PROPOSED' && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                              Counter-offer — needs your response
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-trust-text-muted mt-1">
                          <span className="font-mono">{thread.tokenId?.slice(0, 14)}…</span>
                          {' · '}
                          With <span className="font-mono font-semibold text-trust-text">{counterpartyOf(latest, user)}</span>
                          {' · '}
                          {Number(latest?.units).toLocaleString()} units @ ₹{pricePaiseToInr(latest?.pricePaise)}
                          {' · '}
                          {thread.items.length} message{thread.items.length > 1 ? 's' : ''} in negotiation
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-trust-text-subtle shrink-0" />
                  </div>
                </button>

                {open && (
                  <div className="border-t border-trust-border p-4 space-y-3 bg-slate-50/50">
                    {thread.items.map((item) => {
                      const mine = !isIncoming(item, user);
                      return (
                        <div key={item.id} className={`p-3 rounded-lg border text-xs ${mine ? 'bg-white border-trust-border' : 'bg-[#FFFBEB] border-[#FDE68A]'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-trust-primary flex items-center gap-1.5">
                              <MessageSquareText className="w-3.5 h-3.5 text-trust-secondary" />
                              {mine ? 'You offered' : `${counterpartyOf(item, user)} proposed`}
                            </span>
                            <span className="font-mono text-xs text-trust-text-muted">{item.id}</span>
                          </div>
                          <div className="mt-1.5 font-mono">
                            {Number(item.units).toLocaleString()} units @ ₹{pricePaiseToInr(item.pricePaise)}
                            <span className="ml-2 align-middle"><StatusBadge status={item.status} /></span>
                          </div>
                          {item.paymentRef && <p className="mt-1 text-trust-text-muted">“{item.paymentRef}”</p>}
                          <p className="mt-1 text-xs text-trust-text-subtle">{item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : ''}</p>
                        </div>
                      );
                    })}

                    {thread.actionable && (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => openCounter(thread.actionable)}
                          className="px-3 py-1.5 rounded-lg border border-trust-border text-trust-primary hover:bg-white text-xs font-semibold transition"
                        >
                          Revise terms
                        </button>
                        <button
                          onClick={() => {
                            setDeclineReason('');
                            setDeclineTarget(thread.actionable);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-trust-error-bg hover:bg-[#FEE2E2] text-trust-error border border-trust-error-border text-xs font-semibold transition"
                        >
                          Withdraw
                        </button>
                        <button
                          onClick={() => setExecuteTarget(thread.actionable)}
                          className="trust-btn-primary"
                        >
                          <Play className="w-3 h-3" />
                          Accept & settle
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

      {counterTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-trust-border rounded-lg max-w-md w-full p-6 shadow-popover space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-trust-border">
              <h3 className="text-sm font-semibold text-trust-primary">Revise Offer Terms</h3>
              <button onClick={() => setCounterTarget(null)} className="p-1 hover:bg-slate-100 rounded text-trust-text-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCounter} className="space-y-3 text-xs">
              <p className="text-trust-text-muted">Revising <span className="font-mono text-trust-primary">{counterTarget.id}</span> — the previous terms are superseded on ledger.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-trust-text-muted font-medium mb-1">Units</label>
                  <input type="number" value={counterUnits} onChange={(e) => setCounterUnits(e.target.value)} className="w-full px-3 py-2 border border-trust-border rounded-lg font-mono" min="1" required />
                </div>
                <div>
                  <label className="block text-trust-text-muted font-medium mb-1">Price (₹)</label>
                  <input type="number" value={counterPriceInr} onChange={(e) => setCounterPriceInr(e.target.value)} className="w-full px-3 py-2 border border-trust-border rounded-lg font-mono" min="0" />
                </div>
              </div>
              <div>
                <label className="block text-trust-text-muted font-medium mb-1">Note</label>
                <textarea value={counterNote} onChange={(e) => setCounterNote(e.target.value)} rows={2} className="w-full px-3 py-2 border border-trust-border rounded-lg" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setCounterTarget(null)} className="px-4 py-2 border border-trust-border rounded-lg text-trust-text-muted">Cancel</button>
                <button type="submit" disabled={counterSubmitting} className="trust-btn-primary">
                  {counterSubmitting ? 'Sending...' : 'Send Revised Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {declineTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-trust-border rounded-lg max-w-md w-full p-6 shadow-popover space-y-4 text-xs">
            <h3 className="text-sm font-semibold text-trust-primary">Withdraw Offer {declineTarget.id}?</h3>
            <textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} rows={2} placeholder="Reason (recorded on ledger)" className="w-full px-3 py-2 border border-trust-border rounded-lg" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeclineTarget(null)} className="px-4 py-2 border border-trust-border rounded-lg text-trust-text-muted">Keep</button>
              <button onClick={handleDecline} disabled={declining} className="px-4 py-2 bg-trust-error text-white rounded-lg font-semibold">
                {declining ? 'Withdrawing...' : 'Withdraw Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(executeTarget)}
        title="Accept & settle on Ledger"
        message={`Settle offer ${executeTarget?.id}? This atomically moves ${executeTarget?.units?.toLocaleString()} units from ${executeTarget?.fromParticipantId} to ${executeTarget?.toParticipantId}. Irreversible.`}
        confirmLabel={executing ? 'Settling...' : 'Accept & settle'}
        variant="warning"
        onConfirm={handleExecute}
        onCancel={() => setExecuteTarget(null)}
      />
    </div>
  );
}
