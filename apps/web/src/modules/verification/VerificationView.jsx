import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { useToast } from '../../shared/components/Toast.jsx';
import { StatusBadge } from '../../shared/components/StatusBadge.jsx';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Search,
  ExternalLink,
  PlusCircle,
  FileText,
  Paperclip,
  Eye,
  Download,
  Loader2,
  RotateCw,
} from 'lucide-react';

// The ledger stores verification checks as a keyed map ({ [checkKey]: {...} }),
// while this view renders them as a list. Normalize either shape to an array.
function normalizeChecks(checks) {
  if (Array.isArray(checks)) return checks;
  if (checks && typeof checks === 'object') {
    return Object.entries(checks).map(([checkKey, check]) => ({
      checkKey,
      ...check,
    }));
  }
  return [];
}

const CHECK_LABELS = {
  DOCUMENT_INTEGRITY: 'Evidence integrity',
  LEGAL_TITLE_SEARCH: 'Legal title & encumbrance search',
  PHYSICAL_INSPECTION: 'Physical inspection',
  REGULATORY_COMPLIANCE: 'Regulatory filing',
  INSURANCE_COVERAGE: 'Insurance coverage',
};

const checkLabel = (key) =>
  CHECK_LABELS[key] ||
  String(key || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());

// The automated evidence-integrity check records a sourceRef with this prefix.
const AUTOMATED_SOURCE = /^evidence:sha256:/;
const hasAutomatedChecks = (c) => (c?.checks || []).some((chk) => AUTOMATED_SOURCE.test(chk.sourceRef || ''));
const isClosed = (c) => c?.status === 'APPROVED' || c?.status === 'REJECTED';

// Supporting evidence is exposed on the asset as `evidence` (ledger shape);
// tolerate `evidenceFiles` as well for API/version compatibility.
function getAssetEvidence(asset) {
  if (!asset) return [];
  if (Array.isArray(asset.evidence)) return asset.evidence;
  if (Array.isArray(asset.evidenceFiles)) return asset.evidenceFiles;
  return [];
}


const fieldLabel = (f) => f.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

function RegistryEntry({ spec, asset, caseId, onRecorded }) {
  const toast = useToast();
  const fields = [...(spec.requiredResponseFields || []), ...(spec.optionalResponseFields || [])];
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const refField = spec.requiredAssetFields?.[0];
  const refValue = refField ? asset?.attributes?.[refField] : null;

  const submit = async (e) => {
    e.preventDefault();
    const registryResponse = Object.fromEntries(
      Object.entries(values).filter(([, v]) => String(v ?? '').trim() !== '').map(([k, v]) => [k, String(v).trim()])
    );
    try {
      setSubmitting(true);
      const res = await api.runRegistryCheck(caseId, { registryResponse, ...(refValue ? { referenceNumber: String(refValue) } : {}) });
      const comparison = res?.data?.comparison;
      const passed = comparison?.result === 'PASS';
      passed
        ? toast.success(`Registry record matches the asset (${comparison.matched}/${comparison.total} fields). Check recorded.`)
        : toast.warning(`Registry record does not match the asset (${comparison?.matched ?? 0}/${comparison?.total ?? 0} fields). Recorded as failed.`);
      setValues({});
      onRecorded?.();
    } catch (err) {
      toast.error(err.message || 'Registry check failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-trust-text">Registry verification required</h4>
        <p className="mt-0.5 text-sm text-trust-text-muted">
          Look up {refField ? <><span className="font-medium">{fieldLabel(refField)}</span> <span className="font-mono">{String(refValue ?? '—')}</span></> : 'this asset'} on the{' '}
          {spec.displayName} and enter what it shows. Each field is compared with the asset record and the result is anchored on the ledger.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((f) => {
          const required = spec.requiredResponseFields?.includes(f);
          return (
            <div key={f}>
              <label className="block text-xs font-medium text-trust-text mb-1">
                {fieldLabel(f)} {!required && <span className="font-normal text-trust-text-muted">(optional)</span>}
              </label>
              <input
                value={values[f] || ''}
                onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))}
                className="trust-input w-full"
                required={required}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={submitting} className="trust-btn-primary">
          {submitting ? 'Comparing…' : 'Compare and record'}
        </button>
      </div>
    </form>
  );
}

export function VerificationView() {
  const { user } = useAuth();
  const toast = useToast();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form states for adding check
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [checkKey, setCheckKey] = useState('LEGAL_TITLE_SEARCH');
  const [checkResult, setCheckResult] = useState('PASS');
  const [checkNotes, setCheckNotes] = useState('');
  const [checkSourceRef, setCheckSourceRef] = useState('');
  const [submittingCheck, setSubmittingCheck] = useState(false);

  // Form states for final decision
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState('APPROVED');
  const [reasonCode, setReasonCode] = useState('SATISFIES_CRITERIA');
  const [reasonText, setReasonText] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Supporting-evidence review state
  const [downloadingEvidenceId, setDownloadingEvidenceId] = useState(null);

  const isVerifier = user?.role === 'VERIFIER';

  const loadCases = async () => {
    try {
      setLoading(true);
      const res = await api.getVerificationCases();
      const normalized = (res.data || []).map((c) => ({
        ...c,
        checks: normalizeChecks(c.checks),
      }));
      setCases(normalized);
      setSelectedCase((prev) => {
        if (!prev) return normalized[0] || null;
        return normalized.find((c) => c.id === prev.id) || normalized[0] || null;
      });
    } catch (err) {
      console.error('Failed to load verification cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const handleRecordCheck = async (e) => {
    e.preventDefault();
    if (!selectedCase) return;
    try {
      setSubmittingCheck(true);
      await api.recordVerificationCheck(
        selectedCase.id || selectedCase.caseId,
        checkKey,
        checkResult,
        checkNotes,
        checkSourceRef
      );
      setShowCheckModal(false);
      setCheckNotes('');
      setCheckSourceRef('');
      await loadCases();
    } catch (err) {
      toast.error(err.message || 'Failed to record verification check.');
    } finally {
      setSubmittingCheck(false);
    }
  };

  const handleDecide = async (e) => {
    e.preventDefault();
    if (!selectedCase) return;
    try {
      setSubmittingDecision(true);
      await api.decideVerification(
        selectedCase.id || selectedCase.caseId,
        decisionType,
        reasonCode,
        reasonText
      );
      setShowDecisionModal(false);
      setReasonText('');
      await loadCases();
    } catch (err) {
      toast.error(err.message || 'Failed to record verification decision.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Registry capabilities: which official registry backs each asset type, and whether a live provider is configured.
  const [registryCaps, setRegistryCaps] = useState([]);
  useEffect(() => {
    if (!isVerifier) return;
    api.getRegistryCapabilities().then((r) => setRegistryCaps(r.data || [])).catch(() => setRegistryCaps([]));
  }, [isVerifier]);

  // The selected case's asset and its type checklist (drives check options and labels).
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [typeChecklist, setTypeChecklist] = useState([]);
  useEffect(() => {
    let cancelled = false;
    setSelectedAsset(null);
    setTypeChecklist([]);
    if (!selectedCase?.assetId) return undefined;
    (async () => {
      const asset = selectedCase.asset?.typeKey
        ? selectedCase.asset
        : (await api.getAsset(selectedCase.assetId).catch(() => ({})))?.data || null;
      if (cancelled || !asset) return;
      setSelectedAsset(asset);
      const type = (await api.getAssetType(asset.typeKey, asset.typeVersion || 1).catch(() => ({})))?.data;
      if (!cancelled) setTypeChecklist(type?.verificationChecklist || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCase?.id, selectedCase?.assetId]);

  const registrySpec = selectedAsset ? registryCaps.find((r) => r.typeKey === selectedAsset.typeKey) : null;
  const registryRecorded = Boolean(registrySpec && (selectedCase?.checks || []).some((c) => c.checkKey === registrySpec.checkKey));
  const labelFor = (key) => typeChecklist.find((i) => i.key === key)?.label || checkLabel(key);

  // Automated checks run once per case, as soon as a verifier opens it. Only genuinely computed checks:
  // server-side evidence integrity, and a registry lookup when a live provider is configured.
  // { caseId, status: 'running' | 'failed' } — cleared on success.
  const [autoRun, setAutoRun] = useState(null);
  const autoRunStarted = useRef(new Set());

  const runAutomatedChecks = async (vc) => {
    const caseId = vc.id || vc.caseId;
    try {
      setAutoRun({ caseId, status: 'running' });
      const integrity = await api.runIntegrityCheck(caseId);

      const asset = vc.asset?.typeKey ? vc.asset : (await api.getAsset(vc.assetId).catch(() => ({})))?.data;
      const caps = registryCaps.length ? registryCaps : (await api.getRegistryCapabilities().catch(() => ({ data: [] })))?.data || [];
      const spec = caps.find((c) => c.typeKey === asset?.typeKey);
      let registryNote = '';
      if (spec?.mode === 'live') {
        const ref = asset?.attributes?.[spec.requiredAssetFields?.[0]];
        if (ref) {
          await api.runRegistryCheck(caseId, { referenceNumber: String(ref) });
          registryNote = ' Registry lookup recorded.';
        }
      }

      setAutoRun(null);
      if (integrity?.data?.passed) toast.success(`Evidence integrity verified.${registryNote}`);
      else toast.warning('Evidence integrity check failed. See the findings below.');
      await loadCases();
    } catch (err) {
      setAutoRun({ caseId, status: 'failed' });
      toast.error(err.message || 'Automated checks failed.');
    }
  };

  useEffect(() => {
    if (!isVerifier || !selectedCase || isClosed(selectedCase) || hasAutomatedChecks(selectedCase)) return;
    const caseId = selectedCase.id || selectedCase.caseId;
    if (autoRunStarted.current.has(caseId)) return;
    autoRunStarted.current.add(caseId);
    runAutomatedChecks(selectedCase);
  }, [selectedCase, isVerifier]);

  const selectedCaseId = selectedCase?.id || selectedCase?.caseId;
  const autoRunForSelected = autoRun && autoRun.caseId === selectedCaseId ? autoRun.status : null;

  const handleEvidenceAction = async (doc, mode = 'view') => {
    const evidenceId = doc?.id || doc?.evidenceId;
    if (!evidenceId) {
      toast.error('This document has no stored file — only its hash was anchored.');
      return;
    }

    // Open the tab synchronously so browsers do not treat it as a popup.
    const newWindow = mode === 'view' ? window.open('', '_blank') : null;
    try {
      setDownloadingEvidenceId(evidenceId);
      const { blob, fileName } = await api.downloadEvidence(evidenceId);
      const url = URL.createObjectURL(blob);

      if (mode === 'view') {
        if (newWindow) {
          newWindow.location.href = url;
        } else {
          window.open(url, '_blank', 'noopener');
        }
      } else {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      if (newWindow) newWindow.close();
      toast.error(err.message || 'Failed to open the evidence document.');
    } finally {
      setDownloadingEvidenceId(null);
    }
  };

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      (c.assetId || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.id || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            Independent Verification Desk
          </h2>
          <p className="page-subtitle">
            Third-party physical audits, encumbrance verification, and regulatory appraisal validations on rwa-channel.
          </p>
        </div>
      </div>

      {/* Main Grid: Cases List & Details Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cases List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-trust-text-muted" />
              <input
                type="text"
                placeholder="Search by Case ID or Asset ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="trust-input w-full pl-9 pr-3"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="trust-input"
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="bg-white border border-trust-border rounded-lg overflow-hidden shadow-subtle divide-y divide-trust-border max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-trust-text-muted">Loading verification cases...</div>
            ) : filteredCases.length === 0 ? (
              <div className="p-8 text-center text-xs text-trust-text-muted">
                No verification cases found matching criteria.
              </div>
            ) : (
              filteredCases.map((c) => {
                const isSelected = selectedCase?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCase(c)}
                    className={`w-full text-left p-4 transition ${
                      isSelected ? 'bg-slate-50 shadow-[inset_3px_0_0_0_#0F2A43]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-semibold text-trust-primary">{c.id}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="text-xs text-trust-text font-medium truncate">
                      Asset: <span className="font-mono">{c.assetId}</span>
                    </div>
                    <div className="text-xs text-trust-text-muted mt-1 flex items-center justify-between">
                      <span>Verifier: {c.assignedVerifier || 'Consortium Pool'}</span>
                      <span>Docs: {getAssetEvidence(c.asset).length} • Checks: {c.checks?.length || 0}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Case Detail Pane */}
        <div className="lg:col-span-7">
          {selectedCase ? (
            <div className="bg-white border border-trust-border rounded-lg p-6 shadow-subtle space-y-6">
              {/* Header Info */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-trust-border">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-trust-primary font-mono whitespace-nowrap">{selectedCase.id}</span>
                    <StatusBadge status={selectedCase.status} />
                  </div>
                  <p className="text-xs text-trust-text-muted mt-1">
                    Asset <strong className="text-trust-text font-mono">{selectedCase.assetId}</strong>
                  </p>
                </div>

                {/* Verifier Actions */}
                {isVerifier && !isClosed(selectedCase) && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => {
                        if (typeChecklist[0]) setCheckKey(typeChecklist[0].key);
                        setShowCheckModal(true);
                      }} className="trust-btn-secondary">
                      <PlusCircle className="w-4 h-4" />
                      Add manual check
                    </button>
                    <button
                      onClick={() => setShowDecisionModal(true)}
                      disabled={autoRunForSelected === 'running'}
                      className="trust-btn-primary"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Submit decision
                    </button>
                  </div>
                )}
              </div>

              {isVerifier && autoRunForSelected === 'running' && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-md border border-sky-200 bg-sky-50 text-sm text-sky-900">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  Verifying evidence integrity (re-hashing stored documents against the ledger)…
                </div>
              )}
              {isVerifier && autoRunForSelected === 'failed' && (
                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-md border border-trust-error-border bg-trust-error-bg text-sm text-trust-error">
                  <span>Automated checks could not be completed.</span>
                  <button
                    onClick={() => runAutomatedChecks(selectedCase)}
                    className="inline-flex items-center gap-1.5 font-medium hover:underline"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                </div>
              )}

              {/* Case Attributes & Assignment */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-50 border border-trust-border rounded-lg p-3">
                  <div className="text-xs text-trust-text-muted font-semibold">Created</div>
                  <div className="font-mono text-trust-text mt-0.5">
                    {selectedCase.createdAt ? new Date(selectedCase.createdAt).toLocaleString() : 'N/A'}
                  </div>
                </div>
                <div className="bg-slate-50 border border-trust-border rounded-lg p-3">
                  <div className="text-xs text-trust-text-muted font-semibold">Assigned Verifier</div>
                  <div className="font-semibold text-trust-primary mt-0.5">
                    {selectedCase.assignedVerifier || 'Consortium Pool'}
                  </div>
                </div>
                <div className="bg-slate-50 border border-trust-border rounded-lg p-3">
                  <div className="text-xs text-trust-text-muted font-semibold">Checks recorded</div>
                  <div className="font-semibold text-trust-success mt-0.5">
                    {selectedCase.checks?.length || 0}
                  </div>
                </div>
              </div>

              {/* Supporting Evidence Documents */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-trust-primary flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-trust-secondary" />
                  Supporting Evidence for Review ({getAssetEvidence(selectedCase.asset).length})
                </h4>

                {getAssetEvidence(selectedCase.asset).length === 0 ? (
                  <div className="p-6 text-center text-xs text-trust-text-muted bg-slate-50 rounded-lg border border-trust-border">
                    No evidence documents were attached to this asset.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getAssetEvidence(selectedCase.asset).map((doc, idx) => {
                      const evidenceId = doc.id || doc.evidenceId;
                      const hasStoredFile = Boolean(doc.storageKey);
                      return (
                        <div
                          key={evidenceId || idx}
                          className="p-3 bg-slate-50 border border-trust-border rounded-lg text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-trust-accent shrink-0" />
                              <span className="font-semibold text-trust-primary truncate">
                                {doc.title || doc.fileName || 'Evidence Document'}
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 text-trust-secondary border border-trust-border shrink-0">
                                {doc.docType}
                              </span>
                              {!hasStoredFile && (
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-trust-warning-bg text-trust-warning border border-[#FDE68A] shrink-0">
                                  Hash only
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleEvidenceAction(doc, 'view')}
                                disabled={downloadingEvidenceId === evidenceId}
                                className="trust-btn-primary"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View
                              </button>
                              <button
                                onClick={() => handleEvidenceAction(doc, 'download')}
                                disabled={downloadingEvidenceId === evidenceId}
                                className="trust-btn-secondary"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download
                              </button>
                            </div>
                          </div>
                          <div className="text-xs font-mono text-trust-text-muted truncate">
                            SHA-256: {doc.sha256 || 'N/A'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {isVerifier && !isClosed(selectedCase) && registrySpec && registrySpec.mode !== 'live' && !registryRecorded && autoRunForSelected !== 'running' && (
                <RegistryEntry spec={registrySpec} asset={selectedAsset} caseId={selectedCaseId} onRecorded={loadCases} />
              )}

              {/* Recorded Checklist Items */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-trust-primary flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-trust-secondary" />
                  Verification checks ({selectedCase.checks?.length || 0})
                </h4>

                {(!selectedCase.checks || selectedCase.checks.length === 0) ? (
                  <div className="p-6 text-center text-xs text-trust-text-muted bg-slate-50 rounded-lg border border-trust-border">
                    No checks recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedCase.checks.map((chk, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 border border-trust-border rounded-lg text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-trust-primary">{labelFor(chk.checkKey)}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              chk.result === 'PASS'
                                ? 'bg-[#ECFDF5] text-trust-success'
                                : chk.result === 'FAIL'
                                ? 'bg-trust-error-bg text-trust-error'
                                : 'bg-trust-warning-bg text-trust-warning'
                            }`}
                          >
                            {chk.result}
                          </span>
                        </div>
                        <p className="text-trust-text-muted">{chk.notes || 'No notes provided'}</p>
                        {chk.sourceRef && (
                          <div className="text-xs font-mono text-trust-secondary truncate">
                            Source: {chk.sourceRef}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-trust-text-muted bg-white border border-trust-border rounded-lg">
              Select a case to review its checks and submit a decision.
            </div>
          )}
        </div>
      </div>

      {/* Record Check Modal */}
      {showCheckModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-trust-border rounded-lg max-w-lg w-full p-6 shadow-popover space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-trust-border">
              <h3 className="text-sm font-semibold text-trust-primary">Add manual check</h3>
              <button
                onClick={() => setShowCheckModal(false)}
                className="p-1 hover:bg-slate-100 rounded text-trust-text-muted transition"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRecordCheck} className="space-y-3 text-xs">
              <div>
                <label className="block text-trust-text-muted font-medium mb-1">Check Type</label>
                <select
                  value={checkKey}
                  onChange={(e) => setCheckKey(e.target.value)}
                  className="trust-input w-full"
                >
                  {(typeChecklist.length ? typeChecklist : Object.entries(CHECK_LABELS).filter(([k]) => k !== 'DOCUMENT_INTEGRITY').map(([key, label]) => ({ key, label }))).map((item) => (
                    <option key={item.key} value={item.key}>{item.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-trust-text-muted font-medium mb-1">Result</label>
                <select
                  value={checkResult}
                  onChange={(e) => setCheckResult(e.target.value)}
                  className="trust-input w-full"
                >
                  <option value="PASS">Pass</option>
                  <option value="FAIL">Fail</option>
                  <option value="NOT_APPLICABLE">Not applicable</option>
                </select>
              </div>

              <div>
                <label className="block text-trust-text-muted font-medium mb-1">Findings</label>
                <textarea
                  rows="3"
                  value={checkNotes}
                  onChange={(e) => setCheckNotes(e.target.value)}
                  placeholder="Summarize registry search findings or surveyor notes..."
                  className="trust-input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-trust-text-muted font-medium mb-1">Source reference (optional)</label>
                <input
                  type="text"
                  value={checkSourceRef}
                  onChange={(e) => setCheckSourceRef(e.target.value)}
                  placeholder="e.g. REG-MUMBAI-2026-981"
                  className="trust-input w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckModal(false)}
                  className="trust-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCheck}
                  className="trust-btn-primary"
                >
                  {submittingCheck ? 'Saving…' : 'Save check'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decision Modal */}
      {showDecisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-trust-border rounded-lg max-w-lg w-full p-6 shadow-popover space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-trust-border">
              <h3 className="text-sm font-semibold text-trust-primary">Submit decision</h3>
              <button
                onClick={() => setShowDecisionModal(false)}
                className="p-1 hover:bg-slate-100 rounded text-trust-text-muted transition"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleDecide} className="space-y-3 text-xs">
              <div>
                <label className="block text-trust-text-muted font-medium mb-1">Decision</label>
                <select
                  value={decisionType}
                  onChange={(e) => setDecisionType(e.target.value)}
                  className="trust-input w-full"
                >
                  <option value="APPROVED">Approve — ready for valuation</option>
                  <option value="CHANGES_REQUESTED">Request changes — more evidence needed</option>
                  <option value="REJECTED">Reject — failed due diligence</option>
                </select>
              </div>

              <div>
                <label className="block text-trust-text-muted font-medium mb-1">Reason code</label>
                <input
                  type="text"
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="trust-input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-trust-text-muted font-medium mb-1">Justification</label>
                <textarea
                  rows="3"
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="Explain the decision. This is recorded in the audit trail."
                  className="trust-input w-full"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDecisionModal(false)}
                  className="trust-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDecision}
                  className="trust-btn-accent"
                >
                  {submittingDecision ? 'Submitting…' : 'Submit decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
