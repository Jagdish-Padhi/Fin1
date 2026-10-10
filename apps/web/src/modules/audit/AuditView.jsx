import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';
import {
  History,
  Search,
  Box,
  Layers,
  Database,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

export function AuditView() {
  const [trail, setTrail] = useState([]);
  const [explorer, setExplorer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterEntityId, setFilterEntityId] = useState('');
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [trailRes, expRes] = await Promise.all([
        api.getAuditTrail(filterEntityId || undefined),
        api.getExplorer(),
      ]);
      setTrail(trailRes.data || []);
      setExplorer(expRes.data || null);
    } catch (err) {
      console.error('Failed to load audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterEntityId]);

  const filteredTrail = trail.filter((item) => {
    const q = search.toLowerCase();
    return (
      (item.entityId || '').toLowerCase().includes(q) ||
      (item.action || '').toLowerCase().includes(q) ||
      (item.performedBy || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            Consortium Audit Trail & Explorer
          </h2>
          <p className="page-subtitle">
            Immutable chronicle of all state changes, private data collections (PDC) hashes, and block commitments.
          </p>
        </div>
      </div>

      {/* Explorer Metrics */}
      {explorer && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-trust-border rounded-lg p-4 shadow-subtle">
            <div className="text-xs text-trust-text-muted font-semibold">Latest Block Height</div>
            <div className="font-mono text-xl font-semibold text-trust-primary mt-1">
              #{explorer.latestBlock || 42}
            </div>
          </div>
          <div className="bg-white border border-trust-border rounded-lg p-4 shadow-subtle">
            <div className="text-xs text-trust-text-muted font-semibold">Committed Transactions</div>
            <div className="font-mono text-xl font-semibold text-trust-secondary mt-1">
              {explorer.txCount || 128}
            </div>
          </div>
          <div className="bg-white border border-trust-border rounded-lg p-4 shadow-subtle">
            <div className="text-xs text-trust-text-muted font-semibold">Consortium Peers</div>
            <div className="font-mono text-xl font-semibold text-trust-success mt-1">
              6 Active
            </div>
          </div>
          <div className="bg-white border border-trust-border rounded-lg p-4 shadow-subtle">
            <div className="text-xs text-trust-text-muted font-semibold">Ledger State Channel</div>
            <div className="font-mono text-xs font-semibold text-trust-accent mt-2 truncate">
              rwa-channel
            </div>
          </div>
        </div>
      )}

      {/* Audit Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-trust-text-muted" />
          <input
            type="text"
            placeholder="Filter audit entries by action, entity ID, or signer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="trust-input w-full pl-9 pr-3"
          />
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white border border-trust-border rounded-lg overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 border-b border-trust-border text-trust-text-muted font-medium">
              <tr>
                <th className="px-4 py-3">Tx ID / Block</th>
                <th className="px-4 py-3">Entity ID</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor / Signer</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-trust-border text-trust-text">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-trust-text-muted">
                    Reading immutable ledger records...
                  </td>
                </tr>
              ) : filteredTrail.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-trust-text-muted">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                filteredTrail.map((record, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-trust-primary">
                      {record.txId ? record.txId.slice(0, 14) + '...' : `tx-blk-${i + 1}`}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-trust-secondary">
                      {record.entityId}
                    </td>
                    <td className="px-4 py-3 font-semibold text-trust-text">
                      {record.action}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-trust-text-muted">
                      {record.performedBy || 'SystemMSP'}
                    </td>
                    <td className="px-4 py-3 text-trust-text-muted">
                      {record.timestamp ? new Date(record.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#ECFDF5] text-trust-success border border-[#A7F3D0]">
                        COMMITTED
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
