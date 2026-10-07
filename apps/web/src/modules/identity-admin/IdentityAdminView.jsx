import React, { useEffect, useState } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import {
  UserCheck,
  Building,
  UserPlus,
  Key,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Power,
  RefreshCw,
} from 'lucide-react';

export function IdentityAdminView() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    orgId: 'ORG-ISSUER',
    role: 'ISSUER',
    password: 'Password@123',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, orgsRes] = await Promise.all([
        api.getAdminUsers(),
        api.getAdminOrgs(),
      ]);
      if (usersRes?.data) setUsers(usersRes.data);
      if (orgsRes?.data) setOrgs(orgsRes.data);
    } catch (err) {
      console.error('Failed to load identity admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.createAdminUser(formData);
      setShowCreateModal(false);
      setFormData({
        name: '',
        email: '',
        orgId: 'ORG-ISSUER',
        role: 'ISSUER',
        password: 'Password@123',
      });
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to onboard consortium user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (targetUser) => {
    const nextStatus = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const reason = nextStatus === 'INACTIVE' ? 'Deactivated by Platform Administrator' : 'Reactivated';
    try {
      await api.updateUserStatus(targetUser.id, nextStatus, reason);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Administrator Identity Engine</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Consortium Organizations & Users</h2>
          <p className="text-xs text-slate-400">
            Provision consortium members, assign roles with MSP validation, and manage Fabric CA identity credentials.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision Consortium User</span>
        </button>
      </div>

      {/* Consortium Organizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {orgs.map((org) => (
          <div key={org.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-xs text-slate-100">{org.name}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>MSP ID:</span>
              <span className="font-mono text-indigo-400">{org.mspId}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Org ID:</span>
              <span className="font-mono text-slate-300">{org.id}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-400" />
            Consortium User Identities & Fabric CA Bindings
          </h3>
          <button
            onClick={fetchData}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Organization & MSP</th>
                <th className="py-3 px-4">Consortium Role</th>
                <th className="py-3 px-4">Fabric Identity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    Loading users...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100">{u.name}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      <div>{u.orgName}</div>
                      <div className="text-[10px] text-slate-500">{u.mspId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      <div>ID: {u.fabricIdentity?.enrollmentId}</div>
                      <div className="text-[10px] text-emerald-400">Fabric CA Enrolled</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.id !== user?.userId && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                            u.status === 'ACTIVE'
                              ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-400" />
              Provision Consortium User
            </h3>
            <p className="text-xs text-slate-400">
              User will automatically receive signed Fabric identity credentials with assigned role attributes.
            </p>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Maya Krishnan"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Official Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. maya@compliance.gov.in"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Organization</label>
                <select
                  value={formData.orgId}
                  onChange={(e) => setFormData({ ...formData, orgId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.mspId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  <option value="ISSUER">ISSUER</option>
                  <option value="VERIFIER">VERIFIER</option>
                  <option value="VALUER">VALUER</option>
                  <option value="COMPLIANCE">COMPLIANCE</option>
                  <option value="INVESTOR">INVESTOR</option>
                  <option value="AUDITOR">AUDITOR</option>
                  <option value="ADMINISTRATOR">ADMINISTRATOR</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Must align with selected organization MSP permissions
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg disabled:opacity-50"
                >
                  {submitting ? 'Enrolling User...' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
