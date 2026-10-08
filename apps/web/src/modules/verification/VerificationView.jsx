import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { useToast } from '../../shared/components/Toast.jsx';
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
} from 'lucide-react';

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
  const [checkResult, setCheckResult] = useState('PASSED');
  const [checkNotes, setCheckNotes] = useState('');
  const [checkSourceRef, setCheckSourceRef] = useState('');
  const [submittingCheck, setSubmittingCheck] = useState(false);

  // Form states for final decision
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState('APPROVED');
  const [reasonCode, setReasonCode] = useState('SATISFIES_CRITERIA');
  const [reasonText, setReasonText] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  const isVerifier = user?.role === 'VERIFIER';

  const loadCases = async () => {
    try {
      setLoading(true);
      const res = await api.getVerificationCases();
      setCases(res.data || []);
      if (res.data?.length > 0 && !selectedCase) {
        setSelectedCase(res.data[0]);
      }
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D8E0E8]">
        <div>
          <h2 className="text-xl font-bold text-[#0F2A43] flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-[#1F5A7A]" />
            Independent Verification Desk
          </h2>
          <p className="text-xs text-[#5A6A7E] mt-1">
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
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#5A6A7E]" />
              <input
                type="text"
                placeholder="Search by Case ID or Asset ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#D8E0E8] rounded-lg text-xs text-[#17202A] placeholder-[#5A6A7E] focus:outline-none focus:border-[#1F5A7A]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-[#D8E0E8] rounded-lg px-2.5 py-1.5 text-xs text-[#0F2A43] font-medium focus:outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="bg-white border border-[#D8E0E8] rounded-xl overflow-hidden shadow-2xs divide-y divide-[#D8E0E8] max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#5A6A7E]">Loading verification cases...</div>
            ) : filteredCases.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#5A6A7E]">
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
                      isSelected ? 'bg-[#F0F4F8] border-l-4 border-l-[#0F2A43]' : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-[#0F2A43]">{c.id}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          c.status === 'APPROVED'
                            ? 'bg-[#ECFDF5] text-[#18794E] border-[#A7F3D0]'
                            : c.status === 'REJECTED'
                            ? 'bg-[#FEF2F2] text-[#B42318] border-[#FECACA]'
                            : 'bg-[#EFF6FF] text-[#1F5A7A] border-[#BFDBFE]'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="text-xs text-[#17202A] font-medium truncate">
                      Asset: <span className="font-mono">{c.assetId}</span>
                    </div>
                    <div className="text-[10px] text-[#5A6A7E] mt-1 flex items-center justify-between">
                      <span>Verifier: {c.assignedVerifier || 'Consortium Pool'}</span>
                      <span>Checks: {c.checks?.length || 0}</span>
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
            <div className="bg-white border border-[#D8E0E8] rounded-xl p-6 shadow-2xs space-y-6">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D8E0E8]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#0F2A43] font-mono">{selectedCase.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded font-semibold bg-[#F0F4F8] text-[#1F5A7A]">
                      {selectedCase.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6A7E] mt-1">
                    Target Asset: <strong className="text-[#17202A] font-mono">{selectedCase.assetId}</strong>
                  </p>
                </div>

                {/* Verifier Actions */}
                {isVerifier && selectedCase.status !== 'APPROVED' && selectedCase.status !== 'REJECTED' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowCheckModal(true)}
                      className="px-3 py-1.5 bg-[#0F2A43] hover:bg-[#1F5A7A] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Add Check
                    </button>
                    <button
                      onClick={() => setShowDecisionModal(true)}
                      className="px-3 py-1.5 bg-[#0F766E] hover:bg-[#0c615a] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Issue Decision
                    </button>
                  </div>
                )}
              </div>

              {/* Case Attributes & Assignment */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-[#F8FAFC] border border-[#D8E0E8] rounded-lg p-3">
                  <div className="text-[10px] text-[#5A6A7E] uppercase font-bold">Created At</div>
                  <div className="font-mono text-[#17202A] mt-0.5">
                    {selectedCase.createdAt ? new Date(selectedCase.createdAt).toLocaleString() : 'N/A'}
                  </div>
                </div>
                <div className="bg-[#F8FAFC] border border-[#D8E0E8] rounded-lg p-3">
                  <div className="text-[10px] text-[#5A6A7E] uppercase font-bold">Assigned Verifier</div>
                  <div className="font-semibold text-[#0F2A43] mt-0.5">
                    {selectedCase.assignedVerifier || 'Consortium Pool'}
                  </div>
                </div>
                <div className="bg-[#F8FAFC] border border-[#D8E0E8] rounded-lg p-3">
                  <div className="text-[10px] text-[#5A6A7E] uppercase font-bold">Completed Checks</div>
                  <div className="font-semibold text-[#18794E] mt-0.5">
                    {selectedCase.checks?.length || 0} Criteria Tested
                  </div>
                </div>
              </div>

              {/* Recorded Checklist Items */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#0F2A43] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#1F5A7A]" />
                  Cryptographic Verification Checks ({selectedCase.checks?.length || 0})
                </h4>

                {(!selectedCase.checks || selectedCase.checks.length === 0) ? (
                  <div className="p-6 text-center text-xs text-[#5A6A7E] bg-[#F8FAFC] rounded-lg border border-[#D8E0E8]">
                    No independent audit checks recorded for this asset yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedCase.checks.map((chk, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-[#F8FAFC] border border-[#D8E0E8] rounded-lg text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#0F2A43] font-mono">{chk.checkKey}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              chk.result === 'PASSED'
                                ? 'bg-[#ECFDF5] text-[#18794E]'
                                : chk.result === 'FAILED'
                                ? 'bg-[#FEF2F2] text-[#B42318]'
                                : 'bg-[#FEFCE8] text-[#A16207]'
                            }`}
                          >
                            {chk.result}
                          </span>
                        </div>
                        <p className="text-[#5A6A7E]">{chk.notes || 'No notes provided'}</p>
                        {chk.sourceRef && (
                          <div className="text-[10px] font-mono text-[#1F5A7A] truncate">
                            Evidence Source: {chk.sourceRef}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[#5A6A7E] bg-white border border-[#D8E0E8] rounded-xl">
              Select a verification case to review checklist and issue decisions.
            </div>
          )}
        </div>
      </div>

      {/* Record Check Modal */}
      {showCheckModal && (
        <div className="fixed inset-0 z-50 bg-[#0F2A43]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E0E8] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#D8E0E8]">
              <h3 className="text-sm font-bold text-[#0F2A43]">Record Verification Audit Check</h3>
              <button
                onClick={() => setShowCheckModal(false)}
                className="p-1 hover:bg-[#F0F4F8] rounded text-[#5A6A7E] transition"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRecordCheck} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Check Type</label>
                <select
                  value={checkKey}
                  onChange={(e) => setCheckKey(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg bg-white"
                >
                  <option value="LEGAL_TITLE_SEARCH">Legal Title & Non-Encumbrance Search</option>
                  <option value="PHYSICAL_INSPECTION">On-Site Physical Inspection</option>
                  <option value="REGULATORY_COMPLIANCE">Regulatory Jurisdiction Filing</option>
                  <option value="INSURANCE_COVERAGE">Commercial Insurance Verification</option>
                </select>
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Result</label>
                <select
                  value={checkResult}
                  onChange={(e) => setCheckResult(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg bg-white font-semibold"
                >
                  <option value="PASSED">PASSED</option>
                  <option value="FAILED">FAILED</option>
                  <option value="INCONCLUSIVE">INCONCLUSIVE</option>
                </select>
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Audit Notes / Findings</label>
                <textarea
                  rows="3"
                  value={checkNotes}
                  onChange={(e) => setCheckNotes(e.target.value)}
                  placeholder="Summarize registry search findings or surveyor notes..."
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Source Reference / Doc CID</label>
                <input
                  type="text"
                  value={checkSourceRef}
                  onChange={(e) => setCheckSourceRef(e.target.value)}
                  placeholder="e.g. REG-MUMBAI-2026-981"
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckModal(false)}
                  className="px-4 py-2 border border-[#D8E0E8] rounded-lg text-[#5A6A7E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCheck}
                  className="px-4 py-2 bg-[#0F2A43] text-white rounded-lg font-semibold hover:bg-[#1F5A7A]"
                >
                  {submittingCheck ? 'Recording...' : 'Commit Check'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decision Modal */}
      {showDecisionModal && (
        <div className="fixed inset-0 z-50 bg-[#0F2A43]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E0E8] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#D8E0E8]">
              <h3 className="text-sm font-bold text-[#0F2A43]">Issue Formal Verification Decision</h3>
              <button
                onClick={() => setShowDecisionModal(false)}
                className="p-1 hover:bg-[#F0F4F8] rounded text-[#5A6A7E] transition"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleDecide} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Formal Verdict</label>
                <select
                  value={decisionType}
                  onChange={(e) => setDecisionType(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg bg-white font-semibold"
                >
                  <option value="APPROVED">APPROVED (Ready for Valuation & Tokenization)</option>
                  <option value="CHANGES_REQUESTED">CHANGES REQUESTED (Additional Proof Needed)</option>
                  <option value="REJECTED">REJECTED (Failed Due Diligence)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Reason Code</label>
                <input
                  type="text"
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Decision Justification</label>
                <textarea
                  rows="3"
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="Provide comprehensive rationale entered into tamper-proof audit trail..."
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDecisionModal(false)}
                  className="px-4 py-2 border border-[#D8E0E8] rounded-lg text-[#5A6A7E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDecision}
                  className="px-4 py-2 bg-[#0F766E] text-white rounded-lg font-semibold hover:bg-[#0c615a]"
                >
                  {submittingDecision ? 'Submitting...' : 'Sign & Submit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
