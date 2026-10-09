import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2A43]/40 backdrop-blur-sm">
      <div className="bg-white border border-[#D8E0E8] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Wizard Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-[#D8E0E8] p-6 flex items-center justify-between z-10">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#0F766E] uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Asset Registration Wizard</span>
            </div>
            <h3 className="text-lg font-bold text-[#17202A]">Create Digital Asset Passport</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5A6A7E] hover:text-[#17202A] hover:bg-[#F8FAFC] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progression Bar */}
        <div className="px-6 pt-4 pb-3 border-b border-[#D8E0E8] bg-[#F8FAFC]">
          <div className="flex items-center justify-between text-xs">
            <div
              className={`flex items-center gap-2 ${step >= 1 ? 'text-[#0F2A43] font-bold' : 'text-[#5A6A7E]'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono border ${
                step >= 1 ? 'bg-[#0F2A43] text-white border-[#0F2A43]' : 'border-[#D8E0E8] text-[#5A6A7E] bg-white'
              }`}>
                1
              </span>
              <span>Asset Type</span>
            </div>
            <div className="w-8 h-[1px] bg-[#D8E0E8]" />
            <div
              className={`flex items-center gap-2 ${step >= 2 ? 'text-[#0F2A43] font-bold' : 'text-[#5A6A7E]'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono border ${
                step >= 2 ? 'bg-[#0F2A43] text-white border-[#0F2A43]' : 'border-[#D8E0E8] text-[#5A6A7E] bg-white'
              }`}>
                2
              </span>
              <span>Attributes</span>
            </div>
            <div className="w-8 h-[1px] bg-[#D8E0E8]" />
            <div
              className={`flex items-center gap-2 ${step >= 3 ? 'text-[#0F2A43] font-bold' : 'text-[#5A6A7E]'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono border ${
                step >= 3 ? 'bg-[#0F2A43] text-white border-[#0F2A43]' : 'border-[#D8E0E8] text-[#5A6A7E] bg-white'
              }`}>
                3
              </span>
              <span>Evidence</span>
            </div>
            <div className="w-8 h-[1px] bg-[#D8E0E8]" />
            <div
              className={`flex items-center gap-2 ${step >= 4 ? 'text-[#0F2A43] font-bold' : 'text-[#5A6A7E]'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono border ${
                step >= 4 ? 'bg-[#0F2A43] text-white border-[#0F2A43]' : 'border-[#D8E0E8] text-[#5A6A7E] bg-white'
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
            <div className="p-4 rounded-xl bg-[#B42318]/10 border border-[#B42318]/20 text-xs text-[#B42318] flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Select Type */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-xs font-semibold text-[#17202A]">
                Select Asset Type Specification
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
                          ? 'bg-[#0F766E]/5 border-[#0F766E] ring-1 ring-[#0F766E]'
                          : 'bg-white border-[#D8E0E8] hover:border-[#1F5A7A] hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#17202A]">{t.displayName || t.key}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-[#F8FAFC] text-[#0F2A43] border border-[#D8E0E8] font-semibold">
                          {t.token?.standard || 'WHOLE'}
                        </span>
                      </div>
                      <p className="text-xs text-[#5A6A7E] line-clamp-2">
                        {t.key === 'LAND'
                          ? 'Agricultural & commercial land parcels with title chain search and revenue survey verification.'
                          : 'Commercial vehicles, tractors, and heavy machinery with Vahan RC verification.'}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-[#5A6A7E] pt-2 border-t border-[#D8E0E8]">
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
                <label className="block text-xs font-semibold text-[#17202A] mb-1.5">Asset Label / Title</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. John Deere 5310 4WD Tractor"
                  className="w-full bg-white border border-[#D8E0E8] rounded-lg px-3 py-2 text-xs text-[#17202A] focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
                />
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#D8E0E8] space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[#17202A]">
                  <span>Dynamic Type Attributes ({selectedTypeKey})</span>
                  <span className="text-[10px] text-[#5A6A7E]">
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
                <div className="text-xs font-semibold text-[#17202A]">
                  Mandatory & Supporting Evidence Documents ({selectedTypeDef?.evidenceRequirements?.length || 0})
                </div>
                <p className="text-xs text-[#5A6A7E] mt-0.5">
                  Documents are stored off-chain. Each file's SHA-256 cryptographic digest is anchored on-chain.
                </p>
              </div>

              <div className="space-y-3">
                {selectedTypeDef?.evidenceRequirements?.map((req) => {
                  const isUploaded = !!evidenceFiles[req.docType];
                  return (
                    <div
                      key={req.docType}
                      className="p-4 rounded-xl bg-white border border-[#D8E0E8] flex items-center justify-between text-xs shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-[#17202A] flex items-center gap-2">
                          <span>{req.docType}</span>
                          {req.required && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#A16207]/10 text-[#A16207] border border-[#A16207]/20 font-bold">
                              Mandatory
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#5A6A7E]">{req.description}</div>
                        {isUploaded && (
                          <div className="text-[10px] text-[#18794E] font-mono flex items-center gap-1 pt-1 font-semibold">
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
                            ? 'bg-[#18794E]/10 text-[#18794E] border border-[#18794E]/20'
                            : 'bg-[#0F2A43] hover:bg-[#1F5A7A] text-white shadow-xs'
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
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#D8E0E8] space-y-3 text-xs">
                <div className="font-bold text-sm text-[#17202A] flex items-center justify-between">
                  <span>{displayName}</span>
                  <span className="text-xs px-2 py-0.5 rounded font-mono bg-[#0F2A43]/10 text-[#0F2A43] border border-[#0F2A43]/20 font-bold">
                    {selectedTypeKey}:v{selectedTypeDef?.version || 1}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#D8E0E8]">
                  {Object.entries(attributes).map(([k, v]) => (
                    <div key={k}>
                      <span className="text-[#5A6A7E] text-[11px] capitalize">{k}:</span>{' '}
                      <span className="text-[#17202A] font-semibold">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#D8E0E8] text-xs space-y-2">
                <div className="font-semibold text-[#17202A]">Cryptographic Evidence Anchors:</div>
                <div className="text-[11px] text-[#5A6A7E]">
                  {Object.keys(evidenceFiles).length} documents prepared to be cryptographically committed to the ledger root.
                </div>
                <div className="space-y-1.5 pt-2">
                  {Object.values(evidenceFiles).map((ef) => (
                    <div key={ef.docType} className="p-2 rounded bg-white border border-[#D8E0E8] font-mono text-[10px] flex items-center justify-between">
                      <span className="font-semibold text-[#0F2A43]">{ef.docType}: {ef.fileName}</span>
                      <span className="text-[#0F766E]">SHA-256: {ef.sha256.slice(0, 16)}...</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="sticky bottom-0 bg-white border-t border-[#D8E0E8] p-4 flex items-center justify-between">
          <button
            type="button"
            disabled={step === 1 || submitting}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-[#5A6A7E] hover:text-[#17202A] hover:bg-[#F8FAFC] transition disabled:opacity-30 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 rounded-lg text-xs font-semibold bg-[#0F2A43] hover:bg-[#1F5A7A] text-white flex items-center gap-1.5 transition shadow-sm"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="px-6 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] hover:bg-[#0D625C] text-white flex items-center gap-2 transition shadow-sm disabled:opacity-50"
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
