import crypto from 'crypto';
import { chainBridge } from '../../core/chain/chain-bridge.js';
import { AppError } from '../../core/errors/app-error.js';

/**
 * Valuation Indication Engine: deterministic, auditable indicative pricing
 * that reduces valuer workload without replacing valuer judgment.
 *
 * Real-system guarantees:
 * - Only closed-form methods are automated (formula + cited inputs). Open
 *   methods (MARKET_COMPARABLE, DISCOUNTED_CASH_FLOW) are refused with a
 *   clear message instead of a fabricated number.
 * - Every input is echoed in `workings` and the canonical workings hash is
 *   returned as `indicationHash`, meant to be stored in the proposal's
 *   methodDetails so compliance can re-compute the exact figure on ledger.
 * - External prices are either fetched live (Agmarknet, key-configured) or
 *   supplied with source attribution. Nothing is invented.
 */

const DAY_MS = 24 * 3600 * 1000;
const SQFT_PER_SQM = 10.7639;

function num(v) {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(',')}}`;
}

const AUTOMATABLE = ['FACE_VALUE_DISCOUNTED', 'DEPRECIATED_COST', 'SPOT_MARKET_BENCHMARK', 'CIRCLE_RATE', 'CAP_RATE'];

const DEFAULT_METHOD = {
  INVOICE: 'FACE_VALUE_DISCOUNTED',
  VEHICLE: 'DEPRECIATED_COST',
  COMMODITY: 'SPOT_MARKET_BENCHMARK',
  LAND: 'CIRCLE_RATE',
  REAL_ESTATE: 'CAP_RATE',
};

async function fetchAgmarknetPrice(commodity, market) {
  const apiKey = process.env.AGMARKNET_API_KEY;
  const resourceId = process.env.AGMARKNET_RESOURCE_ID;
  const base = (process.env.AGMARKNET_BASE_URL || 'https://api.data.gov.in/resource').replace(/\/+$/, '');
  if (!apiKey || !resourceId) return null;
  const url = `${base}/${resourceId}?api-key=${encodeURIComponent(apiKey)}&format=json&limit=5&filters%5Bcommodity%5D=${encodeURIComponent(commodity)}&filters%5Bmarket%5D=${encodeURIComponent(market)}&sort%5Barrival_date%5D=desc`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload || !Array.isArray(payload.records) || payload.records.length === 0) {
      throw new Error(`Agmarknet returned ${res.status} with no usable records`);
    }
    const rec = payload.records[0];
    const price = num(rec.modal_price ?? rec.modalPrice);
    if (price === null) throw new Error('Agmarknet record has no modal price');
    return { pricePerKg: price / 100, market: rec.market || market, arrivalDate: rec.arrival_date || rec.arrivalDate || null };
  } catch (err) {
    if (err && err.name === 'AbortError') throw AppError.badRequest('Invalid market data response: Agmarknet request timed out');
    if (err instanceof AppError) throw err;
    throw AppError.badRequest(`Invalid market data response: Agmarknet unreachable (${err.message || err})`);
  } finally {
    clearTimeout(timer);
  }
}

function band(mid, bandBps) {
  return {
    low: Math.round(mid * (1 - bandBps / 10000)),
    mid,
    high: Math.round(mid * (1 + bandBps / 10000)),
  };
}

export class ValuationIndicationService {
  async indicate(caller, input) {
    const assetId = String(input.assetId || '').trim();
    if (!assetId) throw AppError.badRequest('assetId is required');

    const asset = await chainBridge.evaluate(caller, 'getAsset', { id: assetId });
    if (!asset) throw AppError.notFound(`Asset not found: ${assetId}`);
    if (asset.status !== 'VERIFIED') {
      throw AppError.badRequest(`Invalid asset state for indication: ${asset.status}. Asset must be VERIFIED.`);
    }

    const typeKey = `${asset.typeKey}:${asset.typeVersion || 1}`;
    const typeDef = await chainBridge.evaluate(caller, 'getAssetType', { key: asset.typeKey, version: asset.typeVersion || 1 }).catch(() => null);
    if (!typeDef) throw AppError.badRequest(`Invalid asset type for indication: ${typeKey} not found`);

    const allowedMethods = typeDef.valuation?.methods || [];
    const method = (input.method || DEFAULT_METHOD[asset.typeKey] || '').trim();
    if (!method) {
      throw AppError.badRequest(`Invalid valuation method for indication: no automatable default for ${asset.typeKey}. Supported: ${AUTOMATABLE.join(', ')}`);
    }
    if (!AUTOMATABLE.includes(method)) {
      throw AppError.badRequest(`Invalid valuation method for indication: '${method}' requires valuer judgment (open method). Supported: ${AUTOMATABLE.join(', ')}`);
    }
    if (allowedMethods.length > 0 && !allowedMethods.includes(method)) {
      throw AppError.badRequest(`Valuation method '${method}' is not allowed for asset type ${asset.typeKey}`);
    }

    const attrs = asset.attributes || {};
    const bandBps = input.bandBps ?? 300;
    const valuationDate = new Date().toISOString();
    let computed;

    if (method === 'FACE_VALUE_DISCOUNTED') {
      const amount = num(attrs.amountPaise);
      if (amount === null || amount <= 0) throw AppError.badRequest("Schema validation error: Missing required field 'amountPaise'");
      if (!attrs.dueDate) throw AppError.badRequest("Schema validation error: Missing required field 'dueDate'");
      const rateBps = input.annualDiscountRateBps ?? num(process.env.VALUATION_BASE_RATE_BPS) ?? 700;
      if (!(rateBps > 0)) throw AppError.badRequest('Invalid annualDiscountRateBps: must be a positive integer');
      const daysToDue = Math.max(0, Math.round((Date.parse(attrs.dueDate) - Date.parse(valuationDate)) / DAY_MS));
      const discount = Math.round((amount * rateBps * daysToDue) / (10000 * 365));
      const mid = Math.max(0, amount - discount);
      computed = {
        workings: { amountPaise: amount, dueDate: attrs.dueDate, daysToDue, annualDiscountRateBps: rateBps, discountPaise: discount, formula: 'amount - amount*rate*days/365' },
        ...band(mid, bandBps),
      };
    } else if (method === 'DEPRECIATED_COST') {
      const purchaseInr = num(attrs.purchasePriceInr);
      const mfgYear = num(attrs.manufacturingYear ?? attrs.year);
      if (purchaseInr === null || purchaseInr <= 0) throw AppError.badRequest("Schema validation error: Missing required field 'purchasePriceInr'");
      if (mfgYear === null) throw AppError.badRequest("Schema validation error: Missing required field 'manufacturingYear'");
      const ageYears = Math.max(0, new Date(valuationDate).getFullYear() - Math.floor(mfgYear));
      const wdvRateBps = 1500;
      const mid = Math.round(purchaseInr * 100 * Math.pow(1 - wdvRateBps / 10000, ageYears));
      computed = {
        workings: { purchasePriceInr: purchaseInr, manufacturingYear: Math.floor(mfgYear), ageYears, wdvRateBps, formula: 'purchase*0.85^age (15% WDV, Income-Tax depreciation block)' },
        ...band(mid, bandBps),
      };
    } else if (method === 'SPOT_MARKET_BENCHMARK') {
      const qty = num(attrs.quantityKg);
      if (qty === null || qty <= 0) throw AppError.badRequest("Schema validation error: Missing required field 'quantityKg'");
      let pricePerKg = input.marketPricePerKg !== undefined ? num(input.marketPricePerKg) : null;
      let marketName = input.marketName || attrs.storageLocation || null;
      let priceDate = input.priceDate || null;
      let priceSource = 'valuer-supplied mandi slip';
      if (pricePerKg === null) {
        const live = await fetchAgmarknetPrice(attrs.commodityType, marketName || '');
        if (!live) {
          throw AppError.badRequest('Missing market data: provide marketPricePerKg + marketName (Agmarknet live lookup not configured)');
        }
        pricePerKg = live.pricePerKg;
        marketName = live.market;
        priceDate = live.arrivalDate;
        priceSource = 'Agmarknet live modal price';
      }
      if (!(pricePerKg > 0)) throw AppError.badRequest('Invalid marketPricePerKg: must be positive');
      const mid = Math.round(qty * pricePerKg * 100);
      computed = {
        workings: { quantityKg: qty, pricePerKgInr: pricePerKg, market: marketName, priceDate, priceSource, formula: 'quantityKg * mandi modal price' },
        ...band(mid, bandBps),
      };
    } else if (method === 'CIRCLE_RATE') {
      const rateSource = input.rateSource;
      if (!rateSource) throw AppError.badRequest('Missing rate data: provide rateSource (e.g. Kaveri guidance 2024-25, Whitefield zone)');
      let areaSqM = null;
      let ratePerSqM = input.ratePerSqM !== undefined ? num(input.ratePerSqM) : null;
      if (attrs.areaSqMeters !== undefined) {
        areaSqM = num(attrs.areaSqMeters);
        if (ratePerSqM === null && input.ratePerSqFt !== undefined) {
          const r = num(input.ratePerSqFt);
          ratePerSqM = r === null ? null : Math.round(r * SQFT_PER_SQM * 100) / 100;
        }
      } else if (attrs.builtUpSqFt !== undefined) {
        const sqft = num(attrs.builtUpSqFt);
        const r = input.ratePerSqFt !== undefined ? num(input.ratePerSqFt) : null;
        if (sqft === null || r === null) throw AppError.badRequest('Missing rate data: provide ratePerSqFt for built-up area assets');
        areaSqM = Math.round((sqft / SQFT_PER_SQM) * 100) / 100;
        ratePerSqM = r * SQFT_PER_SQM;
      }
      if (areaSqM === null || !(areaSqM > 0)) throw AppError.badRequest("Schema validation error: Missing required field 'areaSqMeters'/'builtUpSqFt'");
      if (ratePerSqM === null || !(ratePerSqM > 0)) throw AppError.badRequest('Missing rate data: provide ratePerSqM (or ratePerSqFt)');
      const mid = Math.round(areaSqM * ratePerSqM * 100);
      computed = {
        workings: { areaSqMeters: areaSqM, ratePerSqMInr: Math.round(ratePerSqM * 100) / 100, rateSource, formula: 'areaSqM * guidance rate' },
        ...band(mid, bandBps),
      };
    } else if (method === 'CAP_RATE') {
      const rent = input.annualRentPaise !== undefined ? num(input.annualRentPaise) : null;
      const cap = input.capRateBps !== undefined ? num(input.capRateBps) : null;
      if (rent === null || !(rent > 0)) throw AppError.badRequest('Missing rate data: provide annualRentPaise (from lease deed)');
      if (cap === null || !(cap > 0)) throw AppError.badRequest('Missing rate data: provide capRateBps (market cap rate)');
      const mid = Math.round((rent * 10000) / cap);
      computed = {
        workings: { annualRentPaise: rent, capRateBps: cap, formula: 'annualRent / capRate' },
        ...band(mid, bandBps),
      };
    }

    const validityDays = typeDef.valuation?.validityDays || 90;
    const anchored = {
      assetId, method, computedWorkings: computed.workings,
      valuationDate, suggestedValidUntil: new Date(Date.parse(valuationDate) + validityDays * DAY_MS).toISOString(),
    };
    const indicationHash = crypto.createHash('sha256').update(stableStringify(anchored)).digest('hex');

    return {
      assetId,
      assetType: asset.typeKey,
      method,
      valuationDate,
      suggestedValidUntil: anchored.suggestedValidUntil,
      indicatedLowPaise: computed.low,
      indicatedMidPaise: computed.mid,
      indicatedHighPaise: computed.high,
      recommendedPaise: computed.mid,
      bandBps,
      workings: computed.workings,
      indicationHash,
      suggestedMethodDetails: { indicationHash, indicationMethod: method, indicationWorkings: computed.workings },
    };
  }
}

export const valuationIndicationService = new ValuationIndicationService();
