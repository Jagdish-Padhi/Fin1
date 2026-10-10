import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';
import { SUPPORTED_ASSET_TYPE_KEYS, validateAssetAttributes } from '../../../../../packages/contracts/src/attribute-validators.js';

const TYPE_DESCRIPTIONS = {
  VEHICLE: 'Commercial and agricultural vehicles. Registration number is verified against the Vahan registry; RC, insurance and fitness certificate required.',
  REAL_ESTATE: 'Commercial real estate and offices. Survey number is verified against revenue/RTC records; title deed, encumbrance certificate and tax receipt required.',
  INVOICE: 'Trade receivables. Invoice and GSTINs are verified against the GST e-invoice registry; signed invoice and e-way bill required.',
};
import { DynamicSchemaForm } from './DynamicSchemaForm.jsx';
import {
  X,
  Layers,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
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
      const supported = (res?.data || []).filter(
        (t) => SUPPORTED_ASSET_TYPE_KEYS.includes(t.key) && (t.status || 'ACTIVE') !== 'DEPRECATED'
      );
      if (supported.length > 0) {
        setTypes(supported);
        const def = supported.find((t) => t.key === 'VEHICLE') || supported[0];
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

  const handleFileUpload = async (docType, file) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      setEvidenceFiles((prev) => ({
        ...prev,
        [docType]: {
          docType,
          file,
          fileName: file.name,
          sha256,
          fileSize: file.size,
          mimeType: file.type || 'application/pdf',
        },
      }));
      setError(null);
    } catch (err) {
      setError(`Failed to read file for ${docType}: ${err.message}`);
    }
  };

  const validateStep = (currentStep) => {
    setError(null);
    if (currentStep === 1) {
      if (!selectedTypeKey || !selectedTypeDef) {
        setError('Please select an asset type before proceeding.');
        return false;
      }
      return true;
    }

    if (currentStep === 2) {
      if (!displayName.trim()) {
        setError('Asset Label / Title is required.');
        return false;
      }
      const schema = selectedTypeDef?.attributeSchema || {};
      for (const [key, rule] of Object.entries(schema)) {
        if (rule.required) {
          const val = attributes[key];
          if (val === undefined || val === null || val === '') {
            setError(`Required field missing: "${key.replace(/([A-Z])/g, ' $1')}" must be provided.`);
            return false;
          }
        }
      }
      const formatErrors = validateAssetAttributes(selectedTypeKey, attributes);
      if (formatErrors.length > 0) {
        const { field, message } = formatErrors[0];
        setError(`${field.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())} ${message}.`);
        return false;
      }
      return true;
    }

    if (currentStep === 3) {
      const reqs = selectedTypeDef?.evidenceRequirements || [];
      const missingMandatory = reqs.filter((r) => r.required && !evidenceFiles[r.docType]);
      if (missingMandatory.length > 0) {
        setError(
          `Mandatory evidence required: Please attach document(s) for: ${missingMandatory.map((m) => m.docType).join(', ')}.`
        );
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(4, s + 1));
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(2) || !validateStep(3)) {
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // 1. Register asset on ledger
      const payload = {
        typeKey: selectedTypeKey,
        typeVersion: selectedTypeDef.version || 1,
        displayName: displayName.trim(),
        attributes,
      };

      const assetRes = await api.registerAsset(payload);
      const createdAsset = assetRes.data || assetRes;
      const assetId = createdAsset.id;

      if (!assetId) {
        throw new Error('Asset registration did not return a valid Asset ID.');
      }

      // 2. Attach evidence documents — always the real file the issuer selected.
      // The binary is encrypted server-side (AES-256-GCM) and its exact SHA-256
      // is anchored on-chain. No hash-only placeholders: verifiers open exactly
      // these uploaded documents.
      for (const ev of Object.values(evidenceFiles)) {
        if (!ev.file) {
          throw new Error(
            `The document file is missing for "${ev.docType}". Please re-select the file — evidence must be the actual uploaded document.`
          );
        }
        await api.uploadEvidence(assetId, ev.docType, ev.file);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-trust-primary/40">
      <div className="bg-white border border-trust-border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-popover flex flex-col">
        {/* Wizard Header */}
        <div className="sticky top-0 bg-white/95 border-b border-trust-border p-6 flex items-center justify-between z-10">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-trust-accent mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Asset Registration Wizard</span>
            </div>
            <h3 className="text-lg font-semibold text-trust-text">Create Digital Asset Passport</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-trust-text-muted hover:text-trust-text hover:bg-slate-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progression Bar */}
        <div className="px-6 pt-4 pb-3 border-b border-trust-border bg-slate-50">
          <div className="flex items-center justify-between text-xs">
            <div
              className={`flex items-center gap-2 ${step >= 1 ? 'text-trust-primary font-semibold' : 'text-trust-text-muted'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono border ${
                step >= 1 ? 'bg-trust-primary text-white border-trust-primary' : 'border-trust-border text-trust-text-muted bg-white'
              }`}>
                1
              </span>
              <span>Asset Type</span>
            </div>
            <div className="w-8 h-[1px] bg-trust-border" />
            <div
              className={`flex items-center gap-2 ${step >= 2 ? 'text-trust-primary font-semibold' : 'text-trust-text-muted'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono border ${
                step >= 2 ? 'bg-trust-primary text-white border-trust-primary' : 'border-trust-border text-trust-text-muted bg-white'
              }`}>
                2
              </span>
              <span>Attributes</span>
            </div>
            <div className="w-8 h-[1px] bg-trust-border" />
            <div
              className={`flex items-center gap-2 ${step >= 3 ? 'text-trust-primary font-semibold' : 'text-trust-text-muted'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono border ${
                step >= 3 ? 'bg-trust-primary text-white border-trust-primary' : 'border-trust-border text-trust-text-muted bg-white'
              }`}>
                3
              </span>
              <span>Evidence</span>
            </div>
            <div className="w-8 h-[1px] bg-trust-border" />
            <div
              className={`flex items-center gap-2 ${step >= 4 ? 'text-trust-primary font-semibold' : 'text-trust-text-muted'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono border ${
                step >= 4 ? 'bg-trust-primary text-white border-trust-primary' : 'border-trust-border text-trust-text-muted bg-white'
              }`}>
                4
              </span>
              <span>Review</span>
            </div>
          </div>
        </div>

        {/* Wizard Step Body */}
        <div className="p-6 space-y-6 flex-1">
          {error && (
            <div className="p-4 rounded-lg bg-trust-error/10 border border-trust-error/20 text-xs text-trust-error flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Select Type */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-xs font-semibold text-trust-text">
                Select Asset Type Specification
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {types.map((t) => {
                  const isSelected = selectedTypeKey === t.key;
                  return (
                    <div
                      key={t.key}
                      onClick={() => handleSelectType(t)}
                      className={`p-4 rounded-lg border cursor-pointer transition space-y-2 ${
                        isSelected
                          ? 'bg-trust-accent/5 border-trust-accent ring-1 ring-trust-accent'
                          : 'bg-white border-trust-border hover:border-trust-secondary hover:shadow-subtle'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-trust-text">{t.displayName || t.key}</span>
                        <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-50 text-trust-primary border border-trust-border font-semibold">
                          {t.token?.standard || 'WHOLE'}
                        </span>
                      </div>
                      <p className="text-xs text-trust-text-muted line-clamp-2">
                        {TYPE_DESCRIPTIONS[t.key] || t.displayName}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-trust-text-muted pt-2 border-t border-trust-border">
                        <span>Version {t.version || 1}</span>
                        <span>•</span>
                        <span>{t.evidenceRequirements?.length || 0} Required Documents</span>
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
                <label className="block text-xs font-semibold text-trust-text mb-1.5">Asset Label / Title</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. John Deere 5310 4WD Tractor"
                  className="trust-input w-full"
                />
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-trust-border space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-trust-text">
                  <span>Dynamic Type Attributes ({selectedTypeKey})</span>
                  <span className="text-xs text-trust-text-muted">
                    PDC restricted fields stored confidentially
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
              <div>
                <div className="text-xs font-semibold text-trust-text">
                  Mandatory & Supporting Evidence Documents ({selectedTypeDef?.evidenceRequirements?.length || 0})
                </div>
                <p className="text-xs text-trust-text-muted mt-0.5">
                  Documents are stored off-chain. Each file's SHA-256 cryptographic digest is anchored on-chain.
                </p>
              </div>

              <div className="space-y-3">
                {selectedTypeDef?.evidenceRequirements?.map((req) => {
                  const isUploaded = !!evidenceFiles[req.docType];
                  return (
                    <div
                      key={req.docType}
                      className="p-4 rounded-lg bg-white border border-trust-border flex items-center justify-between text-xs shadow-subtle"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-trust-text flex items-center gap-2">
                          <span>{req.docType}</span>
                          {req.required && (
                            <span className="text-xs px-1.5 py-0.2 rounded bg-trust-warning/10 text-trust-warning border border-trust-warning/20 font-semibold">
                              Mandatory
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-trust-text-muted">{req.description}</div>
                        {isUploaded && (
                          <div className="text-xs text-trust-success font-mono flex items-center gap-1 pt-1 font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>
                              {evidenceFiles[req.docType].fileName} • SHA-256:{' '}
                              {evidenceFiles[req.docType].sha256.substring(0, 16)}...
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <label className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                          isUploaded
                            ? 'bg-trust-success/10 text-trust-success border border-trust-success/20'
                            : 'bg-trust-primary hover:bg-trust-secondary text-white shadow-subtle'
                        }`}>
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isUploaded ? 'Replace File' : 'Upload File'}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg,.json,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(req.docType, file);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Review Summary */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-trust-border space-y-3 text-xs">
                <div className="font-semibold text-sm text-trust-text flex items-center justify-between">
                  <span>{displayName}</span>
                  <span className="text-xs px-2 py-0.5 rounded font-mono bg-trust-primary/10 text-trust-primary border border-trust-primary/20 font-semibold">
                    {selectedTypeKey}:v{selectedTypeDef?.version || 1}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-trust-border">
                  {Object.entries(attributes).map(([k, v]) => (
                    <div key={k}>
                      <span className="text-trust-text-muted text-xs capitalize">{k}:</span>{' '}
                      <span className="text-trust-text font-semibold">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-trust-border text-xs space-y-2">
                <div className="font-semibold text-trust-text">Cryptographic Evidence Anchors:</div>
                <div className="text-xs text-trust-text-muted">
                  {Object.keys(evidenceFiles).length} documents prepared to be cryptographically committed to the ledger root.
                </div>
                <div className="space-y-1.5 pt-2">
                  {Object.values(evidenceFiles).map((ef) => (
                    <div key={ef.docType} className="p-2 rounded bg-white border border-trust-border font-mono text-xs flex items-center justify-between">
                      <span className="font-semibold text-trust-primary">{ef.docType}: {ef.fileName}</span>
                      <span className="text-trust-accent">SHA-256: {ef.sha256.slice(0, 16)}...</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="sticky bottom-0 bg-white border-t border-trust-border p-4 flex items-center justify-between">
          <button
            type="button"
            disabled={step === 1 || submitting}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-trust-text-muted hover:text-trust-text hover:bg-slate-50 transition disabled:opacity-30 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="trust-btn-primary"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="trust-btn-accent"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Anchoring to Ledger...</span>
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
