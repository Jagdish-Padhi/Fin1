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
} from 'lucide-react';

export function AssetDetailDrawer({ isOpen, onClose, assetId, user, onAssetUpdated }) {
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'attributes' | 'evidence'
  const [showSticker, setShowSticker] = useState(false);

  // Evidence upload state
  const [uploadDocType, setUploadDocType] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadHash, setUploadHash] = useState('');
  const [attaching, setAttaching] = useState(false);
  const [attachSuccess, setAttachSuccess] = useState(null);

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

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
  };

  const handleAttachEvidence = async (e) => {
    e.preventDefault();
    if (!uploadDocType || !uploadHash) return;
    try {
      setAttaching(true);
      setAttachSuccess(null);
      setError(null);

      const payload = {
        docType: uploadDocType,
        title: uploadTitle || `${uploadDocType} Document`,
        sha256: uploadHash,
        mimeType: 'application/pdf',
        sizeBytes: 1048576,
      };

      await api.attachEvidence(asset.id, payload);
      setAttachSuccess('Evidence successfully anchored to Merkle vault!');
      setUploadDocType('');
      setUploadTitle('');
      setUploadHash('');
      await loadAsset();
      onAssetUpdated?.();
    } catch (err) {
      console.error('Failed to attach evidence:', err);
      setError(err?.response?.data?.error?.message || err.message || 'Attachment failed');
    } finally {
      setAttaching(false);
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#0F2A43]/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white border-l border-[#D8E0E8] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="p-5 border-b border-[#D8E0E8] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#F0F4F8] border border-[#D8E0E8] text-[#0F2A43]">
              <ShieldCheck className="w-5 h-5 text-[#0F766E]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0F2A43] font-['Outfit',sans-serif]">
                  {loading ? 'Loading Asset...' : asset?.displayName || 'Asset Passport'}
                </h2>
                {asset && <StatusBadge status={asset.status} />}
              </div>
              <div className="text-xs font-mono text-[#5A6A7E] truncate max-w-sm">
                ID: {asset?.id}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {asset && (
              <button
                onClick={() => setShowSticker(true)}
                className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F2A43] text-xs font-semibold border border-[#D8E0E8] flex items-center gap-1.5 transition shadow-2xs"
                title="Generate physical sticker"
              >
                <Printer className="w-3.5 h-3.5 text-[#0F766E]" />
                <span className="hidden sm:inline">Sticker</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#5A6A7E] hover:text-[#0F2A43] hover:bg-[#F8FAFC] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#D8E0E8] px-5 bg-[#F8FAFC]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-[#0F2A43] text-[#0F2A43]'
                : 'border-transparent text-[#5A6A7E] hover:text-[#0F2A43]'
            }`}
          >
            Overview & Passport
          </button>
          <button
            onClick={() => setActiveTab('attributes')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'attributes'
                ? 'border-[#0F2A43] text-[#0F2A43]'
                : 'border-transparent text-[#5A6A7E] hover:text-[#0F2A43]'
            }`}
          >
            Dynamic Attributes
            {asset?.attributes && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#E2E8F0] text-[#0F2A43] font-semibold">
                {Object.keys(asset.attributes).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'evidence'
                ? 'border-[#0F2A43] text-[#0F2A43]'
                : 'border-transparent text-[#5A6A7E] hover:text-[#0F2A43]'
            }`}
          >
            Evidence Vault & Merkle
            {asset?.evidenceFiles && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#F0FDFA] text-[#0F766E] font-semibold border border-[#CCFBF1]">
                {asset.evidenceFiles.length}
              </span>
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#F8FAFC]/50">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#5A6A7E]">
              <RefreshCw className="w-6 h-6 animate-spin text-[#0F766E]" />
              <span className="text-xs font-semibold font-mono">Syncing asset ledger state...</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECDD3] text-xs text-[#B42318] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#B42318] shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {!loading && asset && activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Submission Action if REGISTERED */}
              {asset.status === 'REGISTERED' && (
                <div className="p-4 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] space-y-3 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-[#0F2A43]">Asset in Registered Stage</div>
                      <p className="text-xs text-[#5A6A7E]">
                        Attributes can be updated and mandatory evidence attached before submitting to the consortium verifier pool.
                      </p>
                    </div>
                  </div>

                  {verificationError && (
                    <div className="p-2.5 rounded-lg bg-[#FEF2F2] text-xs text-[#B42318] border border-[#FECDD3]">
                      {verificationError}
                    </div>
                  )}

                  {canEdit && (
                    <button
                      onClick={handleSubmitForVerification}
                      disabled={submittingVerification}
                      className="w-full py-2 px-3 rounded-lg bg-[#0F2A43] hover:bg-[#0A1E30] disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-xs"
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
                  <div className="text-[10px] text-[#5A6A7E] uppercase tracking-wider font-bold">
                    Asset Class
                  </div>
                  <div className="text-sm font-bold text-[#0F2A43] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0F766E]" />
                    {asset.typeKey}
                  </div>
                </div>

                <div className="trust-card p-3.5 space-y-1">
                  <div className="text-[10px] text-[#5A6A7E] uppercase tracking-wider font-bold">
                    Jurisdiction
                  </div>
                  <div className="text-sm font-bold text-[#0F2A43] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#1F5A7A]" />
                    {asset.jurisdiction || 'IN'}
                  </div>
                </div>

                <div className="trust-card p-3.5 space-y-1">
                  <div className="text-[10px] text-[#5A6A7E] uppercase tracking-wider font-bold">
                    Originating Issuer
                  </div>
                  <div className="text-xs font-mono font-semibold text-[#17202A] truncate">
                    {asset.issuerId || 'N/A'}
                  </div>
                </div>

                <div className="trust-card p-3.5 space-y-1">
                  <div className="text-[10px] text-[#5A6A7E] uppercase tracking-wider font-bold">
                    Designated Custodian
                  </div>
                  <div className="text-xs font-mono font-semibold text-[#17202A] truncate">
                    {asset.custodian || 'CustodianOrgMSP'}
                  </div>
                </div>
              </div>

              {/* Cryptographic Roots */}
              <div className="trust-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#0F2A43] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
                    Cryptographic Integrity Anchors
                  </div>
                  <span className="text-[10px] font-mono text-[#5A6A7E]">SHA-256</span>
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#D8E0E8] flex items-center justify-between text-xs font-mono">
                    <div className="truncate mr-2">
                      <span className="text-[#5A6A7E] text-[10px] block font-bold">ATTRIBUTES ROOT HASH</span>
                      <span className="text-[#17202A] text-[11px] font-semibold">
                        {asset.attributesHash || 'None'}
                      </span>
                    </div>
                    {asset.attributesHash && (
                      <button
                        onClick={() => handleCopy(asset.attributesHash)}
                        className="p-1 rounded text-[#5A6A7E] hover:text-[#0F2A43]"
                        title="Copy hash"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#D8E0E8] flex items-center justify-between text-xs font-mono">
                    <div className="truncate mr-2">
                      <span className="text-[#5A6A7E] text-[10px] block font-bold">EVIDENCE MERKLE ROOT</span>
                      <span className="text-[#0F766E] font-bold text-[11px]">
                        {asset.evidenceRoot || '0x00000000000000000000000000000000'}
                      </span>
                    </div>
                    {asset.evidenceRoot && (
                      <button
                        onClick={() => handleCopy(asset.evidenceRoot)}
                        className="p-1 rounded text-[#5A6A7E] hover:text-[#0F2A43]"
                        title="Copy Merkle root"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Audit Timestamps */}
              <div className="trust-card p-3 flex items-center justify-between text-[11px] text-[#5A6A7E]">
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-[#1F5A7A]" />
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
                  <h3 className="text-xs font-bold text-[#0F2A43] uppercase tracking-wider">
                    Dynamic Asset Attributes
                  </h3>
                  <p className="text-[11px] text-[#5A6A7E]">
                    Governed by {asset.typeKey} schema definition
                  </p>
                </div>
                {canEdit && !editingAttributes && (
                  <button
                    onClick={() => setEditingAttributes(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#F0F4F8] text-[#0F2A43] hover:bg-[#E2E8F0] text-xs font-semibold border border-[#D8E0E8] transition"
                  >
                    Edit Attributes
                  </button>
                )}
              </div>

              {editingAttributes ? (
                <div className="space-y-3 trust-card p-4">
                  {Object.entries(editValues).map(([k, val]) => (
                    <div key={k} className="space-y-1">
                      <label className="text-xs font-semibold text-[#17202A] capitalize">
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
                        className="w-full px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#D8E0E8] text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A] focus:bg-white"
                      />
                    </div>
                  ))}

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#D8E0E8]">
                    <button
                      onClick={() => setEditingAttributes(false)}
                      className="px-3 py-1.5 rounded-lg text-[#5A6A7E] hover:text-[#17202A] text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAttributes}
                      disabled={savingAttributes}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0F2A43] hover:bg-[#0A1E30] text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      {savingAttributes ? 'Saving...' : 'Save & Re-hash'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-[#E8EEF3] trust-card overflow-hidden">
                  {Object.entries(asset.attributes || {}).map(([key, val]) => {
                    const isRedacted =
                      val === '[REDACTED (CONSORTIUM PRIVILEGED)]' ||
                      val === '[REDACTED]';
                    return (
                      <div
                        key={key}
                        className="p-3.5 flex items-center justify-between text-xs hover:bg-[#F8FAFC]"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-[#0F2A43] capitalize">
                            {key.replace(/([A-Z])/g, ' $1')}
                          </span>
                          <span className="text-[10px] text-[#5A6A7E] font-mono block">
                            key: {key}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isRedacted ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#FEF2F2] text-[#B42318] border border-[#FECDD3] flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Redacted (Consortium Privileged)
                            </span>
                          ) : (
                            <span className="font-mono text-[#17202A] font-semibold text-xs">
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
                  <h3 className="text-xs font-bold text-[#0F2A43] uppercase tracking-wider">
                    Anchored Evidence Vault
                  </h3>
                  <p className="text-[11px] text-[#5A6A7E]">
                    Documents verified and anchored via SHA-256 Merkle root
                  </p>
                </div>
              </div>

              {attachSuccess && (
                <div className="p-3 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#18794E] flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-[#18794E] shrink-0" />
                  <span>{attachSuccess}</span>
                </div>
              )}

              {/* Evidence Document List */}
              <div className="space-y-2">
                {asset.evidenceFiles && asset.evidenceFiles.length > 0 ? (
                  asset.evidenceFiles.map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 trust-card space-y-2 hover:border-[#BAC7D5] transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-[#0F766E]" />
                          <span className="text-xs font-bold text-[#0F2A43]">{doc.title}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#F0F4F8] text-[#1F5A7A] border border-[#D8E0E8]">
                            {doc.docType}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#5A6A7E] font-medium">
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Anchored'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-[#F8FAFC] p-2 rounded-lg text-[10px] font-mono border border-[#D8E0E8]">
                        <span className="text-[#5A6A7E] truncate max-w-sm">
                          SHA256: {doc.sha256}
                        </span>
                        <button
                          onClick={() => handleCopy(doc.sha256)}
                          className="p-1 rounded text-[#5A6A7E] hover:text-[#0F2A43]"
                          title="Copy hash"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-[#5A6A7E] trust-card">
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
                  <div className="text-xs font-bold text-[#0F2A43] flex items-center gap-1.5 uppercase tracking-wider">
                    <Upload className="w-3.5 h-3.5 text-[#0F766E]" />
                    Attach New Evidence Document
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-[#5A6A7E] font-bold uppercase">
                        Document Type *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. TITLE_DEED, INVOICE_PDF"
                        value={uploadDocType}
                        onChange={(e) => setUploadDocType(e.target.value.toUpperCase())}
                        required
                        className="w-full mt-1 px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#D8E0E8] text-xs text-[#17202A] font-mono focus:outline-none focus:border-[#1F5A7A] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#5A6A7E] font-bold uppercase">
                        Document Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Verified Government Registry"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#D8E0E8] text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-[#5A6A7E] font-bold uppercase">
                        Document SHA-256 Hash *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const rand = Array.from({ length: 64 }, () =>
                            Math.floor(Math.random() * 16).toString(16)
                          ).join('');
                          setUploadHash(rand);
                        }}
                        className="text-[10px] text-[#0F766E] hover:text-[#0D655E] font-semibold"
                      >
                        Generate Hash
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="64-character hex hash"
                      value={uploadHash}
                      onChange={(e) => setUploadHash(e.target.value)}
                      required
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#D8E0E8] text-xs text-[#17202A] font-mono focus:outline-none focus:border-[#1F5A7A] focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={attaching || !uploadDocType || !uploadHash}
                    className="w-full py-2 px-3 rounded-lg bg-[#0F2A43] hover:bg-[#0A1E30] disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
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
  );
}
