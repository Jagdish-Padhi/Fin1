/**
 * Product-grade error copy for the UI.
 *
 * The backend (and Fabric) can return deeply technical messages
 * ("10 ABORTED: ...", stack traces, correlation IDs, HTML error pages).
 * Every user-facing surface should pass errors through
 * `toFriendlyErrorMessage()` so users see calm, actionable copy instead.
 */

const FALLBACK = 'Something went wrong. Please try again in a moment.';

const RULE_COPY = {
  RULE_PARTICIPANT_INACTIVE:
    'One of the parties is not active on the network. Only active participants can transact.',
  RULE_KYC_NOT_VERIFIED:
    'Both parties need approved KYC before this transfer can execute.',
  RULE_SELF_TRANSFER_PROHIBITED: 'Sender and receiver cannot be the same participant.',
  RULE_ASSET_FROZEN:
    'This asset is currently frozen, retired or redeemed and cannot be transferred.',
  RULE_INSUFFICIENT_UNITS: 'The seller does not hold enough units for this transfer.',
  RULE_WHOLE_TOKEN_SPLIT_FORBIDDEN: 'Whole tokens cannot be split. Transfer exactly 1 unit.',
  RULE_MIN_TRANSFER_THRESHOLD: 'This transfer is below the minimum units allowed for this asset.',
  RULE_MAX_HOLDING_CAP_EXCEEDED:
    'This transfer would exceed the buyer holding cap for this token.',
  RULE_MAX_VALUE_CAP_EXCEEDED:
    'Transfer value exceeds the per-transaction cap. Lower the price or raise the participant limit.',
  RULE_LOCK_IN_ACTIVE: 'Seller units are still inside the lock-in period for this asset.',
  RULE_BUYER_CLASS_INSUFFICIENT:
    'The buyer investor class is below the minimum required for this asset.',
  RULE_JURISDICTION_RESTRICTED: 'The buyer jurisdiction is not permitted for this asset.',
  RULE_KYC_EXPIRED: 'One of the parties has expired KYC accreditation.',
  RULE_VALUATION_STALE: 'The asset valuation has expired. A fresh valuation is required.',
};

function extractStatus(input, raw) {
  if (input && typeof input.status === 'number') return input.status;
  const m = /HTTP\s(\d{3})|status[:\s]+(\d{3})|\((\d{3})\)/.exec(raw);
  if (m) return Number(m[1] || m[2] || m[3]);
  return null;
}

function looksTechnical(text) {
  return (
    /\d+\s(ABORTED|UNKNOWN|UNAVAILABLE|CANCELLED)/.test(text) ||
    /see attached details/i.test(text) ||
    /correlationId/i.test(text) ||
    /\.js:\d+/.test(text) ||
    /\n\s*at\s/.test(text) ||
    /<!DOCTYPE|<html/i.test(text) ||
    /^\s*\{/.test(text) ||
    /File863|node:internal/i.test(text) ||
    /failed to (evaluate|endorse|submit|commit) transaction/i.test(text) ||
    /endorser|chaincode response|MVCC_READ_CONFLICT|endorsement/i.test(text) ||
    /cannot (GET|POST|PUT|PATCH|DELETE)\s\//i.test(text) ||
    /internal server error|unexpected.*error occurred/i.test(text)
  );
}

function isServerFault(text) {
  return (
    /connection profile|not found at:|ENOENT|EACCES|connection refused/i.test(text) ||
    /internal server error|unexpected.*error occurred/i.test(text)
  );
}

function stripNoise(text) {
  return text
    .replace(/^\s*Upload error\s*\(\d+\)\s*:\s*/i, '')
    .replace(/^HTTP\s\d{3}[^:]*:\s*/i, '')
    .replace(/^\d+\s(ABORTED|UNKNOWN|UNAVAILABLE|CANCELLED)\s*:\s*/i, '')
    .replace(/\s*see attached details.*$/i, '')
    .trim();
}

/**
 * Convert any thrown error into short, user-safe copy.
 * Already-friendly server messages pass through untouched.
 */
export function toFriendlyErrorMessage(input, fallback = FALLBACK) {
  const raw = (input instanceof Error ? input.message : String(input ?? '')).trim();
  if (!raw) return fallback;
  const status = extractStatus(input, raw);

  // 1. Network / connectivity
  if (/failed to fetch|networkerror|socket hang up|load failed|network request failed|econnrefused/i.test(raw)) {
    return 'Cannot reach the server. Check your connection and try again.';
  }

  // 2. Session
  if (status === 401 || /unauthorized|invalid token|session.*expir|jwt expired|no token/i.test(raw)) {
    return 'Your session has expired. Please log in again.';
  }

  // 3. Permissions
  if (status === 403 || /forbidden|not permitted|segregation of duties/i.test(raw)) {
    return "You don't have permission to perform this action with your current role.";
  }

  // 4. Server faults (config/files/infra) must never surface internals
  if (status !== 404 && isServerFault(raw)) {
    return 'Something went wrong on our side. Please try again in a moment.';
  }

  // 5. Not found (genuine missing records)
  if (status === 404 || (/not found/i.test(raw) && !/endpoint/i.test(raw))) {
    return 'The requested record was not found. It may have been removed.';
  }

  // 5. Conflicts / duplicates (chaincode guards)
  if (
    status === 409 ||
    /already exists|duplicate|already attached|already registered|already tokenized|already decided|already pending/i.test(raw)
  ) {
    return 'This already exists on the ledger — no duplicate was created.';
  }

  // 6. Rate limiting (backend message is already friendly; keep it short)
  if (status === 429 || /too many/i.test(raw)) {
    return 'Too many attempts. Please wait a minute and try again.';
  }

  // 7. File size
  if (/too large|25 MB/i.test(raw)) {
    return 'Document file is too large. Maximum supported upload size is 25 MB.';
  }

  // 8. Chaincode business-rule rejections
  const ruleMatch = /(RULE_[A-Z_]+)/.exec(raw);
  if (ruleMatch && RULE_COPY[ruleMatch[1]]) {
    return RULE_COPY[ruleMatch[1]];
  }
  if (/rejected by|rule|policy/i.test(raw) && /transfer|kyc|holding|cap|lock/i.test(raw)) {
    const cleaned = stripNoise(raw);
    if (cleaned && !looksTechnical(cleaned) && cleaned.length <= 200) return cleaned;
    return 'Blocked by network policy. Review the highlighted requirements and try again.';
  }

  // 9. Readable server messages pass through (trimmed, capped)
  const cleaned = stripNoise(raw);
  if (cleaned && !looksTechnical(cleaned) && cleaned.length <= 200 && !/^api error/i.test(cleaned)) {
    return cleaned;
  }

  // 10. Last resort: never leak internals
  return fallback;
}
