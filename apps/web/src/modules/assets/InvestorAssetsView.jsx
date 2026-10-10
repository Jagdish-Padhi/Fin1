import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { AssetDetailDrawer } from './AssetDetailDrawer.jsx';
import { ProposeOfferModal, formatInr } from '../offers/ProposeOfferModal.jsx';
import { myLedgerId } from '../offers/offerUtils.js';
import { Search, RefreshCw, ArrowRight, MapPin, Info, AlertCircle } from 'lucide-react';

const humanize = (v) =>
  String(v || '').replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

const isCurrent = (v) => v.status === 'APPROVED' && (!v.validUntil || new Date(v.validUntil) > new Date());

function latestApprovedValuation(valuations, assetId) {
  return valuations
    .filter((v) => v.assetId === assetId && isCurrent(v))
    .sort((a, b) => new Date(b.approvedAt || b.createdAt || 0) - new Date(a.approvedAt || a.createdAt || 0))[0] || null;
}

function OfferState({ state }) {
  const styles = {
    open: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    held: 'bg-sky-50 text-sky-800 border-sky-200',
    owned: 'bg-sky-50 text-sky-800 border-sky-200',
    soldout: 'bg-slate-100 text-slate-600 border-slate-200',
    closed: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  const labels = {
    open: 'Open for offers',
    pending: 'Offer pending',
    held: 'In your portfolio',
    owned: 'Fully owned by you',
    soldout: 'No units available',
    closed: 'Not yet tokenized',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${styles[state]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {labels[state]}
    </span>
  );
}

export function InvestorAssetsView({ onNavigate }) {
  const { user } = useAuth();
  const me = myLedgerId(user);

  const [assets, setAssets] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [valuations, setValuations] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [holders, setHolders] = useState({}); // tokenId -> [{ id, units }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [scope, setScope] = useState('open'); // 'open' | 'all'
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [offerFor, setOfferFor] = useState(null); // { asset, token, valuation }
  const [detailId, setDetailId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const [aRes, tRes, vRes, trRes] = await Promise.allSettled([
      api.getAssets(),
      api.getTokens(),
      api.getValuations(),
      api.getTransfers(),
    ]);
    if (aRes.status === 'fulfilled') setAssets(aRes.value?.data || []);
    else setError(aRes.reason?.message || 'Failed to load assets');
    const tokenList = tRes.status === 'fulfilled' ? tRes.value?.data || [] : [];
    setTokens(tokenList);
    const holderRes = await Promise.allSettled(tokenList.map((t) => api.getTokenHolders(t.id)));
    const byToken = {};
    tokenList.forEach((t, i) => {
      const list = holderRes[i].status === 'fulfilled' ? holderRes[i].value?.data || [] : [];
      byToken[t.id] = list.map((h) => ({ id: h.participantId || h.holderId, units: Number(h.units ?? h.balance ?? 0) }));
    });
    setHolders(byToken);
    if (vRes.status === 'fulfilled') setValuations(vRes.value?.data || []);
    if (trRes.status === 'fulfilled') setTransfers(trRes.value?.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const listings = useMemo(() => {
    return assets.map((asset) => {
      const token = tokens.find((t) => t.assetId === asset.id && (t.status || 'ACTIVE') === 'ACTIVE') || null;
      const valuation = latestApprovedValuation(valuations, asset.id);
      const pending = token
        ? transfers.some((t) => t.tokenId === token.id && t.status === 'PROPOSED' && t.toParticipantId === me)
        : false;
      const tokenHolders = token ? holders[token.id] : undefined;
      const heldUnits = (tokenHolders || []).filter((h) => h.id === me).reduce((n, h) => n + h.units, 0);
      // Unknown holder data (request failed) is treated as available; the offer dialog re-checks.
      const available = tokenHolders ? tokenHolders.filter((h) => h.id !== me).reduce((n, h) => n + h.units, 0) : Number(token?.totalUnits || 0);
      let state = 'open';
      if (!token) state = 'closed';
      else if (pending) state = 'pending';
      else if (available <= 0) state = heldUnits > 0 ? 'owned' : 'soldout';
      else if (heldUnits > 0) state = 'held';
      return { asset, token, valuation, state, heldUnits, available };
    });
  }, [assets, tokens, valuations, transfers, holders, me]);

  const typeOptions = useMemo(() => [...new Set(assets.map((a) => a.typeKey).filter(Boolean))].sort(), [assets]);
  const isOpen = (l) => ['open', 'held', 'pending'].includes(l.state);
  const openCount = listings.filter(isOpen).length;

  const visible = listings.filter((l) => {
    const { asset } = l;
    if (scope === 'open' && !isOpen(l)) return false;
    if (typeFilter !== 'ALL' && asset.typeKey !== typeFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      asset.displayName?.toLowerCase().includes(q) ||
      asset.id?.toLowerCase().includes(q) ||
      asset.jurisdiction?.toLowerCase().includes(q) ||
      String(asset.attributes?.locality || '').toLowerCase().includes(q)
    );
  });

  const openListing = (listing) => {
    if (listing.state === 'pending' || listing.state === 'owned') {
      onNavigate?.('invest');
      return;
    }
    if (listing.state === 'closed' || listing.state === 'soldout') {
      setDetailId(listing.asset.id);
      return;
    }
    setOfferFor(listing);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Assets</h1>
          <p className="page-subtitle">
            Verified, valued and tokenized real-world assets. Select an asset to make an offer to its issuer.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="trust-btn-secondary !px-2.5" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div role="tablist" aria-label="Asset scope" className="inline-flex p-1 rounded-md bg-slate-100 border border-trust-border-subtle self-start">
          {[
            ['open', `Open for offers`, openCount],
            ['all', 'All assets', assets.length],
          ].map(([key, label, count]) => (
            <button
              key={key}
              role="tab"
              aria-selected={scope === key}
              onClick={() => setScope(key)}
              className={`px-3 py-1.5 rounded text-sm ${
                scope === key ? 'bg-white text-trust-text font-medium shadow-subtle' : 'text-trust-text-muted hover:text-trust-text'
              }`}
            >
              {label} <span className="tabular-nums text-trust-text-subtle">{count}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-trust-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, ID or location"
            className="trust-input w-full pl-9"
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="trust-input lg:w-48" aria-label="Asset class">
          <option value="ALL">All asset classes</option>
          {typeOptions.map((t) => (
            <option key={t} value={t}>{humanize(t)}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-3.5 rounded-md bg-trust-error-bg border border-trust-error-border text-sm text-trust-error flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {loading && assets.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="trust-card p-5 h-56 animate-pulse">
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="mt-4 h-5 w-3/4 bg-slate-100 rounded" />
              <div className="mt-2 h-3 w-1/3 bg-slate-100 rounded" />
              <div className="mt-8 h-10 bg-slate-50 rounded" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="trust-card p-12 text-center">
          <p className="text-sm font-medium text-trust-text">No assets match</p>
          <p className="mt-1 text-sm text-trust-text-muted">
            {scope === 'open' ? 'No tokenized assets are open for offers right now.' : 'Try a different search or asset class.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((listing) => {
            const { asset, token, valuation, state, heldUnits, available } = listing;
            const whole = token && (String(token.standard).toUpperCase() === 'WHOLE' || Number(token.totalUnits) === 1);
            const location = asset.attributes?.locality || asset.jurisdiction;
            const cta = {
              open: 'Make an offer',
              held: 'Buy more',
              pending: 'View your offer',
              owned: 'View holding',
              soldout: 'View details',
              closed: 'View details',
            }[state];
            const actionable = ['open', 'held', 'pending', 'owned'].includes(state);
            return (
              <article
                key={asset.id}
                className={`trust-card flex flex-col transition-colors ${actionable ? 'hover:border-slate-400' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => openListing(listing)}
                  className="flex-1 text-left p-5 rounded-t-lg focus-visible:outline-offset-[-2px]"
                  aria-label={`${cta}: ${asset.displayName}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-trust-text-muted">{humanize(asset.typeKey)}</span>
                    <OfferState state={state} />
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-trust-text leading-snug line-clamp-2">{asset.displayName}</h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-trust-text-muted">
                    <span className="font-mono">{asset.id}</span>
                    {location && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{location}</span>
                      </span>
                    )}
                  </div>

                  <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-trust-text-muted">Certified value</dt>
                      <dd className="mt-0.5 font-medium text-trust-text tabular-nums">{valuation ? formatInr(valuation.amountPaise) : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-trust-text-muted">Ownership</dt>
                      <dd className="mt-0.5 font-medium text-trust-text">{token ? (whole ? 'Whole' : 'Fractional') : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-trust-text-muted">{heldUnits > 0 ? 'You hold' : 'Available'}</dt>
                      <dd className="mt-0.5 font-medium text-trust-text tabular-nums">
                        {!token
                          ? '—'
                          : heldUnits > 0
                          ? `${heldUnits.toLocaleString('en-IN')} / ${Number(token.totalUnits).toLocaleString('en-IN')}`
                          : `${available.toLocaleString('en-IN')} / ${Number(token.totalUnits).toLocaleString('en-IN')}`}
                      </dd>
                    </div>
                  </dl>
                </button>

                <div className="px-5 py-3 border-t border-trust-border-subtle flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setDetailId(asset.id)}
                    className="inline-flex items-center gap-1.5 text-sm text-trust-text-muted hover:text-trust-text"
                  >
                    <Info className="w-4 h-4" />
                    Details
                  </button>
                  {actionable && (
                    <button
                      type="button"
                      onClick={() => openListing(listing)}
                      className={state === 'pending' || state === 'owned' ? 'trust-btn-secondary !py-1.5' : 'trust-btn-primary !py-1.5'}
                    >
                      {cta}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {offerFor && (
        <ProposeOfferModal
          asset={offerFor.asset}
          token={offerFor.token}
          valuation={offerFor.valuation}
          onClose={() => setOfferFor(null)}
          onSubmitted={() => {
            setOfferFor(null);
            load();
          }}
        />
      )}

      <AssetDetailDrawer
        isOpen={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        assetId={detailId}
        user={user}
        onAssetUpdated={load}
      />
    </div>
  );
}
