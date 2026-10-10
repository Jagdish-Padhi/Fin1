import { TokenStandard } from './enums.js';

export const DEFAULT_ASSET_TYPES = [
  {
    key: 'VEHICLE',
    version: 1,
    displayName: 'Commercial & Agricultural Vehicles',
    uniqueFields: ['registrationNumber', 'chassisNumber'],
    attributeSchema: {
      registrationNumber: {
        type: 'string',
        required: true,
        visibility: 'PUBLIC',
      },
      chassisNumber: { type: 'string', required: true, visibility: 'PUBLIC' },
      make: { type: 'string', required: true, visibility: 'PUBLIC' },
      model: { type: 'string', required: true, visibility: 'PUBLIC' },
      year: { type: 'number', required: false, visibility: 'PUBLIC' },
      manufacturingYear: {
        type: 'number',
        required: false,
        visibility: 'PUBLIC',
      },
      fuelType: { type: 'string', required: false, visibility: 'PUBLIC' },
      fleetOperator: {
        type: 'string',
        required: false,
        visibility: 'PUBLIC',
      },
      purchasePriceInr: {
        type: 'number',
        required: false,
        visibility: 'RESTRICTED',
      },
    },
    evidenceRequirements: [
      {
        docType: 'RC_BOOK',
        required: true,
        description: 'Vehicle Registration Certificate',
      },
      {
        docType: 'INSURANCE_POLICY',
        required: true,
        description: 'Valid Commercial Insurance Policy',
      },
      {
        docType: 'FITNESS_CERT',
        required: true,
        description: 'Transport Department Fitness Certificate',
      },
    ],
    verificationChecklist: [
      {
        key: 'RC_VALID',
        label: 'Verify RC with Vahan / Transport Dept',
        required: true,
      },
      {
        key: 'CHASSIS_MATCH',
        label: 'Physical inspection match on chassis/engine',
        required: true,
      },
      {
        key: 'NO_HYPOTHECATION',
        label: 'Verify no undeclared bank lien / hypothecation',
        required: true,
      },
    ],
    valuation: {
      methods: ['DEPRECIATED_COST', 'MARKET_COMPARABLE'],
      validityDays: 180,
    },
    token: { standard: TokenStandard.WHOLE },
    transferRules: [
      { id: 'PARTY_KYC_VERIFIED', type: 'PARTY_KYC_VERIFIED' },
      { id: 'WHOLE_ONLY', type: 'WHOLE_ONLY' },
    ],
    terminalReasons: {
      REDEEMED: ['OFF_PLATFORM_REPOSSESSION'],
      RETIRED: ['SCRAPPED', 'THEFT_TOTAL_LOSS'],
    },
  },
  {
    key: 'REAL_ESTATE',
    version: 1,
    displayName: 'Commercial Real Estate & Grade-A Offices',
    uniqueFields: ['surveyNumber', 'propertyId'],
    attributeSchema: {
      surveyNumber: { type: 'string', required: true, visibility: 'PUBLIC' },
      propertyId: { type: 'string', required: true, visibility: 'PUBLIC' },
      locality: { type: 'string', required: true, visibility: 'PUBLIC' },
      builtUpSqFt: { type: 'number', required: true, visibility: 'PUBLIC' },
      occupancyRate: {
        type: 'number',
        required: false,
        visibility: 'PUBLIC',
      },
      purchasePriceInr: {
        type: 'number',
        required: false,
        visibility: 'RESTRICTED',
      },
    },
    evidenceRequirements: [
      {
        docType: 'TITLE_DEED',
        required: true,
        description: 'Registered Title Deed',
      },
      {
        docType: 'ENCUMBRANCE_CERT',
        required: true,
        description: 'Encumbrance Certificate',
      },
      {
        docType: 'TAX_RECEIPT',
        required: true,
        description: 'Municipal Property Tax Receipt',
      },
    ],
    verificationChecklist: [
      {
        key: 'TITLE_SEARCH',
        label: '30-Year Search Report by Empaneled Advocate',
        required: true,
      },
      {
        key: 'PHYSICAL_INSPECTION',
        label: 'Physical Geo-tagged Site Survey',
        required: true,
      },
    ],
    valuation: {
      methods: ['DISCOUNTED_CASH_FLOW', 'CAP_RATE'],
      validityDays: 180,
    },
    token: {
      standard: TokenStandard.FRACTIONAL,
      minUnits: 100,
      maxUnits: 1000000,
    },
    transferRules: [
      { id: 'PARTY_KYC_VERIFIED', type: 'PARTY_KYC_VERIFIED' },
      {
        id: 'MAX_HOLDING_BPS',
        type: 'MAX_HOLDING_BPS',
        params: { maxBps: 2500 },
      },
    ],
    terminalReasons: {
      REDEEMED: ['CONSOLIDATED_BUYOUT'],
      RETIRED: ['DEMOLISHED', 'GOVT_ACQUISITION'],
    },
  },
  {
    key: 'INVOICE',
    version: 1,
    displayName: 'Supply Chain Trade Receivables',
    uniqueFields: ['invoiceNumber'],
    attributeSchema: {
      invoiceNumber: { type: 'string', required: true, visibility: 'PUBLIC' },
      supplierGstin: { type: 'string', required: true, visibility: 'PUBLIC' },
      buyerGstin: { type: 'string', required: true, visibility: 'PUBLIC' },
      amountPaise: { type: 'number', required: true, visibility: 'PUBLIC' },
      dueDate: { type: 'string', required: true, visibility: 'PUBLIC' },
      discountRateBps: {
        type: 'number',
        required: false,
        visibility: 'RESTRICTED',
      },
    },
    evidenceRequirements: [
      {
        docType: 'INVOICE_PDF',
        required: true,
        description: 'Signed Digitized Commercial Invoice',
      },
      {
        docType: 'EWAY_BILL',
        required: true,
        description: 'GST E-Way Bill Consignment Proof',
      },
    ],
    verificationChecklist: [
      {
        key: 'E_INVOICE_PORTAL',
        label: 'IRN Validated on GST Portal',
        required: true,
      },
      {
        key: 'BUYER_ACCEPTANCE',
        label: 'Buyer Written Goods Receipt & Acceptance',
        required: true,
      },
    ],
    valuation: { methods: ['FACE_VALUE_DISCOUNTED'], validityDays: 90 },
    token: { standard: TokenStandard.WHOLE },
    transferRules: [{ id: 'PARTY_KYC_VERIFIED', type: 'PARTY_KYC_VERIFIED' }],
    terminalReasons: {
      REDEEMED: ['PAID_IN_FULL'],
      RETIRED: ['WRITTEN_OFF_BAD_DEBT'],
    },
  },
];
