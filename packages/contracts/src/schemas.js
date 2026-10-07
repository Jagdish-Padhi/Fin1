import { z } from 'zod';
import {
  Role,
  ParticipantKind,
  InvestorClass,
  TokenStandard,
  RightsType,
  VerificationDecision,
  CheckResult,
  KycStatus,
  ParticipantStatus,
} from './enums.js';

export const RegisterParticipantSchema = z.object({
  id: z.string().optional(),
  orgId: z.string().min(1),
  kind: z.nativeEnum(ParticipantKind),
  jurisdiction: z.string().default('IN'),
  investorClass: z.nativeEnum(InvestorClass).default(InvestorClass.RETAIL),
  pii: z.object({
    legalName: z.string().min(2),
    identifierType: z.enum(['PAN', 'AADHAAR', 'CIN', 'PASSPORT']),
    identifierValue: z.string().min(4),
    contactEmail: z.string().email(),
  }),
  limits: z
    .object({
      maxHoldingBps: z.number().int().min(1).max(10000).default(2500),
      maxTransferPaise: z.number().int().positive().default(100000000),
    })
    .optional(),
});

export const UpdateKycSchema = z.object({
  kycStatus: z.nativeEnum(KycStatus),
  reason: z.string().min(3),
  expiryDate: z.string().optional(),
});

export const SetInvestorClassSchema = z.object({
  investorClass: z.nativeEnum(InvestorClass),
  reason: z.string().optional(),
});

export const SetLimitsSchema = z.object({
  maxHoldingBps: z.number().int().min(1).max(10000),
  maxTransferPaise: z.number().int().positive(),
  reason: z.string().optional(),
});

export const SuspendParticipantSchema = z.object({
  reason: z.string().min(3),
});

export const BlacklistParticipantSchema = z.object({
  reason: z.string().min(3),
});

export const AdminCreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.nativeEnum(Role),
  orgId: z.string().min(1),
  password: z.string().min(6).optional(),
});

export const AdminCreateOrgSchema = z.object({
  id: z.string().min(1),
  mspId: z.string().min(1),
  name: z.string().min(2),
});

export const AssetTypeDefinitionSchema = z
  .object({
    key: z.string().min(2).toUpperCase(),
    version: z.number().int().positive().default(1),
    displayName: z.string().min(2).optional(),
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    defaultJurisdiction: z.string().optional(),
    uniqueFields: z.array(z.string()).default([]),
    mandatoryEvidence: z.array(z.string()).default([]),
    attributeSchema: z.record(z.any()).default({}),
    evidenceRequirements: z
      .array(
        z.object({
          docType: z.string(),
          required: z.boolean(),
          description: z.string().optional(),
        })
      )
      .default([]),
    verificationChecklist: z
      .array(
        z.object({
          key: z.string(),
          label: z.string(),
          required: z.boolean(),
        })
      )
      .default([]),
    valuation: z
      .object({
        methods: z.array(z.string()),
        validityDays: z.number().int().positive(),
      })
      .default({ methods: ['MARKET_COMPARABLE'], validityDays: 180 }),
    token: z
      .object({
        standard: z.nativeEnum(TokenStandard),
        minUnits: z.number().int().positive().optional(),
        maxUnits: z.number().int().positive().optional(),
      })
      .default({ standard: TokenStandard.WHOLE }),
    transferRules: z
      .array(
        z.object({
          id: z.string(),
          type: z.string(),
          params: z.record(z.any()).optional(),
        })
      )
      .default([]),
    terminalReasons: z
      .object({
        REDEEMED: z.array(z.string()).default([]),
        RETIRED: z.array(z.string()).default([]),
      })
      .default({ REDEEMED: [], RETIRED: [] }),
  })
  .transform((val) => {
    const displayName = val.displayName || val.name || val.key;
    const evidenceReqs =
      val.evidenceRequirements.length > 0
        ? val.evidenceRequirements
        : val.mandatoryEvidence.map((docType) => ({
            docType,
            required: true,
            description: docType,
          }));
    return {
      ...val,
      displayName,
      evidenceRequirements: evidenceReqs,
    };
  });

export const RegisterAssetSchema = z.object({
  id: z.string().optional(),
  typeKey: z.string().min(2).toUpperCase(),
  typeVersion: z.number().int().positive().default(1),
  displayName: z.string().min(2),
  jurisdiction: z.string().optional(),
  custodian: z.string().optional(),
  attributes: z.record(z.any()),
});

export const UpdateAssetAttributesSchema = z.object({
  attributes: z.record(z.any()),
  reason: z.string().optional(),
});

export const AttachEvidenceSchema = z
  .object({
    assetId: z.string().min(1).optional(),
    docType: z.string().min(1),
    fileName: z.string().min(1).optional(),
    title: z.string().optional(),
    mimeType: z.string().default('application/pdf'),
    fileSize: z.number().int().positive().optional(),
    sizeBytes: z.number().int().positive().optional(),
    sha256: z.string().length(64),
    storageKey: z.string().optional(),
  })
  .transform((val) => ({
    ...val,
    fileName: val.fileName || val.title || `${val.docType}.pdf`,
    fileSize: val.fileSize || val.sizeBytes || 1048576,
  }));

export const RecordVerificationCheckSchema = z.object({
  caseId: z.string().min(1),
  checkKey: z.string().min(1),
  result: z.nativeEnum(CheckResult),
  notes: z.string().optional(),
  sourceRef: z.string().optional(),
});

export const VerificationDecisionSchema = z.object({
  decision: z.nativeEnum(VerificationDecision),
  reasonCode: z.string().min(1),
  reasonText: z.string().optional(),
});

export const ProposeValuationSchema = z.object({
  id: z.string().trim().min(1).optional(),
  assetId: z.string().trim().min(1),
  amountPaise: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  currency: z.literal('INR').default('INR'),
  method: z.string().trim().min(2),
  methodDetails: z.record(z.any()).default({}),
  source: z.object({
    valuerName: z.string().trim().min(2),
    valuerOrg: z.string().trim().min(2),
    reportReference: z.string().trim().min(1).optional(),
    reportHash: z.string().regex(/^[a-fA-F0-9]{64}$/, 'Must be a 64-character SHA-256 hex digest').optional(),
  }),
  valuationDate: z.string().datetime(),
  validUntil: z.string().datetime(),
}).superRefine((valuation, context) => {
  const valuationDate = Date.parse(valuation.valuationDate);
  const validUntil = Date.parse(valuation.validUntil);
  if (validUntil <= valuationDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['validUntil'],
      message: 'validUntil must be after valuationDate',
    });
  }
});

export const RequestMintTokenSchema = z.object({
  assetId: z.string().trim().min(1),
  standard: z.nativeEnum(TokenStandard),
  totalUnits: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  unitLabel: z.string().trim().min(1).max(32).default('UNITS'),
  rightsType: z.nativeEnum(RightsType),
  representation: z.string().trim().min(10),
});

export const ProposeTransferSchema = z.object({
  tokenId: z.string().min(1),
  toParticipantId: z.string().min(1),
  units: z.number().int().positive(),
  pricePaise: z.number().int().nonnegative().default(0),
  paymentRef: z.string().optional(),
});

export const ExecuteTransferSchema = z.object({
  transferId: z.string().min(1),
});

export const LifecycleTransitionSchema = z.object({
  entityId: z.string().min(1),
  action: z.enum(['FREEZE', 'UNFREEZE', 'REDEEM', 'RETIRE']),
  reasonCode: z.string().min(1),
  reasonText: z.string().min(5),
  evidenceRef: z.string().optional(),
});
