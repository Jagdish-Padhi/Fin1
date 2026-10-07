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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D8E0E8]">
        <div>
          <h2 className="text-xl font-bold text-[#0F2A43] flex items-center gap-2">
            <History className="w-6 h-6 text-[#1F5A7A]" />
            Consortium Audit Trail & Explorer
          </h2>
          <p className="text-xs text-[#5A6A7E] mt-1">
            Immutable chronicle of all state changes, private data collections (PDC) hashes, and block commitments.
          </p>
        </div>
      </div>

      {/* Explorer Metrics */}
      {explorer && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-[#D8E0E8] rounded-xl p-4 shadow-2xs">
            <div className="text-[10px] text-[#5A6A7E] font-bold uppercase">Latest Block Height</div>
            <div className="font-mono text-xl font-bold text-[#0F2A43] mt-1">
              #{explorer.latestBlock || 42}
            </div>
          </div>
          <div className="bg-white border border-[#D8E0E8] rounded-xl p-4 shadow-2xs">
            <div className="text-[10px] text-[#5A6A7E] font-bold uppercase">Committed Transactions</div>
            <div className="font-mono text-xl font-bold text-[#1F5A7A] mt-1">
              {explorer.txCount || 128}
            </div>
          </div>
          <div className="bg-white border border-[#D8E0E8] rounded-xl p-4 shadow-2xs">
            <div className="text-[10px] text-[#5A6A7E] font-bold uppercase">Consortium Peers</div>
            <div className="font-mono text-xl font-bold text-[#18794E] mt-1">
              6 Active
            </div>
          </div>
          <div className="bg-white border border-[#D8E0E8] rounded-xl p-4 shadow-2xs">
            <div className="text-[10px] text-[#5A6A7E] font-bold uppercase">Ledger State Channel</div>
            <div className="font-mono text-xs font-bold text-[#0F766E] mt-2 truncate">
              rwa-channel
            </div>
          </div>
        </div>
      )}

      {/* Audit Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#5A6A7E]" />
          <input
            type="text"
            placeholder="Filter audit entries by action, entity ID, or signer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#D8E0E8] rounded-lg text-xs text-[#17202A] placeholder-[#5A6A7E] focus:outline-none focus:border-[#1F5A7A]"
          />
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white border border-[#D8E0E8] rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#D8E0E8] text-[#5A6A7E] uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Tx ID / Block</th>
                <th className="px-4 py-3">Entity ID</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor / Signer</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8E0E8] text-[#17202A]">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-[#5A6A7E]">
                    Reading immutable ledger records...
                  </td>
                </tr>
              ) : filteredTrail.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-[#5A6A7E]">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                filteredTrail.map((record, i) => (
                  <tr key={i} className="hover:bg-[#F8FAFC] transition">
                    <td className="px-4 py-3 font-mono text-[11px] text-[#0F2A43]">
                      {record.txId ? record.txId.slice(0, 14) + '...' : `tx-blk-${i + 1}`}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-[#1F5A7A]">
                      {record.entityId}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#17202A]">
                      {record.action}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#5A6A7E]">
                      {record.performedBy || 'SystemMSP'}
                    </td>
                    <td className="px-4 py-3 text-[#5A6A7E]">
                      {record.timestamp ? new Date(record.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#ECFDF5] text-[#18794E] border border-[#A7F3D0]">
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
