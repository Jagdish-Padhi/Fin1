import crypto from 'crypto';
import { chainBridge } from '../../core/chain/chain-bridge.js';
import { AppError } from '../../core/errors/app-error.js';

/**
 * Registry Oracle: automated cross-verification of ledger assets against
 * authoritative off-chain registries (Vahan, Bhoomi RTC, GST e-invoice).
 *
 * Real-system guarantees:
 * - The oracle NEVER invents registry data. It either fetches from a live
 *   provider (configured via REGISTRY_* env) or validates a verifier-supplied
 *   registry response object field-by-field against ledger attributes.
 * - Every recorded check carries sourceRef = registry:<NAME>:<sha256> of the
 *   canonical query+response payload, so any PASS/FAIL is independently
 *   re-computable from anchored evidence.
 * - Human verifier retains the final APPROVED/REJECTED decision (SoD intact).
 */

const normText = (v) => String(v ?? '').trim().toLowerCase();
const normUpper = (v) => String(v ?? '').trim().toUpperCase();
const normNum = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) && String(v ?? '').trim() !== '' ? n : null;
};

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(',')}}`;
}

function cmpField(field, expected, observed, { numeric = false, toleranceBps = 0 } = {}) {
  if (numeric) {
    const e = normNum(expected);
    const o = normNum(observed);
    if (e === null || o === null) {
      return { field, expected: expected ?? null, observed: observed ?? null, match: false, reason: 'non-numeric value' };
    }
    const diffBps = e === 0 ? (o === 0 ? 0 : Infinity) : Math.abs((o - e) / Math.abs(e)) * 10000;
    return { field, expected: e, observed: o, match: diffBps <= toleranceBps };
  }
  return { field, expected: expected ?? null, observed: observed ?? null, match: normText(expected) === normText(observed) };
}

const REGISTRY_SPECS = {
  VEHICLE: {
    registry: 'VAHAN',
    displayName: 'Vahan National Vehicle Registry',
    checkKey: 'RC_VALID',
    requiredAssetFields: ['registrationNumber'],
    requiredResponseFields: ['registrationNumber', 'maker', 'model'],
    optionalResponseFields: ['fuel', 'ownerName', 'fitnessValidUpto', 'insuranceValidUpto'],
    compare(asset, query, response) {
      const out = [
        cmpField('registrationNumber', asset.registrationNumber, response.registrationNumber),
        cmpField('maker', asset.make, response.maker),
        cmpField('model', asset.model, response.model),
      ];
      if (response.fuel !== undefined && asset.fuelType !== undefined) {
        out.push(cmpField('fuelType', asset.fuelType, response.fuel));
      }
      return out;
    },
  },
  REAL_ESTATE: {
    registry: 'BHOOMI_RTC',
    displayName: 'Bhoomi RTC / Encumbrance Registry',
    checkKey: 'TITLE_SEARCH',
    requiredAssetFields: ['surveyNumber'],
    requiredResponseFields: ['surveyNumber'],
    optionalResponseFields: ['district', 'state', 'areaSqFt', 'landUse', 'ownerName'],
    compare(asset, query, response) {
      const out = [cmpField('surveyNumber', asset.surveyNumber, response.surveyNumber)];
      const districtRef = query.district ?? response.district;
      if (query.district !== undefined || response.district !== undefined) {
        out.push(cmpField('district', districtRef, response.district));
      }
      if (response.areaSqFt !== undefined && asset.builtUpSqFt !== undefined) {
        out.push(cmpField('builtUpSqFt', asset.builtUpSqFt, response.areaSqFt, { numeric: true, toleranceBps: 200 }));
      }
      return out;
    },
  },
  LAND: {
    registry: 'BHOOMI_RTC',
    displayName: 'Bhoomi RTC / State Land Registry',
    checkKey: 'TITLE_SEARCH',
    requiredAssetFields: ['surveyNumber'],
    requiredResponseFields: ['surveyNumber'],
    optionalResponseFields: ['district', 'state', 'areaSqMeters', 'landUse', 'ownerName'],
    compare(asset, query, response) {
      const out = [cmpField('surveyNumber', asset.surveyNumber, response.surveyNumber)];
      const districtRef = query.district ?? response.district;
      if (query.district !== undefined || response.district !== undefined) {
        out.push(cmpField('district', districtRef, response.district));
      }
      if (response.areaSqMeters !== undefined && asset.areaSqMeters !== undefined) {
        out.push(cmpField('areaSqMeters', asset.areaSqMeters, response.areaSqMeters, { numeric: true, toleranceBps: 200 }));
      }
      return out;
    },
  },
  INVOICE: {
    registry: 'GST_EINVOICE',
    displayName: 'GST e-Invoice Registry (IRN)',
    checkKey: 'E_INVOICE_PORTAL',
    requiredAssetFields: ['invoiceNumber', 'supplierGstin'],
    requiredResponseFields: ['invoiceNumber', 'supplierGstin', 'irnStatus'],
    optionalResponseFields: ['buyerGstin', 'amountPaise', 'irReference'],
    compare(asset, query, response) {
      const out = [
        cmpField('invoiceNumber', asset.invoiceNumber, response.invoiceNumber),
        { ...cmpField('supplierGstin', asset.supplierGstin, response.supplierGstin), expected: normUpper(asset.supplierGstin), observed: normUpper(response.supplierGstin), match: normUpper(asset.supplierGstin) === normUpper(response.supplierGstin) },
      ];
      if (response.buyerGstin !== undefined && asset.buyerGstin !== undefined) {
        out.push({ ...cmpField('buyerGstin', asset.buyerGstin, response.buyerGstin), expected: normUpper(asset.buyerGstin), observed: normUpper(response.buyerGstin), match: normUpper(asset.buyerGstin) === normUpper(response.buyerGstin) });
      }
      if (response.amountPaise !== undefined && asset.amountPaise !== undefined) {
        out.push(cmpField('amountPaise', asset.amountPaise, response.amountPaise, { numeric: true, toleranceBps: 0 }));
      }
      const statusOk = ['ACTIVE', 'VALID', 'VERIFIED'].includes(normUpper(response.irnStatus));
      out.push({ field: 'irnStatus', expected: 'ACTIVE', observed: response.irnStatus ?? null, match: statusOk });
      return out;
    },
  },
};

function providerConfig(registry) {
  const url = process.env[`REGISTRY_${registry}_URL`];
  const key = process.env[`REGISTRY_${registry}_KEY`];
  if (url && String(url).trim() !== '') {
    return { mode: 'live', url: String(url).trim(), key: key && String(key).trim() !== '' ? key : undefined };
  }
  return { mode: 'manual' };
}

async function fetchFromProvider(spec, provider, query, referenceNumber) {
  const body = { registry: spec.registry, query: query || {}, referenceNumber };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(provider.key ? { Authorization: `Bearer ${provider.key}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw AppError.badRequest(`Invalid registry provider response: non-JSON from ${spec.registry} (${res.status})`);
    }
    if (!res.ok) {
      throw AppError.badRequest(`Invalid registry provider response: ${spec.registry} returned ${res.status}`);
    }
    const record = payload && typeof payload === 'object' && payload.record && typeof payload.record === 'object' ? payload.record : payload;
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw AppError.badRequest(`Invalid registry provider response: missing record object from ${spec.registry}`);
    }
    return record;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err && err.name === 'AbortError') {
      throw AppError.badRequest(`Invalid registry provider response: ${spec.registry} request timed out`);
    }
    throw AppError.badRequest(`Invalid registry provider response: ${spec.registry} unreachable (${err.message || err})`);
  } finally {
    clearTimeout(timer);
  }
}

export class RegistryOracleService {
  capabilities() {
    return Object.entries(REGISTRY_SPECS).map(([typeKey, spec]) => {
      const provider = providerConfig(spec.registry);
      return {
        typeKey,
        registry: spec.registry,
        displayName: spec.displayName,
        checkKey: spec.checkKey,
        mode: provider.mode,
        requiredAssetFields: spec.requiredAssetFields,
        requiredResponseFields: spec.requiredResponseFields,
        optionalResponseFields: spec.optionalResponseFields,
      };
    });
  }

  async runRegistryCheck(caller, caseId, input = {}) {
    if (!caseId || String(caseId).trim() === '') {
      throw AppError.badRequest('caseId is required');
    }

    const verificationCase = await chainBridge.evaluate(caller, 'getVerificationCase', { caseId });
    if (!verificationCase) {
      throw AppError.notFound(`Verification case not found: ${caseId}`);
    }
    if (verificationCase.decision) {
      throw AppError.conflict(`Verification case already decided: ${caseId}`);
    }

    const asset = await chainBridge.evaluate(caller, 'getAsset', { id: verificationCase.assetId });
    if (!asset) {
      throw AppError.notFound(`Asset not found: ${verificationCase.assetId}`);
    }

    const spec = REGISTRY_SPECS[asset.typeKey];
    if (!spec) {
      throw AppError.badRequest(`Invalid asset type for registry verification: ${asset.typeKey}. Supported: ${Object.keys(REGISTRY_SPECS).join(', ')}`);
    }

    const attributes = asset.attributes || {};
    for (const field of spec.requiredAssetFields) {
      if (attributes[field] === undefined || attributes[field] === null || attributes[field] === '') {
        throw AppError.badRequest(`Schema validation error: Missing required field '${field}'`);
      }
    }

    const query = input.registryQuery && typeof input.registryQuery === 'object' ? input.registryQuery : {};
    const provider = providerConfig(spec.registry);
    let response = input.registryResponse;
    let mode = provider.mode;
    if (provider.mode === 'live' && input.referenceNumber && !response) {
      response = await fetchFromProvider(spec, provider, query, input.referenceNumber);
      mode = 'live';
    } else {
      mode = 'manual';
    }

    if (!response || typeof response !== 'object' || Array.isArray(response)) {
      if (provider.mode === 'live') {
        throw AppError.badRequest('Missing registry data: provide referenceNumber for live lookup or registryResponse for manual verification');
      }
      throw AppError.badRequest(`Missing registry data: paste the ${spec.displayName} record as registryResponse (live provider not configured)`);
    }

    for (const field of spec.requiredResponseFields) {
      if (response[field] === undefined || response[field] === null || response[field] === '') {
        throw AppError.badRequest(`Invalid registry response: Missing required field '${field}' for ${spec.registry}`);
      }
    }

    const comparisons = spec.compare(attributes, query, response);
    const matched = comparisons.filter((c) => c.match).length;
    const passed = comparisons.length > 0 && comparisons.every((c) => c.match);

    const anchored = {
      registry: spec.registry,
      assetId: asset.id,
      caseId: verificationCase.id,
      query,
      response,
      referenceNumber: input.referenceNumber || null,
      mode,
      fetchedAt: new Date().toISOString(),
    };
    const responseHash = crypto.createHash('sha256').update(stableStringify(anchored)).digest('hex');
    const sourceRef = `registry:${spec.registry}:${responseHash}`;

    const detail = comparisons.map((c) => `${c.field}=${c.match ? 'match' : `MISMATCH (ledger ${JSON.stringify(c.expected)} vs registry ${JSON.stringify(c.observed)})`}`).join('; ');
    const notes = `${spec.displayName} cross-check for ${asset.id}: ${matched}/${comparisons.length} fields matched [${detail}]. Anchored sha256:${responseHash.slice(0, 16)}.`;

    const submission = await chainBridge.submit(caller, 'recordVerificationCheck', {
      caseId: verificationCase.id,
      checkKey: spec.checkKey,
      result: passed ? 'PASS' : 'FAIL',
      notes,
      sourceRef,
    });

    return {
      ...(submission.result !== undefined ? submission : { result: submission }),
      comparison: { checkKey: spec.checkKey, result: passed ? 'PASS' : 'FAIL', matched, total: comparisons.length, comparisons, sourceRef, mode },
    };
  }
}

export const registryOracleService = new RegistryOracleService();
