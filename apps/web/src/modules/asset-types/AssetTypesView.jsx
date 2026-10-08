import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { useToast } from '../../shared/components/Toast.jsx';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog.jsx';
import {
  Building,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Globe,
  FileCheck,
  ChevronDown,
  ChevronUp,
  X,
  Archive,
} from 'lucide-react';

export function AssetTypesView() {
  const { user } = useAuth();
  const toast = useToast();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedKey, setExpandedKey] = useState('VEHICLE');
  const [deprecateTarget, setDeprecateTarget] = useState(null);
  const [deprecating, setDeprecating] = useState(false);

  // Define Asset Type Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createKey, setCreateKey] = useState('');
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createCategory, setCreateCategory] = useState('EQUIPMENT');
  const [createJurisdiction, setCreateJurisdiction] = useState('IN');
  const [createUniqueFields, setCreateUniqueFields] = useState('');
  const [createMandatoryEvidence, setCreateMandatoryEvidence] = useState('');
  const [createAttributes, setCreateAttributes] = useState([
    { name: 'serialNumber', type: 'string', required: true, visibility: 'PUBLIC' },
    { name: 'assetCost', type: 'number', required: true, visibility: 'RESTRICTED' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAssetTypes();
      if (res?.data) {
        setTypes(res.data);
      }
    } catch (err) {
      console.error('Failed to load asset types:', err);
      setError(err?.response?.data?.error?.message || err.message || 'Failed to load asset types');
    } finally {
      setLoading(false);
    }
  };

  const handleDeprecate = (key) => {
    setDeprecateTarget(key);
  };

  const confirmDeprecate = async () => {
    if (!deprecateTarget) return;
    try {
      setDeprecating(true);
      await api.deprecateAssetType(deprecateTarget);
      toast.success(`Asset type ${deprecateTarget} has been deprecated successfully.`);
      setDeprecateTarget(null);
      await loadTypes();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err.message || 'Deprecation failed');
    } finally {
      setDeprecating(false);
    }
  };

  const handleAddAttributeRow = () => {
    setCreateAttributes([
      ...createAttributes,
      { name: '', type: 'string', required: false, visibility: 'PUBLIC' },
    ]);
  };

  const handleRemoveAttributeRow = (idx) => {
    setCreateAttributes(createAttributes.filter((_, i) => i !== idx));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setCreateError(null);

      const attributeSchema = {};
      for (const attr of createAttributes) {
        if (!attr.name.trim()) continue;
        attributeSchema[attr.name.trim()] = {
          type: attr.type,
          required: attr.required,
          visibility: attr.visibility,
        };
      }

      const uniqueFields = createUniqueFields
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const mandatoryEvidence = createMandatoryEvidence
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

      const payload = {
        key: createKey.toUpperCase().trim(),
        name: createName.trim(),
        description: createDesc.trim(),
        category: createCategory,
        defaultJurisdiction: createJurisdiction,
        uniqueFields,
        mandatoryEvidence,
        attributeSchema,
      };

      await api.defineAssetType(payload);
      setShowCreateModal(false);
      toast.success(`Asset type schema '${createKey.toUpperCase().trim()}' anchored to ledger successfully.`);
      // Reset form
      setCreateKey('');
      setCreateName('');
      setCreateDesc('');
      await loadTypes();
    } catch (err) {
      console.error('Failed to define asset type:', err);
      setCreateError(err?.response?.data?.error?.message || err.message || 'Failed to define asset type');
    } finally {
      setSubmitting(false);
    }
  };

  const isAdmin = user?.role === 'ADMINISTRATOR';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#17202A] tracking-tight">Asset Type Engine</h1>
          <p className="text-xs text-[#5A6A7E] mt-0.5">
            Attribute schemas, privacy rules, and mandatory evidence policies
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadTypes}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-[#D8E0E8] text-[#5A6A7E] hover:text-[#17202A] hover:bg-[#F8FAFC] transition shadow-xs"
            title="Refresh types"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="py-2 px-3.5 rounded-xl bg-[#0F2A43] hover:bg-[#1F5A7A] text-white text-xs font-semibold flex items-center gap-2 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Define Asset Type
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#B42318]/10 border border-[#B42318]/20 text-xs text-[#B42318] flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Type Cards Grid */}
      <div className="grid grid-cols-1 gap-4">
        {loading && types.length === 0 ? (
          <div className="p-12 text-center text-[#5A6A7E] bg-white rounded-2xl border border-[#D8E0E8]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#0F766E] mx-auto mb-2" />
            <span className="text-xs font-mono">Loading Asset Type Schemas...</span>
          </div>
        ) : (
          types.map((typeDef) => {
            const isExpanded = expandedKey === typeDef.key;
            const isDeprecated = typeDef.status === 'DEPRECATED';

            return (
              <div
                key={typeDef.key}
                className="bg-white border border-[#D8E0E8] rounded-2xl overflow-hidden shadow-xs hover:border-[#1F5A7A] transition"
              >
                {/* Header row */}
                <div
                  className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 cursor-pointer hover:bg-[#F8FAFC]/50 transition"
                  onClick={() => setExpandedKey(isExpanded ? null : typeDef.key)}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-center ${
                        isDeprecated
                          ? 'bg-slate-100 text-slate-500 border-slate-200'
                          : 'bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/20'
                      }`}
                    >
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#17202A] tracking-tight">
                          {typeDef.name}
                        </h3>
                        <span className="font-mono text-xs text-[#0F2A43] bg-[#0F2A43]/10 px-2 py-0.5 rounded border border-[#0F2A43]/20 font-semibold">
                          {typeDef.key}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            isDeprecated
                              ? 'bg-[#B42318]/10 text-[#B42318] border-[#B42318]/20'
                              : 'bg-[#18794E]/10 text-[#18794E] border-[#18794E]/20'
                          }`}
                        >
                          {typeDef.status || 'ACTIVE'}
                        </span>
                      </div>
                      <p className="text-xs text-[#5A6A7E] mt-1 max-w-2xl">{typeDef.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-auto">
                    {isAdmin && !isDeprecated && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeprecate(typeDef.key);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#B42318]/10 hover:bg-[#B42318]/20 text-[#B42318] border border-[#B42318]/20 text-xs font-semibold transition flex items-center gap-1.5"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        Deprecate
                      </button>
                    )}
                    <button className="p-1 rounded-lg text-[#5A6A7E] hover:text-[#17202A]">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-[#D8E0E8] p-5 bg-[#F8FAFC] space-y-5">
                    {/* Unique Fields & Mandatory Evidence Badges */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-xl bg-white border border-[#D8E0E8] space-y-2 shadow-xs">
                        <div className="text-[10px] uppercase font-bold text-[#5A6A7E] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0F2A43]" />
                          Duplicate Prevention (Unique Key Fields)
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {typeDef.uniqueFields && typeDef.uniqueFields.length > 0 ? (
                            typeDef.uniqueFields.map((f) => (
                              <span
                                key={f}
                                className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#0F2A43]/10 text-[#0F2A43] border border-[#0F2A43]/20 font-semibold"
                              >
                                {f}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-[#5A6A7E]">None defined</span>
                          )}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white border border-[#D8E0E8] space-y-2 shadow-xs">
                        <div className="text-[10px] uppercase font-bold text-[#5A6A7E] flex items-center gap-1.5">
                          <FileCheck className="w-3.5 h-3.5 text-[#18794E]" />
                          Mandatory Evidence Documents Required
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {typeDef.mandatoryEvidence && typeDef.mandatoryEvidence.length > 0 ? (
                            typeDef.mandatoryEvidence.map((d) => (
                              <span
                                key={d}
                                className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#18794E]/10 text-[#18794E] border border-[#18794E]/20 font-semibold"
                              >
                                {d}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-[#5A6A7E]">None required</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Attribute Schema Table */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-[#17202A] flex items-center justify-between">
                        <span>Dynamic Attribute Schema</span>
                        <span className="text-[11px] font-mono text-[#5A6A7E]">
                          {Object.keys(typeDef.attributeSchema || {}).length} fields
                        </span>
                      </div>

                      <div className="rounded-xl border border-[#D8E0E8] overflow-hidden bg-white shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#F8FAFC] border-b border-[#D8E0E8] text-[#5A6A7E] uppercase font-semibold text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Field Key</th>
                              <th className="py-2.5 px-3">Data Type</th>
                              <th className="py-2.5 px-3">Requirement</th>
                              <th className="py-2.5 px-3">Visibility / Privacy</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#D8E0E8] text-[#17202A] font-medium">
                            {Object.entries(typeDef.attributeSchema || {}).map(
                              ([fieldName, rule]) => (
                                <tr key={fieldName} className="hover:bg-[#F8FAFC]/60 transition">
                                  <td className="py-2.5 px-3 font-mono font-bold text-[#17202A]">
                                    {fieldName}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[#5A6A7E]">
                                    {rule.type}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {rule.required ? (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#A16207]/10 text-[#A16207] border border-[#A16207]/20 font-bold">
                                        Mandatory
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#F8FAFC] text-[#5A6A7E] border border-[#D8E0E8]">
                                        Optional
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {rule.visibility === 'RESTRICTED' ? (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#B42318]/10 text-[#B42318] border border-[#B42318]/20 flex items-center gap-1 w-max font-semibold">
                                        <Lock className="w-3 h-3" />
                                        Restricted (PDC)
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20 flex items-center gap-1 w-max font-semibold">
                                        <Globe className="w-3 h-3" />
                                        Public Consortium
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Define Asset Type Modal (Admin Only) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2A43]/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-[#D8E0E8] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            <div className="p-4 border-b border-[#D8E0E8] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-[#0F766E]" />
                <h3 className="text-sm font-bold text-[#17202A]">Define New Asset Type</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-[#5A6A7E] hover:text-[#17202A] hover:bg-[#F8FAFC] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              {createError && (
                <div className="p-3 rounded-lg bg-[#B42318]/10 border border-[#B42318]/20 text-xs text-[#B42318]">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#5A6A7E]">
                    Type Key (Identifier) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SOLAR_FARM"
                    value={createKey}
                    onChange={(e) => setCreateKey(e.target.value.toUpperCase())}
                    required
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-white border border-[#D8E0E8] text-xs text-[#17202A] font-mono focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#5A6A7E]">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Utility Solar Installation"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-white border border-[#D8E0E8] text-xs text-[#17202A] focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[#5A6A7E]">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Asset description and regulatory bounds"
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-white border border-[#D8E0E8] text-xs text-[#17202A] focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#5A6A7E]">
                    Unique Key Fields (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. gridConnectionId, permitNumber"
                    value={createUniqueFields}
                    onChange={(e) => setCreateUniqueFields(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-white border border-[#D8E0E8] text-xs text-[#17202A] font-mono focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#5A6A7E]">
                    Mandatory Evidence (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GRID_LICENSE, PPA_CONTRACT"
                    value={createMandatoryEvidence}
                    onChange={(e) => setCreateMandatoryEvidence(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-white border border-[#D8E0E8] text-xs text-[#17202A] font-mono focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>
              </div>

              {/* Dynamic Attribute Fields */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-[#5A6A7E]">
                    Dynamic Attributes
                  </label>
                  <button
                    type="button"
                    onClick={handleAddAttributeRow}
                    className="text-xs text-[#0F766E] hover:text-[#0D625C] font-semibold"
                  >
                    + Add Field
                  </button>
                </div>

                <div className="space-y-2">
                  {createAttributes.map((attr, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#D8E0E8] flex items-center gap-2"
                    >
                      <input
                        type="text"
                        placeholder="fieldName"
                        value={attr.name}
                        onChange={(e) => {
                          const updated = [...createAttributes];
                          updated[idx].name = e.target.value;
                          setCreateAttributes(updated);
                        }}
                        className="flex-1 px-2.5 py-1 rounded bg-white border border-[#D8E0E8] text-xs text-[#17202A] font-mono focus:outline-none focus:border-[#0F766E]"
                      />
                      <select
                        value={attr.type}
                        onChange={(e) => {
                          const updated = [...createAttributes];
                          updated[idx].type = e.target.value;
                          setCreateAttributes(updated);
                        }}
                        className="px-2 py-1 rounded bg-white border border-[#D8E0E8] text-xs text-[#17202A] focus:outline-none focus:border-[#0F766E]"
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                      </select>
                      <select
                        value={attr.visibility}
                        onChange={(e) => {
                          const updated = [...createAttributes];
                          updated[idx].visibility = e.target.value;
                          setCreateAttributes(updated);
                        }}
                        className="px-2 py-1 rounded bg-white border border-[#D8E0E8] text-xs text-[#17202A] focus:outline-none focus:border-[#0F766E]"
                      >
                        <option value="PUBLIC">PUBLIC</option>
                        <option value="RESTRICTED">RESTRICTED</option>
                      </select>
                      <label className="flex items-center gap-1 text-[10px] text-[#5A6A7E] font-medium">
                        <input
                          type="checkbox"
                          checked={attr.required}
                          onChange={(e) => {
                            const updated = [...createAttributes];
                            updated[idx].required = e.target.checked;
                            setCreateAttributes(updated);
                          }}
                        />
                        Req
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttributeRow(idx)}
                        className="p-1 rounded text-[#B42318] hover:text-red-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#D8E0E8] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-white border border-[#D8E0E8] text-[#5A6A7E] hover:text-[#17202A] hover:bg-[#F8FAFC] text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-[#0F2A43] hover:bg-[#1F5A7A] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  {submitting ? 'Anchoring...' : 'Register Schema'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Asset Type Deprecation */}
      <ConfirmDialog
        isOpen={Boolean(deprecateTarget)}
        title="Deprecate Asset Type"
        message={`Are you sure you want to deprecate asset type schema "${deprecateTarget}"? Existing assets will remain valid, but no new assets can be registered using this schema.`}
        confirmLabel="Deprecate Type"
        variant="danger"
        isLoading={deprecating}
        onConfirm={confirmDeprecate}
        onCancel={() => setDeprecateTarget(null)}
      />
    </div>
  );
}
