/**
 * Format validation for asset identifiers that are later matched against official
 * registries (Vahan, revenue/RTC records, GST e-invoice). Catching malformed
 * identifiers at registration keeps fabricated or mistyped assets off the ledger.
 *
 * Dependency-free so both the API and the web app can import it.
 */

// State-series plates (KA01AB1234, DL 3C AB 1234, MH-12-1234) and Bharat-series (22BH1234AA).
const VEHICLE_REG = /^(?:[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}|\d{2}BH\d{4}[A-Z]{1,2})$/;
// ISO 3779 VIN: 17 characters, no I, O or Q.
const VIN = /^[A-HJ-NPR-Z0-9]{17}$/;
// GSTIN: 2-digit state code, PAN, entity number, 'Z', checksum.
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
// GST invoice numbers: up to 16 characters, alphanumerics plus '/' and '-'.
const GST_INVOICE_NO = /^[A-Za-z0-9/-]{1,16}$/;
const SURVEY_NO = /^[A-Za-z0-9][A-Za-z0-9/\- ]{0,39}$/;

const GSTIN_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function isValidGstin(value) {
  const v = String(value || '').trim().toUpperCase();
  if (!GSTIN.test(v)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const code = GSTIN_CHARSET.indexOf(v[i]);
    const product = code * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  const check = GSTIN_CHARSET[(36 - (sum % 36)) % 36];
  return v[14] === check;
}

const compact = (v) => String(v ?? '').toUpperCase().replace(/[\s-]/g, '');
const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';
const num = (v) => (typeof v === 'number' ? v : Number(String(v ?? '').replace(/,/g, '')));

function checkYear(errors, attrs, field) {
  if (isBlank(attrs[field])) return;
  const y = num(attrs[field]);
  const max = new Date().getFullYear() + 1;
  if (!Number.isInteger(y) || y < 1980 || y > max) errors.push({ field, message: `must be a year between 1980 and ${max}` });
}

function checkPositive(errors, attrs, field, { integer = false } = {}) {
  if (isBlank(attrs[field])) return;
  const n = num(attrs[field]);
  if (!Number.isFinite(n) || n <= 0 || (integer && !Number.isInteger(n))) {
    errors.push({ field, message: integer ? 'must be a positive whole number' : 'must be greater than zero' });
  }
}

const VALIDATORS = {
  VEHICLE(attrs, errors) {
    if (!isBlank(attrs.registrationNumber) && !VEHICLE_REG.test(compact(attrs.registrationNumber))) {
      errors.push({ field: 'registrationNumber', message: 'is not a valid Indian registration number (e.g. KA01AB1234 or 22BH1234AA)' });
    }
    if (!isBlank(attrs.chassisNumber) && !VIN.test(compact(attrs.chassisNumber))) {
      errors.push({ field: 'chassisNumber', message: 'must be a 17-character VIN (letters I, O and Q are not used)' });
    }
    checkYear(errors, attrs, 'year');
    checkYear(errors, attrs, 'manufacturingYear');
    checkPositive(errors, attrs, 'purchasePriceInr');
  },
  REAL_ESTATE(attrs, errors) {
    if (!isBlank(attrs.surveyNumber) && !SURVEY_NO.test(String(attrs.surveyNumber).trim())) {
      errors.push({ field: 'surveyNumber', message: 'may contain only letters, digits, "/", "-" and spaces (max 40)' });
    }
    checkPositive(errors, attrs, 'builtUpSqFt');
  },
  INVOICE(attrs, errors) {
    if (!isBlank(attrs.invoiceNumber) && !GST_INVOICE_NO.test(String(attrs.invoiceNumber).trim())) {
      errors.push({ field: 'invoiceNumber', message: 'must be at most 16 characters: letters, digits, "/" or "-"' });
    }
    for (const field of ['supplierGstin', 'buyerGstin']) {
      if (!isBlank(attrs[field]) && !isValidGstin(attrs[field])) {
        errors.push({ field, message: 'is not a valid GSTIN (format or checksum)' });
      }
    }
    if (!isBlank(attrs.supplierGstin) && compact(attrs.supplierGstin) === compact(attrs.buyerGstin)) {
      errors.push({ field: 'buyerGstin', message: 'must differ from the supplier GSTIN' });
    }
    checkPositive(errors, attrs, 'amountPaise', { integer: true });
    if (!isBlank(attrs.dueDate) && Number.isNaN(Date.parse(attrs.dueDate))) {
      errors.push({ field: 'dueDate', message: 'must be a valid date (YYYY-MM-DD)' });
    }
  },
};

/** Supported registrable asset classes. */
export const SUPPORTED_ASSET_TYPE_KEYS = Object.keys(VALIDATORS);

/**
 * Returns a list of { field, message } problems; empty when the attributes are well-formed.
 * Unknown asset types return no errors (schema-level required checks still apply on-chain).
 */
export function validateAssetAttributes(typeKey, attributes = {}) {
  const errors = [];
  const validate = VALIDATORS[typeKey];
  if (validate) validate(attributes || {}, errors);
  return errors;
}
