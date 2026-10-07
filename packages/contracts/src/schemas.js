import { z } from 'zod';
import {
  Role,
  ParticipantKind,
  InvestorClass,
  TokenStandard,
  RightsType,
  VerificationDecision,
  CheckResult,
} from './enums.js';

export const RegisterParticipantSchema = z.object({
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
});

export const AssetTypeDefinitionSchema = z.object({
  key: z.string().min(2).toUpperCase(),
  version: z.number().int().positive(),
  displayName: z.string().min(2),
  attributeSchema: z.record(z.any()),
  evidenceRequirements: z.array(
    z.object({
      docType: z.string(),
      required: z.boolean(),
      description: z.string().optional(),
    })
  ),
  verificationChecklist: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      required: z.boolean(),
    })
  ),
  valuation: z.object({
    methods: z.array(z.string()),
    validityDays: z.number().int().positive(),
  }),
  token: z.object({
    standard: z.nativeEnum(TokenStandard),
    minUnits: z.number().int().positive().optional(),
    maxUnits: z.number().int().positive().optional(),
  }),
  transferRules: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      params: z.record(z.any()).optional(),
    })
  ),
  terminalReasons: z.object({
    REDEEMED: z.array(z.string()),
    RETIRED: z.array(z.string()),
  }),
});

export const RegisterAssetSchema = z.object({
  typeKey: z.string().min(2).toUpperCase(),
  typeVersion: z.number().int().positive().default(1),
  displayName: z.string().min(2),
  attributes: z.record(z.any()),
});

export const AttachEvidenceSchema = z.object({
  assetId: z.string().min(1),
  docType: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive(),
  sha256: z.string().length(64),
});

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
  assetId: z.string().min(1),
  amountPaise: z.number().int().positive(),
  currency: z.string().default('INR'),
  method: z.string().min(2),
  methodDetails: z.record(z.any()).default({}),
  source: z.object({
    valuerName: z.string().min(2),
    valuerOrg: z.string().min(2),
    reportReference: z.string().optional(),
    reportHash: z.string().optional(),
  }),
  valuationDate: z.string().datetime().or(z.string()),
  validUntil: z.string().datetime().or(z.string()),
});

export const RequestMintTokenSchema = z.object({
  assetId: z.string().min(1),
  standard: z.nativeEnum(TokenStandard),
  totalUnits: z.number().int().positive(),
  unitLabel: z.string().default('UNITS'),
  rightsType: z.nativeEnum(RightsType),
  representation: z.string().min(10),
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
