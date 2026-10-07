import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import {
  Building,
  Plus,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  Globe,
  FileCheck,
  ChevronDown,
  ChevronUp,
  X,
  Layers,
  Archive,
} from 'lucide-react';

export function AssetTypesView() {
  const { user } = useAuth();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedKey, setExpandedKey] = useState('VEHICLE');

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

  const handleDeprecate = async (key) => {
    if (!window.confirm(`Are you sure you want to deprecate asset type ${key}? New assets cannot be registered with deprecated types.`)) {
      return;
    }
    try {
      await api.deprecateAssetType(key);
      await loadTypes();
    } catch (err) {
      alert(err?.response?.data?.error?.message || err.message || 'Deprecation failed');
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Asset Type Engine</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Parametric Schemas
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            On-chain attribute schemas, field-level privacy visibility, and required evidence policies
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadTypes}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Refresh types"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              Define Asset Type
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Type Cards Grid */}
      <div className="grid grid-cols-1 gap-4">
        {loading && types.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mx-auto mb-2" />
            <span className="text-xs font-mono">Loading Asset Type Schemas...</span>
          </div>
        ) : (
          types.map((typeDef) => {
            const isExpanded = expandedKey === typeDef.key;
            const isDeprecated = typeDef.status === 'DEPRECATED';

            return (
              <div
                key={typeDef.key}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden transition"
              >
                {/* Header row */}
                <div
                  className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 cursor-pointer hover:bg-slate-800/30 transition"
                  onClick={() => setExpandedKey(isExpanded ? null : typeDef.key)}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-center ${
                        isDeprecated
                          ? 'bg-slate-800 text-slate-500 border-slate-700'
                          : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                      }`}
                    >
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white tracking-tight">
                          {typeDef.name}
                        </h3>
                        <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {typeDef.key}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                            isDeprecated
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {typeDef.status || 'ACTIVE'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 max-w-2xl">{typeDef.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-auto">
                    {isAdmin && !isDeprecated && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeprecate(typeDef.key);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition flex items-center gap-1.5"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        Deprecate
                      </button>
                    )}
                    <button className="p-1 rounded-lg text-slate-400 hover:text-white">
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
                  <div className="border-t border-slate-800 p-5 bg-slate-950/40 space-y-5">
                    {/* Unique Fields & Mandatory Evidence Badges */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                          Duplicate Prevention (Unique Key Fields)
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {typeDef.uniqueFields && typeDef.uniqueFields.length > 0 ? (
                            typeDef.uniqueFields.map((f) => (
                              <span
                                key={f}
                                className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                              >
                                {f}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">None defined</span>
                          )}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                          Mandatory Evidence Documents Required
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {typeDef.mandatoryEvidence && typeDef.mandatoryEvidence.length > 0 ? (
                            typeDef.mandatoryEvidence.map((d) => (
                              <span
                                key={d}
                                className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                              >
                                {d}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">None required</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Attribute Schema Table */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>Dynamic Attribute Schema</span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {Object.keys(typeDef.attributeSchema || {}).length} fields
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Field Key</th>
                              <th className="py-2.5 px-3">Data Type</th>
                              <th className="py-2.5 px-3">Requirement</th>
                              <th className="py-2.5 px-3">Visibility / Privacy</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850 text-slate-300 font-medium">
                            {Object.entries(typeDef.attributeSchema || {}).map(
                              ([fieldName, rule]) => (
                                <tr key={fieldName} className="hover:bg-slate-900/40">
                                  <td className="py-2.5 px-3 font-mono font-semibold text-white">
                                    {fieldName}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-400">
                                    {rule.type}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {rule.required ? (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                        Mandatory
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                                        Optional
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {rule.visibility === 'RESTRICTED' ? (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1 w-max">
                                        <Lock className="w-3 h-3" />
                                        Restricted (PDC)
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-max">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Define New Asset Type</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              {createError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    Type Key (Identifier) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SOLAR_FARM"
                    value={createKey}
                    onChange={(e) => setCreateKey(e.target.value.toUpperCase())}
                    required
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Utility Solar Installation"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Asset description and regulatory bounds"
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    Unique Key Fields (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. gridConnectionId, permitNumber"
                    value={createUniqueFields}
                    onChange={(e) => setCreateUniqueFields(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    Mandatory Evidence (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GRID_LICENSE, PPA_CONTRACT"
                    value={createMandatoryEvidence}
                    onChange={(e) => setCreateMandatoryEvidence(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Dynamic Attribute Fields */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    Dynamic Attributes
                  </label>
                  <button
                    type="button"
                    onClick={handleAddAttributeRow}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    + Add Field
                  </button>
                </div>

                <div className="space-y-2">
                  {createAttributes.map((attr, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2"
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
                        className="flex-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                      />
                      <select
                        value={attr.type}
                        onChange={(e) => {
                          const updated = [...createAttributes];
                          updated[idx].type = e.target.value;
                          setCreateAttributes(updated);
                        }}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300"
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
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300"
                      >
                        <option value="PUBLIC">PUBLIC</option>
                        <option value="RESTRICTED">RESTRICTED</option>
                      </select>
                      <label className="flex items-center gap-1 text-[10px] text-slate-400">
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
                        className="p-1 rounded text-rose-400 hover:text-rose-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {submitting ? 'Anchoring...' : 'Register Schema'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
