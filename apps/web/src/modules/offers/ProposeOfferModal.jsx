import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { useToast } from '../../shared/components/Toast.jsx';
import { ModalPortal } from '../../shared/components/ModalPortal.jsx';
import { inrToPaise, myLedgerId } from './offerUtils.js';
import { X, Check, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';

const RULE_LABELS = {
  ASSET_TRANSFERABLE: 'Asset is transferable',
  KYC_VERIFIED: 'KYC verified',
  KYC_EXPIRED: 'KYC is current',
  MAX_HOLDING_CAP: 'Within holding cap',
  MAX_VALUE_CAP: 'Within transaction value cap',
  PARTICIPANT_ACTIVE: 'Both parties active',
  SELF_TRANSFER: 'Not a self-transfer',
  LOCKUP: 'Outside lock-up period',
  JURISDICTION: 'Jurisdiction eligible',
};

const ruleLabel = (key) =>
  RULE_LABELS[key] ||
  String(key).replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

export const formatInr = (paise) =>
  `₹${(Number(paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const isWhole = (token) => String(token?.standard || '').toUpperCase() === 'WHOLE' || Number(token?.totalUnits) === 1;

/**
 * Investor "Make an offer" dialog for one tokenized asset.
 * Runs the ledger's pre-trade compliance evaluation before submitting the offer;
 * a blocked evaluation is shown inline and nothing is sent.
 */
export function ProposeOfferModal({ asset, token, valuation, onClose, onSubmitted }) {
  const { user } = useAuth();
  const toast = useToast();
  const me = myLedgerId(user);
  const whole = isWhole(token);
  const totalUnits = Number(token?.totalUnits || 0);

  const [sellers, setSellers] = useState([]);
  const [sellerId, setSellerId] = useState('');
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [units, setUnits] = useState(1);
  const [priceInr, setPriceInr] = useState('');
  const [priceTouched, setPriceTouched] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [evalResult, setEvalResult] = useState(null);

  const unitValuePaise = valuation && totalUnits > 0 ? Number(valuation.amountPaise) / totalUnits : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getTokenHolders(token.id);
        if (cancelled) return;
        const opts = (res?.data || [])
          .map((h) => ({ id: h.participantId || h.holderId, units: Number(h.units ?? h.balance ?? 0) }))
          .filter((h) => h.id && h.id !== me && h.units > 0)
          .sort((a, b) => b.units - a.units);
        setSellers(opts);
        setSellerId(opts[0]?.id || token.initialHolderId || '');
      } catch {
        if (!cancelled) setSellerId(token.initialHolderId || '');
      } finally {
        if (!cancelled) setLoadingSellers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token.id]);

  const seller = sellers.find((s) => s.id === sellerId);
  const maxUnits = seller?.units || totalUnits || undefined;

  // Pre-fill the price from the certified valuation until the investor edits it.
  useEffect(() => {
    if (priceTouched || unitValuePaise === null) return;
    setPriceInr(String(Math.round((unitValuePaise * Number(units || 0)) / 100)));
  }, [units, unitValuePaise, priceTouched]);

  const offerPaise = inrToPaise(priceInr);
  const deltaPct = useMemo(() => {
    if (unitValuePaise === null || !units || !offerPaise) return null;
    const fair = unitValuePaise * Number(units);
    return fair > 0 ? ((offerPaise - fair) / fair) * 100 : null;
  }, [offerPaise, units, unitValuePaise]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sellerId) {
      toast.warning('No holder is currently offering units of this asset.');
      return;
    }
    const payload = {
      tokenId: token.id,
      fromParticipantId: sellerId,
      toParticipantId: me,
      units: Number(units),
      pricePaise: offerPaise,
    };
    try {
      setSubmitting(true);
      setEvalResult(null);
      const evalRes = await api.evaluateTransfer(payload);
      if (evalRes?.data && evalRes.data.passed === false) {
        setEvalResult(evalRes.data);
        return;
      }
      await api.proposeTransfer({ ...payload, paymentRef: note.trim() });
      toast.success('Offer submitted to the issuer. Track it under My investments.');
      onSubmitted?.();
    } catch (err) {
      toast.error(err.message || 'Offer could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  };

  const failedRules = evalResult?.results
    ? Object.entries(evalResult.results).filter(([, r]) => !r.passed)
    : [];

  return (
    <ModalPortal isOpen onClose={onClose}>
      <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 app-modal-backdrop" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="offer-title"
          onClick={(e) => e.stopPropagation()}
          className="bg-white border border-trust-border rounded-lg w-full max-w-xl shadow-popover max-h-[92vh] flex flex-col app-modal-content"
        >
          <div className="px-6 py-4 border-b border-trust-border flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 id="offer-title" className="text-base font-semibold text-trust-text">Make an offer</h3>
              <p className="text-sm text-trust-text-muted truncate">{asset.displayName}</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-1 rounded-md text-trust-text-subtle hover:text-trust-text hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="px-6 py-5 space-y-5">
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm rounded-md border border-trust-border-subtle bg-slate-50 p-4">
                <div>
                  <dt className="text-xs text-trust-text-muted">Certified value</dt>
                  <dd className="font-medium text-trust-text">{valuation ? formatInr(valuation.amountPaise) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-trust-text-muted">Ownership</dt>
                  <dd className="font-medium text-trust-text">{whole ? 'Whole asset' : 'Fractional'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-trust-text-muted">Total units</dt>
                  <dd className="font-medium text-trust-text tabular-nums">
                    {totalUnits.toLocaleString('en-IN')} <span className="text-trust-text-muted font-normal">{token.unitLabel?.toLowerCase()}</span>
                  </dd>
                </div>
                {!whole && unitValuePaise !== null && (
                  <div>
                    <dt className="text-xs text-trust-text-muted">Value per unit</dt>
                    <dd className="font-medium text-trust-text">{formatInr(unitValuePaise)}</dd>
                  </div>
                )}
                {valuation?.validUntil && (
                  <div>
                    <dt className="text-xs text-trust-text-muted">Valuation valid until</dt>
                    <dd className="font-medium text-trust-text">{new Date(valuation.validUntil).toLocaleDateString('en-IN')}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-trust-text-muted">Rights</dt>
                  <dd className="font-medium text-trust-text">
                    {String(token.rightsType || '—').replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())}
                  </dd>
                </div>
              </dl>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="offer-units" className="block text-sm font-medium text-trust-text mb-1.5">Units</label>
                  <input
                    id="offer-units"
                    type="number"
                    min="1"
                    max={maxUnits}
                    value={whole ? 1 : units}
                    readOnly={whole}
                    onChange={(e) => setUnits(e.target.value)}
                    className={`trust-input w-full tabular-nums ${whole ? 'bg-slate-50 text-trust-text-muted' : ''}`}
                    required
                  />
                  <p className="mt-1 text-xs text-trust-text-muted">
                    {whole ? 'This asset is sold as a single whole unit.' : maxUnits ? `Up to ${Number(maxUnits).toLocaleString('en-IN')} available` : ' '}
                  </p>
                </div>
                <div>
                  <label htmlFor="offer-price" className="block text-sm font-medium text-trust-text mb-1.5">Total offer price (₹)</label>
                  <input
                    id="offer-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceInr}
                    onChange={(e) => {
                      setPriceTouched(true);
                      setPriceInr(e.target.value);
                    }}
                    className="trust-input w-full tabular-nums"
                    required
                  />
                  <p className="mt-1 text-xs text-trust-text-muted">
                    {deltaPct === null
                      ? 'Enter the total amount you are offering.'
                      : Math.abs(deltaPct) < 0.5
                      ? 'At certified value'
                      : `${Math.abs(deltaPct).toFixed(1)}% ${deltaPct > 0 ? 'above' : 'below'} certified value`}
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="offer-seller" className="block text-sm font-medium text-trust-text mb-1.5">Seller</label>
                {loadingSellers ? (
                  <div className="text-sm text-trust-text-muted flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading holders…
                  </div>
                ) : sellers.length > 1 ? (
                  <select id="offer-seller" value={sellerId} onChange={(e) => setSellerId(e.target.value)} className="trust-input w-full">
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id} — holds {s.units.toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-trust-text">
                    <span className="font-mono">{sellerId || '—'}</span>
                    {seller && <span className="text-trust-text-muted"> · holds {seller.units.toLocaleString('en-IN')}</span>}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="offer-note" className="block text-sm font-medium text-trust-text mb-1.5">
                  Message to issuer <span className="font-normal text-trust-text-muted">(optional)</span>
                </label>
                <textarea
                  id="offer-note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Long-term hold, can settle this week"
                  className="trust-input w-full"
                />
              </div>

              {evalResult && (
                <div className="rounded-md border border-trust-error-border bg-trust-error-bg p-4 text-sm">
                  <div className="flex items-center gap-2 font-medium text-trust-error">
                    <AlertTriangle className="w-4 h-4" />
                    This offer does not pass the transfer rules
                  </div>
                  <ul className="mt-2 space-y-1 text-trust-text">
                    {(failedRules.length ? failedRules : Object.entries(evalResult.results || {})).map(([rule, r]) => (
                      <li key={rule} className="flex items-start gap-2">
                        {r.passed ? <Check className="w-4 h-4 text-trust-success mt-0.5" /> : <X className="w-4 h-4 text-trust-error mt-0.5" />}
                        <span>
                          {ruleLabel(rule)}
                          {r.reason || r.message ? <span className="text-trust-text-muted"> — {r.reason || r.message}</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="flex items-start gap-2 text-xs text-trust-text-muted">
                <ShieldCheck className="w-4 h-4 shrink-0 text-trust-secondary" />
                Transfer rules (KYC, holding and value caps) are checked before your offer is sent. The issuer can then
                accept, counter or decline; settlement is recorded on the ledger after acceptance.
              </p>
            </div>

            <div className="px-6 py-3 border-t border-trust-border-subtle bg-slate-50 rounded-b-lg flex justify-end gap-2">
              <button type="button" onClick={onClose} className="trust-btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting || loadingSellers || !sellerId} className="trust-btn-primary">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Checking and submitting…' : 'Submit offer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
