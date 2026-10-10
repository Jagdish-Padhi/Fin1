import React, { useEffect, useState } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { useToast } from '../../shared/components/Toast.jsx';
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
  X,
} from 'lucide-react';

export function IdentityAdminView() {
  const { user } = useAuth();
  const toast = useToast();
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
      toast.success(`Consortium user "${formData.name}" onboarded and enrolled with Fabric CA.`);
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
      toast.success(`User ${targetUser.name} status updated to ${nextStatus}.`);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            Consortium Governance
          </h2>
          <p className="page-subtitle">
            Cryptographic identity provisioning, Fabric CA user mapping, and member organization management
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={loading}
            className="trust-btn-secondary !px-2.5"
            title="Refresh identities"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-trust-accent' : ''}`} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="trust-btn-primary"
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision User</span>
          </button>
        </div>
      </div>

      {/* Consortium Member Orgs Overview */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-trust-primary flex items-center gap-2">
          <Building className="w-4 h-4 text-trust-secondary" />
          <span>Connected Consortium Organizations (MSPs)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {orgs.map((org) => (
            <div key={org.id} className="trust-card p-4 space-y-2 hover:border-[#BAC7D5] transition">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-trust-primary text-xs">{org.name}</span>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-trust-accent-light text-trust-accent border border-[#CCFBF1]">
                  {org.mspId}
                </span>
              </div>
              <div className="text-xs text-trust-text-muted font-mono">Org ID: {org.id}</div>
              <div className="flex items-center gap-1.5 text-xs text-trust-success font-medium pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Fabric CA & Peer Synced</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Provisioned Users Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-trust-primary flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-trust-accent" />
          <span>Consortium User Directory</span>
        </h3>

        <div className="trust-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-slate-50 border-b border-trust-border text-xs text-trust-text-muted font-medium">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Consortium Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-trust-border-subtle">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-trust-text-muted">
                      Loading consortium directory...
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-trust-primary">{u.name}</div>
                        <div className="text-xs text-trust-text-muted">{u.email}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-trust-text">{u.orgId}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-trust-primary border border-trust-border">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                            u.status === 'ACTIVE'
                              ? 'bg-trust-success-bg text-trust-success border-trust-success-border'
                              : 'bg-trust-error-bg text-trust-error border-trust-error-border'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                            u.status === 'ACTIVE'
                              ? 'text-trust-error hover:bg-trust-error-bg'
                              : 'text-trust-success hover:bg-trust-success-bg'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-trust-border rounded-lg w-full max-w-md p-6 space-y-4 shadow-popover">
            <div className="flex items-center justify-between pb-3 border-b border-trust-border">
              <h3 className="text-base font-semibold text-trust-primary">
                Provision Consortium Identity
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-trust-text-muted hover:text-trust-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-trust-error-bg border border-trust-error-border text-xs text-trust-error">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-trust-text mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full bg-slate-50 border border-trust-border rounded-lg p-2.5 text-xs text-trust-text focus:outline-none focus:border-trust-secondary focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-trust-text mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@organization.in"
                  className="w-full bg-slate-50 border border-trust-border rounded-lg p-2.5 text-xs text-trust-text focus:outline-none focus:border-trust-secondary focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-trust-text mb-1">Member Organization *</label>
                <select
                  value={formData.orgId}
                  onChange={(e) => setFormData({ ...formData, orgId: e.target.value })}
                  className="w-full bg-slate-50 border border-trust-border rounded-lg p-2.5 text-xs text-trust-text focus:outline-none focus:border-trust-secondary"
                >
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.mspId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-trust-text mb-1">Consortium Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-50 border border-trust-border rounded-lg p-2.5 text-xs text-trust-text focus:outline-none focus:border-trust-secondary"
                >
                  <option value="ADMINISTRATOR">ADMINISTRATOR</option>
                  <option value="ISSUER">ISSUER</option>
                  <option value="VERIFIER">VERIFIER</option>
                  <option value="VALUER">VALUER</option>
                  <option value="COMPLIANCE">COMPLIANCE</option>
                  <option value="INVESTOR">INVESTOR</option>
                  <option value="AUDITOR">AUDITOR</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-trust-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-trust-text-muted hover:text-trust-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="trust-btn-primary"
                >
                  {submitting ? 'Provisioning...' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
