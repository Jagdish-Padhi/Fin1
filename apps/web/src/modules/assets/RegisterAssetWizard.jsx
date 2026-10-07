import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';
import { DynamicSchemaForm } from './DynamicSchemaForm.jsx';
import {
  X,
  Layers,
  FileCheck,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  FileText,
  ShieldCheck,
} from 'lucide-react';

export function RegisterAssetWizard({ isOpen, onClose, onCreated, user }) {
  const [types, setTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [step, setStep] = useState(1); // 1: Type Select, 2: Attributes, 3: Evidence, 4: Review

  const [selectedTypeKey, setSelectedTypeKey] = useState('VEHICLE');
  const [selectedTypeDef, setSelectedTypeDef] = useState(null);

  const [displayName, setDisplayName] = useState('');
  const [attributes, setAttributes] = useState({});
  const [evidenceFiles, setEvidenceFiles] = useState({}); // docType -> { fileName, sha256 }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadTypes();
    }
  }, [isOpen]);

  const loadTypes = async () => {
    try {
      setLoadingTypes(true);
      const res = await api.getAssetTypes();
      if (res?.data && res.data.length > 0) {
        setTypes(res.data);
        const def = res.data.find((t) => t.key === 'VEHICLE') || res.data[0];
        setSelectedTypeKey(def.key);
        setSelectedTypeDef(def);
        initAttributesForType(def);
      }
    } catch (err) {
      console.error('Failed to load asset types:', err);
    } finally {
      setLoadingTypes(false);
    }
  };

  const initAttributesForType = (typeDef) => {
    if (!typeDef?.attributeSchema) return;
    const initial = {};
    for (const [key, rule] of Object.entries(typeDef.attributeSchema)) {
      initial[key] = rule.type === 'number' ? (rule.default ?? 0) : (rule.default ?? '');
    }
    setAttributes(initial);
    setDisplayName(`New ${typeDef.displayName || typeDef.key}`);
    setEvidenceFiles({});
  };

  const handleSelectType = (type) => {
    setSelectedTypeKey(type.key);
    setSelectedTypeDef(type);
    initAttributesForType(type);
  };

  const handleSimulateEvidence = (docType, fileName) => {
    // Generate deterministic pseudo SHA-256 for demo
    const randomHex = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setEvidenceFiles({
      ...evidenceFiles,
      [docType]: {
        docType,
        fileName: fileName || `${docType.toLowerCase()}_evidence.pdf`,
        sha256: randomHex,
        fileSize: 1024 * (Math.floor(Math.random() * 500) + 100),
      },
    });
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      // 1. Register asset on ledger
      const payload = {
        typeKey: selectedTypeKey,
        typeVersion: selectedTypeDef.version || 1,
        displayName: displayName || `${selectedTypeKey} Asset`,
        attributes,
      };

      const assetRes = await api.registerAsset(payload);
      const assetId = assetRes.id || assetRes.data?.id;

      // 2. Attach uploaded evidence documents
      for (const ev of Object.values(evidenceFiles)) {
        await api.attachEvidence(assetId, {
          assetId,
          docType: ev.docType,
          fileName: ev.fileName,
          sha256: ev.sha256,
          fileSize: ev.fileSize,
          mimeType: 'application/pdf',
        });
      }

      onCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to register asset on ledger');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Wizard Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 p-6 flex items-center justify-between z-10">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Real-World Asset Registration Wizard (Phase 2)</span>
            </div>
            <h3 className="text-lg font-bold text-white">Create Digital Asset Passport</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progression Bar */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-800/60 bg-slate-950/30">
          <div className="flex items-center justify-between text-xs">
            <div
              className={`flex items-center gap-2 ${step >= 1 ? 'text-indigo-400 font-semibold' : 'text-slate-500'}`}
            >
              <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-mono">
                1
              </span>
              <span>Asset Type</span>
            </div>
            <div className="w-8 h-[1px] bg-slate-800" />
            <div
              className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-400 font-semibold' : 'text-slate-500'}`}
            >
              <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-mono">
                2
              </span>
              <span>Attributes</span>
            </div>
            <div className="w-8 h-[1px] bg-slate-800" />
            <div
              className={`flex items-center gap-2 ${step >= 3 ? 'text-indigo-400 font-semibold' : 'text-slate-500'}`}
            >
              <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-mono">
                3
              </span>
              <span>Evidence</span>
            </div>
            <div className="w-8 h-[1px] bg-slate-800" />
            <div
              className={`flex items-center gap-2 ${step >= 4 ? 'text-indigo-400 font-semibold' : 'text-slate-500'}`}
            >
              <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-mono">
                4
              </span>
              <span>Review</span>
            </div>
          </div>
        </div>

        {/* Wizard Step Body */}
        <div className="p-6 space-y-6 flex-1">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Select Type */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-xs font-semibold text-slate-300">
                Select Asset Type Engine Definition
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {types.map((t) => {
                  const isSelected = selectedTypeKey === t.key;
                  return (
                    <div
                      key={t.key}
                      onClick={() => handleSelectType(t)}
                      className={`p-4 rounded-xl border cursor-pointer transition space-y-2 ${
                        isSelected
                          ? 'bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{t.displayName || t.key}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-800 text-indigo-400 border border-slate-700">
                          {t.token?.standard || 'WHOLE'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {t.key === 'LAND'
                          ? 'Agricultural & commercial land parcels with title chain search and revenue survey verification.'
                          : 'Commercial vehicles, tractors, and heavy machinery with Vahan RC verification.'}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
                        <span>Version {t.version || 1}</span>
                        <span>•</span>
                        <span>{t.evidenceRequirements?.length || 0} Required Docs</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Attributes Form */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Asset Label / Title</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. John Deere 5310 4WD Tractor"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Dynamic Type Attributes ({selectedTypeKey})</span>
                  <span className="text-[10px] text-slate-500">
                    Schema-validated on ledger (PDC restricted fields hidden from public)
                  </span>
                </div>
                <DynamicSchemaForm
                  schema={selectedTypeDef?.attributeSchema || {}}
                  values={attributes}
                  onChange={setAttributes}
                />
              </div>
            </div>
          )}

          {/* STEP 3: Evidence Upload Checklist */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-xs font-semibold text-slate-300">
                Mandatory & Optional Evidence Documents ({selectedTypeDef?.evidenceRequirements?.length || 0})
              </div>
              <p className="text-xs text-slate-400">
                Documents are AES-256 encrypted off-chain. Each file's SHA-256 hash is bound into the on-chain Merkle evidence root.
              </p>

              <div className="space-y-3">
                {selectedTypeDef?.evidenceRequirements?.map((req) => {
                  const isUploaded = !!evidenceFiles[req.docType];
                  return (
                    <div
                      key={req.docType}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-200 flex items-center gap-2">
                          <span>{req.docType}</span>
                          {req.required && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                              Mandatory
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{req.description}</div>
                        {isUploaded && (
                          <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 pt-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>
                              {evidenceFiles[req.docType].fileName} • SHA-256:{' '}
                              {evidenceFiles[req.docType].sha256.substring(0, 16)}...
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSimulateEvidence(req.docType, `${req.docType.toLowerCase()}_certified.pdf`)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                          isUploaded
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploaded ? 'Re-upload' : 'Attach File'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Review Summary */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                <div className="font-bold text-sm text-white flex items-center justify-between">
                  <span>{displayName}</span>
                  <span className="text-xs px-2 py-0.5 rounded font-mono bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    {selectedTypeKey}:v{selectedTypeDef?.version || 1}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  {Object.entries(attributes).map(([k, v]) => (
                    <div key={k}>
                      <span className="text-slate-500 text-[11px] capitalize">{k}:</span>{' '}
                      <span className="text-slate-200 font-medium">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <div className="font-semibold text-slate-300">Attached Evidence Root:</div>
                <div className="text-[11px] text-slate-400">
                  {Object.keys(evidenceFiles).length} documents ready to be cryptographically anchored.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 p-4 flex items-center justify-between">
          <button
            type="button"
            disabled={step === 1 || submitting}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition disabled:opacity-30 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/20"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="px-6 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Anchoring to Fabric Ledger...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Register Asset Passport</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
