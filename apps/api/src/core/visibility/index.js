import { Role } from '@rwa/contracts';

/**
 * Server-side data visibility scoping layer.
 * Enforces PS role separation consistently across both Mock and Fabric modes.
 */

// 1. Assets Scoping
export function scopeAssets(caller, assets = []) {
  if (!caller || !caller.role) return [];
  const role = caller.role;

  if (role === Role.COMPLIANCE || role === Role.AUDITOR) {
    return assets.map((a) => scopeAssetAttributes(caller, a));
  }

  if (role === Role.ISSUER) {
    return assets
      .filter((a) => a.originatorParticipantId === caller.participantId || a.originatorMspId === caller.mspId)
      .map((a) => scopeAssetAttributes(caller, a));
  }

  // All other roles (ADMINISTRATOR, VERIFIER, VALUER, INVESTOR) cannot list /assets
  return [];
}

export function scopeAssetDetail(caller, asset) {
  if (!asset || !caller || !caller.role) return null;
  const role = caller.role;

  if (role === Role.ADMINISTRATOR) {
    return null;
  }

  if (role === Role.COMPLIANCE || role === Role.AUDITOR) {
    return scopeAssetAttributes(caller, asset);
  }

  if (role === Role.ISSUER) {
    if (asset.originatorParticipantId === caller.participantId || asset.originatorMspId === caller.mspId) {
      return scopeAssetAttributes(caller, asset);
    }
    return null;
  }

  if (role === Role.VERIFIER || role === Role.VALUER || role === Role.INVESTOR) {
    return scopeAssetAttributes(caller, asset);
  }

  return null;
}

export function scopeAssetAttributes(caller, asset) {
  if (!asset) return null;
  const copy = { ...asset };
  const role = caller?.role;

  const canSeeRestricted =
    role === Role.COMPLIANCE ||
    role === Role.AUDITOR ||
    role === Role.VERIFIER ||
    (role === Role.ISSUER &&
      (asset.originatorParticipantId === caller?.participantId || asset.originatorMspId === caller?.mspId));

  if (!canSeeRestricted && copy.attributes) {
    const redactedAttrs = { ...copy.attributes };
    for (const [key, val] of Object.entries(redactedAttrs)) {
      if (
        key === 'purchasePriceInr' ||
        key === 'confidentialNotes' ||
        key === 'internalValuation'
      ) {
        redactedAttrs[key] = '[REDACTED (CONSORTIUM PRIVILEGED)]';
      }
    }
    copy.attributes = redactedAttrs;
  }

  return copy;
}

// 2. Verification Cases Scoping
export function scopeVerificationCases(caller, cases = []) {
  if (!caller || !caller.role) return [];
  const role = caller.role;

  if (role === Role.COMPLIANCE || role === Role.AUDITOR) {
    return cases;
  }

  if (role === Role.VERIFIER) {
    return cases.filter(
      (c) =>
        !c.assignedVerifierId ||
        c.assignedVerifierId === caller.userId ||
        c.assignedVerifierId === caller.participantId
    );
  }

  return [];
}

// 3. Valuations Scoping
export function scopeValuations(caller, valuations = [], assets = []) {
  if (!caller || !caller.role) return [];
  const role = caller.role;

  if (role === Role.COMPLIANCE || role === Role.AUDITOR) {
    return valuations;
  }

  if (role === Role.VALUER) {
    return valuations.filter(
      (v) =>
        v.proposerId === caller.userId ||
        v.proposerParticipantId === caller.participantId ||
        v.proposedByMspId === caller.mspId ||
        v.source?.valuerOrg === caller.orgId ||
        (v.source?.valuerName && v.source?.valuerName.toLowerCase().includes('valuer'))
    );
  }

  if (role === Role.ISSUER) {
    const ownAssetIds = new Set(
      assets
        .filter((a) => a.originatorParticipantId === caller.participantId || a.originatorMspId === caller.mspId)
        .map((a) => a.id)
    );
    return valuations.filter((v) => ownAssetIds.has(v.assetId));
  }

  return [];
}

// 4. Tokens Scoping
export function scopeTokens(caller, tokens = []) {
  if (!caller || !caller.role) return [];
  const role = caller.role;

  if (role === Role.COMPLIANCE || role === Role.AUDITOR) {
    return tokens;
  }

  if (role === Role.ISSUER || role === Role.INVESTOR) {
    return tokens.filter((t) => t.status === 'ACTIVE' || t.status === 'TOKENIZED');
  }

  return [];
}

// 5. Holders / Cap Table Scoping
export function scopeHolders(caller, holders = [], token = null, asset = null) {
  if (!caller || !caller.role) return null;
  const role = caller.role;

  if (role === Role.COMPLIANCE || role === Role.AUDITOR) {
    return holders;
  }

  if (role === Role.ISSUER) {
    const isOwn =
      (asset && (asset.originatorParticipantId === caller.participantId || asset.originatorMspId === caller.mspId)) ||
      (token && token.issuerParticipantId === caller.participantId);
    if (isOwn) {
      return holders;
    }
  }

  return null;
}

// 6. Balances Scoping
export function scopeBalance(caller, targetParticipantId) {
  if (!caller || !caller.role) return false;
  const role = caller.role;

  if (role === Role.COMPLIANCE || role === Role.AUDITOR) {
    return true;
  }

  if (role === Role.INVESTOR) {
    return caller.participantId === targetParticipantId;
  }

  if (role === Role.ISSUER) {
    return caller.participantId === targetParticipantId;
  }

  return false;
}

// 7. Transfers Scoping
export function scopeTransfers(caller, transfers = []) {
  if (!caller || !caller.role) return [];
  const role = caller.role;

  if (role === Role.COMPLIANCE || role === Role.AUDITOR) {
    return transfers;
  }

  if (role === Role.ISSUER || role === Role.INVESTOR) {
    return transfers.filter(
      (t) =>
        t.fromParticipantId === caller.participantId ||
        t.toParticipantId === caller.participantId ||
        t.from === caller.participantId ||
        t.to === caller.participantId
    );
  }

  return [];
}

// 8. Participants Scoping & Redaction
export function scopeParticipants(caller, participants = []) {
  if (!caller || !caller.role) return [];
  const role = caller.role;

  if (role === Role.COMPLIANCE || role === Role.AUDITOR) {
    return participants.map((p) => sanitizeParticipantForComplianceOrAuditor(caller, p));
  }

  if (role === Role.ADMINISTRATOR) {
    return participants.map((p) => sanitizeParticipantForAdmin(p));
  }

  if (role === Role.ISSUER || role === Role.INVESTOR) {
    return participants
      .filter((p) => p.id === caller.participantId || p.userId === caller.userId)
      .map((p) => sanitizeParticipantForOwner(p));
  }

  return [];
}

function sanitizeParticipantForAdmin(p) {
  const copy = { ...p };
  delete copy.pii;
  delete copy.piiHash;
  delete copy.kycDocs;
  delete copy.kycReason;
  delete copy.kycStatus;
  delete copy.kycExpiry;
  delete copy.suspendReason;
  delete copy.blacklistReason;
  return copy;
}

function sanitizeParticipantForComplianceOrAuditor(caller, p) {
  const copy = { ...p };
  return copy;
}

function sanitizeParticipantForOwner(p) {
  const copy = { ...p };
  return copy;
}

// 9. Audit Trail Scoping
export function scopeAudit(caller, auditLogs = [], entityId = null) {
  if (!caller || !caller.role) return [];
  const role = caller.role;

  if (role === Role.COMPLIANCE || role === Role.AUDITOR) {
    return entityId
      ? auditLogs.filter((log) => log.entityId === entityId)
      : auditLogs;
  }

  if ((role === Role.ISSUER || role === Role.INVESTOR) && entityId) {
    return auditLogs.filter((log) => log.entityId === entityId);
  }

  return [];
}
