import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';
import { AssetPassportStickerModal } from './AssetPassportStickerModal.jsx';
import { StatusBadge } from '../../shared/components/StatusBadge.jsx';
import {
  X,
  ShieldCheck,
  FileCheck,
  Lock,
  Globe,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  Calendar,
  Building,
  User,
  ArrowRight,
  RefreshCw,
  Download,
  Coins,
  Users,
  PlusCircle,
} from 'lucide-react';

import { ModalPortal } from '../../shared/components/ModalPortal.jsx';

export function AssetDetailDrawer({ isOpen, onClose, assetId, user, onAssetUpdated }) {
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'attributes' | 'evidence' | 'tokenization'
  const [showSticker, setShowSticker] = useState(false);

  // Tokenization (security details moved from standalone Tokens tab)
  const [token, setToken] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState(null);
  const [holders, setHolders] = useState([]);
  const [holdersLoading, setHoldersLoading] = useState(false);
  const [showMint, setShowMint] = useState(false);
  const [mintSubmitting, setMintSubmitting] = useState(false);
  const [mintStandard, setMintStandard] = useState('FRACTIONAL');
  const [mintTotalUnits, setMintTotalUnits] = useState(10000);
  const [mintUnitLabel, setMintUnitLabel] = useState('SQM');
  const [mintRightsType, setMintRightsType] = useState('UNDIVIDED_FRACTION');
  const [mintRepresentation, setMintRepresentation] = useState('Undivided economic fractional interest');

  // Evidence upload state
  const [uploadDocType, setUploadDocType] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadHash, setUploadHash] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [attaching, setAttaching] = useState(false);
  const [attachSuccess, setAttachSuccess] = useState(null);
  const [downloadingEvidenceId, setDownloadingEvidenceId] = useState(null);

  // Submitting for verification state
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState(null);

  // Edit attributes state
  const [editingAttributes, setEditingAttributes] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [savingAttributes, setSavingAttributes] = useState(false);

  useEffect(() => {
    if (isOpen && assetId) {
      loadAsset();
    } else {
      setAsset(null);
      setError(null);
      setActiveTab('overview');
      setEditingAttributes(false);
    }
  }, [isOpen, assetId]);

  const loadAsset = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAssetById(assetId);
      if (res?.data) {
        setAsset(res.data);
        setEditValues(res.data.attributes || {});
      }
    } catch (err) {
      console.error('Failed to load asset details:', err);
      setError(err?.response?.data?.error?.message || err.message || 'Failed to load asset');
    } finally {
      setLoading(false);
    }
  };

  const loadTokenization = async () => {
    if (!assetId) return;
    try {
      setTokenLoading(true);
      setTokenError(null);
      const res = await api.getTokens();
      const list = res?.data || [];
      const match = list.find((t) => t.assetId === assetId) || null;
      setToken(match);
      if (match?.id) {
        try {
          setHoldersLoading(true);
          const hRes = await api.getTokenHolders(match.id);
          setHolders(hRes?.data || []);
        } catch {
          setHolders([]);
        } finally {
          setHoldersLoading(false);
        }
      } else {
        setHolders([]);
      }
    } catch (err) {
      console.error('Failed to load tokenization:', err);
      setTokenError(err?.message || 'Failed to load token details');
      setToken(null);
      setHolders([]);
    } finally {
      setTokenLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && assetId && asset && activeTab === 'tokenization') {
      loadTokenization();
    }
  }, [isOpen, assetId, asset, activeTab]);

  const handleMintFromDrawer = async (e) => {
    e.preventDefault();
    try {
      setMintSubmitting(true);
      setTokenError(null);
      await api.mintToken({
        assetId: asset.id,
        standard: mintStandard,
        totalUnits: Number(mintTotalUnits),
        unitLabel: mintUnitLabel,
        rightsType: mintRightsType,
        representation: mintRepresentation,
      });
      setShowMint(false);
      await loadTokenization();
      onAssetUpdated?.();
    } catch (err) {
      setTokenError(err?.message || 'Token minting failed. Check verification & valuation approval.');
    } finally {
      setMintSubmitting(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
  };

  const handleAttachEvidence = async (e) => {
    e.preventDefault();
    if (!uploadDocType) {
      setError('Please choose the document type before attaching evidence.');
      return;
    }
    if (!uploadFile) {
      setError(
        'Please select the actual document file to upload. Evidence must be the real uploaded file, not just a hash.'
      );
      return;
    }
    try {
      setAttaching(true);
      setAttachSuccess(null);
      setError(null);

      // Real binary upload: the exact file is encrypted server-side (AES-256-GCM)
      // and its SHA-256 anchored on-chain. Verifiers open this same uploaded file.
      await api.uploadEvidence(asset.id, uploadDocType, uploadFile);

      setAttachSuccess('Evidence document uploaded and anchored to the Merkle vault!');
      setUploadDocType('');
      setUploadTitle('');
      setUploadHash('');
      setUploadFile(null);
      await loadAsset();
      onAssetUpdated?.();
    } catch (err) {
      console.error('Failed to attach evidence:', err);
      setError(err?.response?.data?.error?.message || err.message || 'Attachment failed');
    } finally {
      setAttaching(false);
    }
  };

  const handleDownloadEvidence = async (doc) => {
    const evidenceId = doc?.id || doc?.evidenceId;
    if (!evidenceId) {
      setError('This document has no stored file — only its hash was anchored.');
      return;
    }
    try {
      setDownloadingEvidenceId(evidenceId);
      setError(null);
      const { blob, fileName } = await api.downloadEvidence(evidenceId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to download evidence');
    } finally {
      setDownloadingEvidenceId(null);
    }
  };

  const handleSubmitForVerification = async () => {
    try {
      setSubmittingVerification(true);
      setVerificationError(null);
      await api.submitAssetForVerification(asset.id);
      await loadAsset();
      onAssetUpdated?.();
    } catch (err) {
      console.error('Verification submission failed:', err);
      setVerificationError(err?.response?.data?.error?.message || err.message || 'Submission failed');
    } finally {
      setSubmittingVerification(false);
    }
  };

  const handleSaveAttributes = async () => {
    try {
      setSavingAttributes(true);
      setError(null);
      await api.updateAssetAttributes(asset.id, editValues);
      setEditingAttributes(false);
      await loadAsset();
      onAssetUpdated?.();
    } catch (err) {
      console.error('Failed to update attributes:', err);
      setError(err?.response?.data?.error?.message || err.message || 'Update failed');
    } finally {
      setSavingAttributes(false);
    }
  };

  if (!isOpen) return null;

  const canEdit =
    asset?.status === 'REGISTERED' && (user?.role === 'ISSUER' || user?.role === 'ADMINISTRATOR');

  const canMint = user?.role === 'COMPLIANCE' || user?.role === 'ADMINISTRATOR';

  // Ledger returns attached documents under `evidence`; tolerate `evidenceFiles`.
  const evidenceFiles = asset?.evidence || asset?.evidenceFiles || [];
  const tokenSupply = token ? Number(token.totalUnits || token.totalSupply || 0) : 0;
  const tokenLabel = token ? token.unitLabel || token.symbol || 'UNITS' : 'UNITS';

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="fixed inset-0 z-[60] overflow-hidden bg-slate-900/40 flex justify-end">
        <div className="w-full max-w-2xl bg-white border-l border-trust-border h-screen flex flex-col shadow-popover animate-in slide-in-from-right duration-250">
          {/* Header */}
        <div className="p-5 border-b border-trust-border flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-100 border border-trust-border text-trust-primary">
              <ShieldCheck className="w-5 h-5 text-trust-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-trust-primary">
                  {loading ? 'Loading Asset...' : asset?.displayName || 'Asset Passport'}
                </h2>
                {asset && <StatusBadge status={asset.status} />}
              </div>
              <div className="text-xs font-mono text-trust-text-muted truncate max-w-sm">
                ID: {asset?.id}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {asset && (
              <button
                onClick={() => setShowSticker(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-trust-primary text-xs font-semibold border border-trust-border flex items-center gap-1.5 transition shadow-subtle"
                title="Generate physical sticker"
              >
                <Printer className="w-3.5 h-3.5 text-trust-accent" />
                <span className="hidden sm:inline">Sticker</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-trust-text-muted hover:text-trust-primary hover:bg-slate-50 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-trust-border px-5 bg-slate-50">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-trust-primary text-trust-primary'
                : 'border-transparent text-trust-text-muted hover:text-trust-primary'
            }`}
          >
            Overview & Passport
          </button>
          <button
            onClick={() => setActiveTab('attributes')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'attributes'
                ? 'border-trust-primary text-trust-primary'
                : 'border-transparent text-trust-text-muted hover:text-trust-primary'
            }`}
          >
            Dynamic Attributes
            {asset?.attributes && (
              <span className="px-1.5 py-0.2 rounded-full text-xs bg-trust-border-subtle text-trust-primary font-semibold">
                {Object.keys(asset.attributes).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'evidence'
                ? 'border-trust-primary text-trust-primary'
                : 'border-transparent text-trust-text-muted hover:text-trust-primary'
            }`}
          >
            Evidence Vault & Merkle
            {evidenceFiles.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-xs bg-trust-accent-light text-trust-accent font-semibold border border-[#CCFBF1]">
                {evidenceFiles.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('tokenization')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'tokenization'
                ? 'border-trust-primary text-trust-primary'
                : 'border-transparent text-trust-text-muted hover:text-trust-primary'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Tokenization & Holdings
            {token && (
              <span className="px-1.5 py-0.2 rounded-full text-xs bg-slate-100 text-trust-secondary font-semibold border border-trust-border">
                {token.status || 'ACTIVE'}
              </span>
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-trust-text-muted">
              <RefreshCw className="w-6 h-6 animate-spin text-trust-accent" />
              <span className="text-xs font-semibold font-mono">Syncing asset ledger state...</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-lg bg-trust-error-bg border border-trust-error-border text-xs text-trust-error flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-trust-error shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {!loading && asset && activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Submission Action if REGISTERED */}
              {asset.status === 'REGISTERED' && (
                <div className="p-4 rounded-lg bg-trust-accent-light border border-[#CCFBF1] space-y-3 shadow-subtle">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-trust-accent shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-trust-primary">Asset in Registered Stage</div>
                      <p className="text-xs text-trust-text-muted">
                        Attributes can be updated and mandatory evidence attached before submitting to the consortium verifier pool.
                      </p>
                    </div>
                  </div>

                  {verificationError && (
                    <div className="p-2.5 rounded-lg bg-trust-error-bg text-xs text-trust-error border border-trust-error-border">
                      {verificationError}
                    </div>
                  )}

                  {canEdit && (
                    <button
                      onClick={handleSubmitForVerification}
                      disabled={submittingVerification}
                      className="trust-btn-primary w-full"
                    >
                      {submittingVerification ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Submitting for Verification...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-3.5 h-3.5" />
                          Submit to Verifier Pool
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Passport Metadata Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="trust-card p-3.5 space-y-1">
                  <div className="text-xs text-trust-text-muted font-semibold">
                    Asset Class
                  </div>
                  <div className="text-sm font-semibold text-trust-primary flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-trust-accent" />
                    {asset.typeKey}
                  </div>
                </div>

                <div className="trust-card p-3.5 space-y-1">
                  <div className="text-xs text-trust-text-muted font-semibold">
                    Jurisdiction
                  </div>
                  <div className="text-sm font-semibold text-trust-primary flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-trust-secondary" />
                    {asset.jurisdiction || 'IN'}
                  </div>
                </div>

                <div className="trust-card p-3.5 space-y-1">
                  <div className="text-xs text-trust-text-muted font-semibold">
                    Originating Issuer
                  </div>
                  <div className="text-xs font-mono font-semibold text-trust-text truncate">
                    {asset.issuerId || 'N/A'}
                  </div>
                </div>

                <div className="trust-card p-3.5 space-y-1">
                  <div className="text-xs text-trust-text-muted font-semibold">
                    Designated Custodian
                  </div>
                  <div className="text-xs font-mono font-semibold text-trust-text truncate">
                    {asset.custodian || 'CustodianOrgMSP'}
                  </div>
                </div>
              </div>

              {/* Cryptographic Roots */}
              <div className="trust-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-trust-primary flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-trust-accent" />
                    Cryptographic Integrity Anchors
                  </div>
                  <span className="text-xs font-mono text-trust-text-muted">SHA-256</span>
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-trust-border flex items-center justify-between text-xs font-mono">
                    <div className="truncate mr-2">
                      <span className="text-trust-text-muted text-xs block font-semibold">ATTRIBUTES ROOT HASH</span>
                      <span className="text-trust-text text-xs font-semibold">
                        {asset.attributesHash || 'None'}
                      </span>
                    </div>
                    {asset.attributesHash && (
                      <button
                        onClick={() => handleCopy(asset.attributesHash)}
                        className="p-1 rounded text-trust-text-muted hover:text-trust-primary"
                        title="Copy hash"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-trust-border flex items-center justify-between text-xs font-mono">
                    <div className="truncate mr-2">
                      <span className="text-trust-text-muted text-xs block font-semibold">EVIDENCE MERKLE ROOT</span>
                      <span className="text-trust-accent font-semibold text-xs">
                        {asset.evidenceRoot || '0x00000000000000000000000000000000'}
                      </span>
                    </div>
                    {asset.evidenceRoot && (
                      <button
                        onClick={() => handleCopy(asset.evidenceRoot)}
                        className="p-1 rounded text-trust-text-muted hover:text-trust-primary"
                        title="Copy Merkle root"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Audit Timestamps */}
              <div className="trust-card p-3 flex items-center justify-between text-xs text-trust-text-muted">
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-trust-secondary" />
                  Created: {new Date(asset.createdAt).toLocaleString()}
                </span>
                <span className="font-medium">Updated: {new Date(asset.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          )}

          {!loading && asset && activeTab === 'attributes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-trust-primary">
                    Dynamic Asset Attributes
                  </h3>
                  <p className="text-xs text-trust-text-muted">
                    Governed by {asset.typeKey} schema definition
                  </p>
                </div>
                {canEdit && !editingAttributes && (
                  <button
                    onClick={() => setEditingAttributes(true)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-trust-primary hover:bg-trust-border-subtle text-xs font-semibold border border-trust-border transition"
                  >
                    Edit Attributes
                  </button>
                )}
              </div>

              {editingAttributes ? (
                <div className="space-y-3 trust-card p-4">
                  {Object.entries(editValues).map(([k, val]) => (
                    <div key={k} className="space-y-1">
                      <label className="text-xs font-semibold text-trust-text capitalize">
                        {k.replace(/([A-Z])/g, ' $1')}
                      </label>
                      <input
                        type={typeof val === 'number' ? 'number' : 'text'}
                        value={val}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            [k]:
                              typeof val === 'number'
                                ? parseFloat(e.target.value) || 0
                                : e.target.value,
                          })
                        }
                        className="trust-input w-full"
                      />
                    </div>
                  ))}

                  <div className="flex justify-end gap-2 pt-2 border-t border-trust-border">
                    <button
                      onClick={() => setEditingAttributes(false)}
                      className="px-3 py-1.5 rounded-lg text-trust-text-muted hover:text-trust-text text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAttributes}
                      disabled={savingAttributes}
                      className="trust-btn-primary"
                    >
                      {savingAttributes ? 'Saving...' : 'Save & Re-hash'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-trust-border-subtle trust-card overflow-hidden">
                  {Object.entries(asset.attributes || {}).map(([key, val]) => {
                    const isRedacted =
                      val === '[REDACTED (CONSORTIUM PRIVILEGED)]' ||
                      val === '[REDACTED]';
                    return (
                      <div
                        key={key}
                        className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50"
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-trust-primary capitalize">
                            {key.replace(/([A-Z])/g, ' $1')}
                          </span>
                          <span className="text-xs text-trust-text-muted font-mono block">
                            key: {key}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isRedacted ? (
                            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-trust-error-bg text-trust-error border border-trust-error-border flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Redacted (Consortium Privileged)
                            </span>
                          ) : (
                            <span className="font-mono text-trust-text font-semibold text-xs">
                              {typeof val === 'number'
                                ? val.toLocaleString()
                                : typeof val === 'object'
                                ? JSON.stringify(val)
                                : String(val)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!loading && asset && activeTab === 'evidence' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-trust-primary">
                    Anchored Evidence Vault
                  </h3>
                  <p className="text-xs text-trust-text-muted">
                    Documents verified and anchored via SHA-256 Merkle root
                  </p>
                </div>
              </div>

              {attachSuccess && (
                <div className="p-3 rounded-lg bg-trust-success-bg border border-trust-success-border text-xs text-trust-success flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-trust-success shrink-0" />
                  <span>{attachSuccess}</span>
                </div>
              )}

              {/* Evidence Document List */}
              <div className="space-y-2">
                {evidenceFiles.length > 0 ? (
                  evidenceFiles.map((doc, idx) => {
                    const evidenceId = doc.id || doc.evidenceId;
                    const hasStoredFile = Boolean(doc.storageKey);
                    return (
                      <div
                        key={evidenceId || idx}
                        className="p-3.5 trust-card space-y-2 hover:border-[#BAC7D5] transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileCheck className="w-4 h-4 text-trust-accent shrink-0" />
                            <span className="text-xs font-semibold text-trust-primary truncate">
                              {doc.title || doc.fileName || doc.docType}
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
                          <span className="text-xs text-trust-text-muted font-medium shrink-0">
                            {doc.createdAt || doc.uploadedAt
                              ? new Date(doc.createdAt || doc.uploadedAt).toLocaleDateString()
                              : 'Anchored'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-lg text-xs font-mono border border-trust-border">
                          <span className="text-trust-text-muted truncate">
                            SHA256: {doc.sha256}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleCopy(doc.sha256)}
                              className="p-1 rounded text-trust-text-muted hover:text-trust-primary"
                              title="Copy hash"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDownloadEvidence(doc)}
                              disabled={downloadingEvidenceId === evidenceId || !evidenceId}
                              className="trust-btn-secondary"
                              title={hasStoredFile ? 'Download document' : 'No stored file to download'}
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-trust-text-muted trust-card">
                    No evidence documents attached yet.
                  </div>
                )}
              </div>

              {/* Attach Evidence Form (if REGISTERED) */}
              {canEdit && (
                <form
                  onSubmit={handleAttachEvidence}
                  className="p-4 trust-card space-y-3"
                >
                  <div className="text-xs font-semibold text-trust-primary flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-trust-accent" />
                    Attach New Evidence Document
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs text-trust-text-muted font-semibold">
                        Document Type *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. TITLE_DEED, INVOICE_PDF"
                        value={uploadDocType}
                        onChange={(e) => setUploadDocType(e.target.value.toUpperCase())}
                        required
                        className="trust-input w-full mt-1 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-trust-text-muted font-semibold">
                        Select Physical File *
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadTitle(file.name);
                            setUploadFile(file);
                            const buffer = await file.arrayBuffer();
                            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
                            const hashArray = Array.from(new Uint8Array(hashBuffer));
                            const sha256 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
                            setUploadHash(sha256);
                          }
                        }}
                        className="w-full mt-1 text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-trust-primary file:text-white hover:file:bg-trust-secondary cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-trust-text-muted font-semibold">
                      Calculated SHA-256 Digest
                    </label>
                    <input
                      type="text"
                      readOnly
                      placeholder="Select a file above to compute exact SHA-256"
                      value={uploadHash}
                      className="trust-input w-full mt-1 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={attaching || !uploadDocType || !uploadHash}
                    className="trust-btn-primary w-full"
                  >
                    {attaching ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Anchoring to Merkle Root...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        Anchor Evidence to Merkle Vault
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {!loading && asset && activeTab === 'tokenization' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-trust-primary flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-trust-secondary" />
                    Security Token & Cap Table
                  </h3>
                  <p className="text-xs text-trust-text-muted">
                    Tokenized claims anchored to this asset passport
                  </p>
                </div>
                <button
                  onClick={loadTokenization}
                  disabled={tokenLoading}
                  className="p-1.5 rounded-lg bg-white border border-trust-border text-trust-text-muted hover:text-trust-primary transition"
                  title="Refresh token state"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${tokenLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {tokenError && (
                <div className="p-3 rounded-lg bg-trust-error-bg border border-trust-error-border text-xs text-trust-error">
                  {tokenError}
                </div>
              )}

              {tokenLoading ? (
                <div className="py-10 flex flex-col items-center gap-2 text-trust-text-muted">
                  <RefreshCw className="w-5 h-5 animate-spin text-trust-accent" />
                  <span className="text-xs">Loading token state...</span>
                </div>
              ) : !token ? (
                <div className="trust-card p-6 text-center space-y-3">
                  <Coins className="w-8 h-8 text-[#BAC7D5] mx-auto" />
                  <div className="text-xs font-semibold text-trust-primary">Not tokenized yet</div>
                  <p className="text-xs text-trust-text-muted">
                    No security token has been minted against this asset. Minting requires a verified
                    and valuation-approved asset.
                  </p>
                  {canMint && (
                    <button
                      onClick={() => setShowMint(true)}
                      className="trust-btn-primary"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Mint Security Token
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="trust-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-sm text-trust-primary">{token.id}</span>
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                          token.status === 'ACTIVE'
                            ? 'bg-trust-success-bg text-trust-success border-[#DCFCE7]'
                            : 'bg-trust-error-bg text-trust-error border-trust-error-border'
                        }`}
                      >
                        {token.status}
                      </span>
                    </div>
                    <p className="text-xs text-trust-text-muted">
                      {token.representation || 'Undivided economic rights'}
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-50 p-3 rounded-lg border border-trust-border">
                        <div className="text-xs text-trust-text-muted font-semibold">
                          Total Authorized Supply
                        </div>
                        <div className="font-mono text-sm font-semibold text-trust-primary mt-0.5">
                          {tokenSupply.toLocaleString()} {tokenLabel}
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-trust-border">
                        <div className="text-xs text-trust-text-muted font-semibold">Standard</div>
                        <div className="font-mono text-xs font-semibold text-trust-secondary mt-1">
                          {token.standard || 'FRACTIONAL'}
                        </div>
                        <div className="text-xs text-trust-text-muted mt-0.5">
                          {token.rightsType || 'UNDIVIDED_FRACTION'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-trust-primary flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-trust-secondary" />
                      On-Chain Cap Table / Holdings ({holders.length})
                    </h4>
                    {holdersLoading ? (
                      <div className="p-4 text-center text-xs text-trust-text-muted">
                        Querying ledger balance state...
                      </div>
                    ) : holders.length === 0 ? (
                      <div className="p-4 text-center text-xs text-trust-text-muted bg-white rounded-lg border border-trust-border">
                        No active token holder records found.
                      </div>
                    ) : (
                      <div className="border border-trust-border rounded-lg overflow-hidden divide-y divide-trust-border text-xs bg-white">
                        {holders.map((h, i) => {
                          const participantId = h.participantId || h.holderId || 'UNKNOWN';
                          const unitsHeld = h.units !== undefined ? h.units : h.balance || 0;
                          const percentage =
                            tokenSupply > 0 ? ((unitsHeld / tokenSupply) * 100).toFixed(1) : '0.0';
                          return (
                            <div
                              key={i}
                              className="p-3 flex items-center justify-between hover:bg-slate-50 transition"
                            >
                              <div>
                                <span className="font-mono font-semibold text-trust-primary">
                                  {participantId}
                                </span>
                                <div className="text-xs text-trust-text-muted mt-0.5">
                                  Holding: {percentage}% of supply
                                </div>
                              </div>
                              <span className="font-semibold font-mono text-trust-text text-sm">
                                {Number(unitsHeld).toLocaleString()}{' '}
                                <span className="text-xs text-trust-text-muted font-normal">{tokenLabel}</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {showMint && (
                <form onSubmit={handleMintFromDrawer} className="trust-card p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-trust-border">
                    <span className="font-semibold text-trust-primary">Mint Security Token for {asset.id}</span>
                    <button
                      type="button"
                      onClick={() => setShowMint(false)}
                      className="p-1 hover:bg-slate-100 rounded text-trust-text-muted"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-trust-text-muted font-medium mb-1">Standard</label>
                      <select
                        value={mintStandard}
                        onChange={(e) => setMintStandard(e.target.value)}
                        className="w-full px-3 py-2 border border-trust-border rounded-lg bg-white"
                      >
                        <option value="FRACTIONAL">FRACTIONAL</option>
                        <option value="WHOLE">WHOLE</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-trust-text-muted font-medium mb-1">Total Units</label>
                      <input
                        type="number"
                        value={mintTotalUnits}
                        onChange={(e) => setMintTotalUnits(e.target.value)}
                        className="w-full px-3 py-2 border border-trust-border rounded-lg font-mono"
                        min="1"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-trust-text-muted font-medium mb-1">Unit Label</label>
                      <input
                        type="text"
                        value={mintUnitLabel}
                        onChange={(e) => setMintUnitLabel(e.target.value)}
                        className="w-full px-3 py-2 border border-trust-border rounded-lg font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-trust-text-muted font-medium mb-1">Rights Type</label>
                      <select
                        value={mintRightsType}
                        onChange={(e) => setMintRightsType(e.target.value)}
                        className="w-full px-3 py-2 border border-trust-border rounded-lg bg-white"
                      >
                        <option value="UNDIVIDED_FRACTION">UNDIVIDED_FRACTION</option>
                        <option value="FULL_OWNERSHIP">FULL_OWNERSHIP</option>
                        <option value="RECEIVABLE_CLAIM">RECEIVABLE_CLAIM</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-trust-text-muted font-medium mb-1">Representation</label>
                    <textarea
                      value={mintRepresentation}
                      onChange={(e) => setMintRepresentation(e.target.value)}
                      className="w-full px-3 py-2 border border-trust-border rounded-lg"
                      rows={2}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMint(false)}
                      className="px-4 py-2 border border-trust-border rounded-lg text-trust-text-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={mintSubmitting}
                      className="trust-btn-primary"
                    >
                      {mintSubmitting ? 'Minting...' : 'Mint Token'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

        {/* Asset Passport Sticker Modal */}
        {asset && (
          <AssetPassportStickerModal
            isOpen={showSticker}
            onClose={() => setShowSticker(false)}
            asset={asset}
          />
        )}
      </div>
    </ModalPortal>
  );
}
