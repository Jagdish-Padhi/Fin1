import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';
import { AssetPassportStickerModal } from './AssetPassportStickerModal.jsx';
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
  ExternalLink,
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

  const statusColors = {
    REGISTERED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    UNDER_VERIFICATION: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    VERIFIED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    REJECTED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    TOKENIZED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {loading ? 'Loading Asset...' : asset?.displayName || 'Asset Passport'}
                </h2>
                {asset && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                      statusColors[asset.status] || 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {asset.status}
                  </span>
                )}
              </div>
              <div className="text-xs font-mono text-slate-400 truncate max-w-sm">
                ID: {asset?.id}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {asset && (
              <button
                onClick={() => setShowSticker(true)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
                title="Generate physical sticker"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Sticker</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-5 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview & Passport
          </button>
          <button
            onClick={() => setActiveTab('attributes')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'attributes'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Dynamic Attributes
            {asset?.attributes && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-400">
                {Object.keys(asset.attributes).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'evidence'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Evidence Vault & Merkle
            {asset?.evidenceFiles && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300">
                {asset.evidenceFiles.length}
              </span>
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-xs font-mono">Syncing asset ledger state...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {!loading && asset && activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Submission Alert if REGISTERED */}
              {asset.status === 'REGISTERED' && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/30 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white">Asset in Registered Stage</div>
                      <p className="text-xs text-slate-300">
                        Attributes can still be modified and required evidence attached before
                        submitting for consortium verifier audit.
                      </p>
                    </div>
                  </div>

                  {verificationError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/20 text-xs text-rose-200 border border-rose-500/30">
                      {verificationError}
                    </div>
                  )}

                  {canEdit && (
                    <button
                      onClick={handleSubmitForVerification}
                      disabled={submittingVerification}
                      className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/20"
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
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Asset Class
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    {asset.typeKey}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Jurisdiction
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    {asset.jurisdiction || 'IN'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Registered Issuer
                  </div>
                  <div className="text-xs font-mono text-slate-300 truncate">
                    {asset.issuerId || 'N/A'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Designated Custodian
                  </div>
                  <div className="text-xs font-mono text-slate-300 truncate">
                    {asset.custodian || 'CustodianOrgMSP'}
                  </div>
                </div>
              </div>

              {/* Cryptographic Integrity Roots */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    Cryptographic Anchors
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">SHA-256</span>
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-850 flex items-center justify-between text-xs font-mono">
                    <div className="truncate mr-2">
                      <span className="text-slate-500 text-[10px] block">ATTRIBUTES HASH</span>
                      <span className="text-slate-300 text-[11px]">
                        {asset.attributesHash || 'None'}
                      </span>
                    </div>
                    {asset.attributesHash && (
                      <button
                        onClick={() => handleCopy(asset.attributesHash)}
                        className="p-1 rounded text-slate-400 hover:text-white"
                        title="Copy hash"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-850 flex items-center justify-between text-xs font-mono">
                    <div className="truncate mr-2">
                      <span className="text-slate-500 text-[10px] block">
                        EVIDENCE MERKLE ROOT
                      </span>
                      <span className="text-indigo-400 font-semibold text-[11px]">
                        {asset.evidenceRoot || '0x00000000000000000000000000000000'}
                      </span>
                    </div>
                    {asset.evidenceRoot && (
                      <button
                        onClick={() => handleCopy(asset.evidenceRoot)}
                        className="p-1 rounded text-slate-400 hover:text-white"
                        title="Copy Merkle root"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Audit Timestamps */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Created: {new Date(asset.createdAt).toLocaleString()}
                </span>
                <span>Updated: {new Date(asset.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          )}

          {!loading && asset && activeTab === 'attributes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">Dynamic Asset Attributes</h3>
                  <p className="text-[11px] text-slate-400">
                    Governed by {asset.typeKey} schema definition
                  </p>
                </div>
                {canEdit && !editingAttributes && (
                  <button
                    onClick={() => setEditingAttributes(true)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 text-xs font-semibold border border-indigo-500/30 transition"
                  >
                    Edit Attributes
                  </button>
                )}
              </div>

              {editingAttributes ? (
                <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  {Object.entries(editValues).map(([k, val]) => (
                    <div key={k} className="space-y-1">
                      <label className="text-xs font-medium text-slate-300 capitalize">
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
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ))}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setEditingAttributes(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAttributes}
                      disabled={savingAttributes}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      {savingAttributes ? 'Saving...' : 'Save & Hash'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-800 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                  {Object.entries(asset.attributes || {}).map(([key, val]) => {
                    const isRedacted =
                      val === '[REDACTED (CONSORTIUM PRIVILEGED)]' ||
                      val === '[REDACTED]';
                    return (
                      <div
                        key={key}
                        className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-900/50"
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-200 capitalize">
                            {key.replace(/([A-Z])/g, ' $1')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            key: {key}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isRedacted ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Redacted
                            </span>
                          ) : (
                            <span className="font-mono text-slate-300 font-medium">
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
                  <h3 className="text-xs font-bold text-white">Anchored Evidence Vault</h3>
                  <p className="text-[11px] text-slate-400">
                    Documents verified and anchored via SHA-256 Merkle root
                  </p>
                </div>
              </div>

              {attachSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{attachSuccess}</span>
                </div>
              )}

              {/* Evidence Document List */}
              <div className="space-y-2">
                {asset.evidenceFiles && asset.evidenceFiles.length > 0 ? (
                  asset.evidenceFiles.map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-white">{doc.title}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                            {doc.docType}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Anchored'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg text-[10px] font-mono">
                        <span className="text-slate-400 truncate max-w-sm">
                          SHA256: {doc.sha256}
                        </span>
                        <button
                          onClick={() => handleCopy(doc.sha256)}
                          className="p-1 rounded text-slate-400 hover:text-white"
                          title="Copy hash"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800">
                    No evidence documents attached yet.
                  </div>
                )}
              </div>

              {/* Attach Evidence Form (if REGISTERED) */}
              {canEdit && (
                <form
                  onSubmit={handleAttachEvidence}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
                >
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-indigo-400" />
                    Attach New Evidence Document
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold uppercase">
                        Document Type *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. TITLE_DEED, INVOICE_PDF"
                        value={uploadDocType}
                        onChange={(e) => setUploadDocType(e.target.value.toUpperCase())}
                        required
                        className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold uppercase">
                        Document Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Verified Government Registry"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase">
                        Document SHA-256 Hash *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          // generate mock deterministic sha256
                          const rand = Array.from({ length: 64 }, () =>
                            Math.floor(Math.random() * 16).toString(16)
                          ).join('');
                          setUploadHash(rand);
                        }}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300"
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
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={attaching || !uploadDocType || !uploadHash}
                    className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
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
