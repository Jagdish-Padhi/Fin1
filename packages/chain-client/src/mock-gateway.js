import crypto from 'crypto';
import {
  Role,
  AssetStatus,
  TransferStatus,
  TokenStandard,
  VerificationDecision,
  CheckResult,
  ValuationStatus,
  TransferRuleReason,
  LifecycleReason,
  EventName,
  RequestMintTokenSchema,
  DEFAULT_ASSET_TYPES,
} from '@rwa/contracts';

/**
 * In-memory Mock Chaincode Gateway
 * Faithfully mirrors Hyperledger Fabric state machine, endorsement,
 * segregation of duties, rejected transfer recording, and audit logging.
 */
export class MockGateway {
  constructor() {
    this.participants = new Map();
    this.assetTypes = new Map();
    this.assets = new Map();
    this.evidence = new Map();
    this.verificationCases = new Map();
    this.valuations = new Map();
    this.tokens = new Map();
    this.balances = new Map(); // `${tokenId}:${participantId}` -> number
    this.balanceAcquiredAt = new Map(); // `${tokenId}:${participantId}` -> string (timestamp)
    this.transfers = new Map();
    this.auditTrail = [];
    this.blocks = [];
    this.subscribers = new Set();
    this.blockNumber = 1;
    this.txIndex = 0;

    this.initDefaultSeed();
  }

  initDefaultSeed() {
    // Seed default types from single source of truth
    for (const type of DEFAULT_ASSET_TYPES) {
      this.assetTypes.set(`${type.key}:${type.version || 1}`, type);
    }

    // Seed default Phase 1 participants
    this.participants.set('PRT-ISSUER-01', {
      id: 'PRT-ISSUER-01',
      userId: 'USR-ISSUER',
      orgId: 'ORG-ISSUER',
      mspId: 'IssuerMSP',
      kind: 'ENTITY',
      jurisdiction: 'IN',
      investorClass: 'QUALIFIED',
      kycStatus: 'APPROVED',
      status: 'ACTIVE',
      limits: { maxHoldingBps: 2500, maxTransferPaise: 100000000 },
      piiHash: crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            legalName: 'Bharat Agro Enterprises Ltd',
            pan: 'AAACB1234F',
          })
        )
        .digest('hex'),
      createdAt: this._now(),
    });

    this.participants.set('PRT-INVESTOR-01', {
      id: 'PRT-INVESTOR-01',
      userId: 'USR-INVESTOR',
      orgId: 'ORG-INVESTOR',
      mspId: 'InvestorMSP',
      kind: 'INDIVIDUAL',
      jurisdiction: 'IN',
      investorClass: 'QUALIFIED',
      kycStatus: 'APPROVED',
      status: 'ACTIVE',
      limits: { maxHoldingBps: 2500, maxTransferPaise: 100000000 },
      piiHash: crypto
        .createHash('sha256')
        .update(JSON.stringify({ legalName: 'Pooja Iyer', pan: 'ABZPI5678K' }))
        .digest('hex'),
      createdAt: this._now(),
    });

    this.participants.set('PRT-INVESTOR-02', {
      id: 'PRT-INVESTOR-02',
      orgId: 'ORG-INVESTOR',
      mspId: 'InvestorMSP',
      kind: 'ENTITY',
      jurisdiction: 'IN',
      investorClass: 'INSTITUTIONAL',
      kycStatus: 'APPROVED',
      status: 'ACTIVE',
      limits: { maxHoldingBps: 5000, maxTransferPaise: 500000000 },
      piiHash: crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            legalName: 'Apex Capital Ventures',
            pan: 'AABCA9988D',
          })
        )
        .digest('hex'),
      createdAt: this._now(),
    });

    // Seed default Assets
    this.assets.set('AST-LAND-001', {
      id: 'AST-LAND-001',
      typeKey: 'LAND',
      typeVersion: 1,
      originatorParticipantId: 'PRT-ISSUER-01',
      displayName: 'Mysuru Agro Commercial Land Parcel (10,000 sqm)',
      attributes: {
        surveyNumber: 'SY-MYS-421',
        district: 'Mysuru',
        state: 'Karnataka',
        areaSqMeters: 10000,
        landUse: 'AGRICULTURAL',
      },
      attributesHash: crypto
        .createHash('sha256')
        .update('AST-LAND-001')
        .digest('hex'),
      status: AssetStatus.TOKENIZED,
      tokenId: 'TKN-LAND-001',
      evidenceRoot: this._computeEvidenceRoot([]),
      version: 1,
      evidence: [],
      createdAt: this._now(),
      updatedAt: this._now(),
    });

    this.assets.set('AST-TRACTOR-001', {
      id: 'AST-TRACTOR-001',
      typeKey: 'VEHICLE',
      typeVersion: 1,
      originatorParticipantId: 'PRT-ISSUER-01',
      displayName: 'Mahindra 575 DI 45HP Commercial Tractor',
      attributes: {
        registrationNumber: 'KA-09-TR-4011',
        chassisNumber: 'MHD575DI998822',
        make: 'Mahindra & Mahindra',
        model: '575 DI XP Plus',
        manufacturingYear: 2024,
      },
      attributesHash: crypto
        .createHash('sha256')
        .update('AST-TRACTOR-001')
        .digest('hex'),
      status: AssetStatus.TOKENIZED,
      tokenId: 'TKN-TRACTOR-001',
      evidenceRoot: this._computeEvidenceRoot([]),
      version: 1,
      evidence: [],
      createdAt: this._now(),
      updatedAt: this._now(),
    });

    this.assets.set('AST-FROZEN-001', {
      id: 'AST-FROZEN-001',
      typeKey: 'REAL_ESTATE',
      typeVersion: 1,
      originatorParticipantId: 'PRT-ISSUER-01',
      displayName: 'Bengaluru Tech Park Office Wing C [FROZEN]',
      attributes: {
        surveyNumber: 'SY-BLR-881',
        propertyId: 'PID-TP-992',
        locality: 'Whitefield, Bengaluru',
        builtUpSqFt: 5000,
      },
      attributesHash: crypto
        .createHash('sha256')
        .update('AST-FROZEN-001')
        .digest('hex'),
      status: AssetStatus.FROZEN,
      tokenId: 'TKN-FROZEN-001',
      freezeReason: 'High Court Compliance Hold Order #HC-9921',
      version: 1,
      evidenceRoot: this._computeEvidenceRoot([]),
      evidence: [],
      createdAt: this._now(),
      updatedAt: this._now(),
    });

    // Seed default Valuations
    this.valuations.set('VAL-LAND-001', {
      id: 'VAL-LAND-001',
      assetId: 'AST-LAND-001',
      amountPaise: 500000000,
      currency: 'INR',
      method: 'CIRCLE_RATE',
      methodDetails: { ratePerSqMeterPaise: 50000 },
      source: {
        valuerName: 'Ananya Roy',
        valuerOrg: 'TUV SGS Certified Inspection',
      },
      valuationDate: '2026-10-01T00:00:00.000Z',
      validUntil: '2027-04-01T00:00:00.000Z',
      status: 'APPROVED',
      proposedBy: 'USR-VALUER',
      proposedByMspId: 'VerifierMSP',
      approvedBy: 'USR-COMPLIANCE',
      approvedByMspId: 'ComplianceMSP',
      createdAt: this._now(),
    });

    this.valuations.set('VAL-TRACTOR-001', {
      id: 'VAL-TRACTOR-001',
      assetId: 'AST-TRACTOR-001',
      amountPaise: 75000000,
      currency: 'INR',
      method: 'DEPRECIATED_COST',
      methodDetails: { purchasePriceInr: 850000, depreciationYears: 1 },
      source: {
        valuerName: 'Ananya Roy',
        valuerOrg: 'TUV SGS Certified Inspection',
      },
      valuationDate: '2026-10-01T00:00:00.000Z',
      validUntil: '2027-04-01T00:00:00.000Z',
      status: 'APPROVED',
      proposedBy: 'USR-VALUER',
      proposedByMspId: 'VerifierMSP',
      approvedBy: 'USR-COMPLIANCE',
      approvedByMspId: 'ComplianceMSP',
      createdAt: this._now(),
    });

    // Seed default Tokens
    this.tokens.set('TKN-LAND-001', {
      id: 'TKN-LAND-001',
      assetId: 'AST-LAND-001',
      standard: TokenStandard.FRACTIONAL,
      totalUnits: 10000,
      unitLabel: 'SQM',
      rightsType: 'UNDIVIDED_FRACTION',
      representation:
        '1 Unit = 1 SQM undivided interest in Mysuru Survey #421',
      initialHolderId: 'PRT-ISSUER-01',
      status: 'ACTIVE',
      mintedAt: this._now(),
      mintedTxId: crypto.createHash('sha256').update('seed-token-land-001').digest('hex'),
    });

    this.tokens.set('TKN-TRACTOR-001', {
      id: 'TKN-TRACTOR-001',
      assetId: 'AST-TRACTOR-001',
      standard: TokenStandard.WHOLE,
      totalUnits: 1,
      unitLabel: 'VEHICLE',
      rightsType: 'FULL_OWNERSHIP',
      representation:
        'Whole asset title deed ownership for Tractor MH-12-DE-9912',
      initialHolderId: 'PRT-ISSUER-01',
      status: 'ACTIVE',
      mintedAt: this._now(),
      mintedTxId: crypto.createHash('sha256').update('seed-token-tractor-001').digest('hex'),
    });

    this.tokens.set('TKN-FROZEN-001', {
      id: 'TKN-FROZEN-001',
      assetId: 'AST-FROZEN-001',
      standard: TokenStandard.FRACTIONAL,
      totalUnits: 5000,
      unitLabel: 'SQFT',
      rightsType: 'UNDIVIDED_FRACTION',
      representation:
        'Fractional ownership in Bengaluru Tech Park Office Wing C',
      initialHolderId: 'PRT-ISSUER-01',
      status: 'FROZEN',
      mintedAt: this._now(),
      mintedTxId: crypto.createHash('sha256').update('seed-token-frozen-001').digest('hex'),
    });

    // Seed default Balances
    this.balances.set('TKN-LAND-001:PRT-ISSUER-01', 8000);
    this.balances.set('TKN-LAND-001:PRT-INVESTOR-01', 2000);
    this.balances.set('TKN-TRACTOR-001:PRT-ISSUER-01', 1);
    this.balances.set('TKN-FROZEN-001:PRT-ISSUER-01', 5000);

    // Seed default Transfers
    this.transfers.set('TRF-DEMO-001', {
      id: 'TRF-DEMO-001',
      tokenId: 'TKN-LAND-001',
      fromParticipantId: 'PRT-ISSUER-01',
      toParticipantId: 'PRT-INVESTOR-01',
      units: 2000,
      pricePaise: 100000000,
      paymentRef: 'NEFT-HDFC-9918237',
      status: TransferStatus.EXECUTED,
      ruleResults: {
        PARTICIPANT_ACTIVE: { passed: true },
        KYC_VERIFIED: { passed: true },
        SELF_TRANSFER: { passed: true },
        ASSET_TRANSFERABLE: { passed: true },
        SELLER_BALANCE: { passed: true },
        MAX_HOLDING_CAP: { passed: true },
      },
      rejectionReasons: [],
      proposedBy: 'USR-ISSUER',
      proposedByMspId: 'IssuerMSP',
      createdAt: this._now(),
      executedAt: this._now(),
      executedTxId: crypto.createHash('sha256').update('seed-transfer-demo-001').digest('hex'),
    });
  }

  _now() {
    return new Date().toISOString();
  }

  _generateTxId() {
    return crypto.randomBytes(32).toString('hex');
  }

  _appendAudit(
    actor,
    entityType,
    entityId,
    fromState,
    toState,
    reasonCode,
    reasonText,
    txId
  ) {
    const entry = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      actorUserId: actor.userId || 'SYSTEM',
      actorOrg: actor.mspId || 'EkamVistarMSP',
      actorRole: actor.role || Role.ADMINISTRATOR,
      entityType,
      entityId,
      fromState: fromState || 'NONE',
      toState: toState || fromState,
      reasonCode: reasonCode || 'OK',
      reasonText: reasonText || '',
      txId,
      blockNumber: this.blockNumber,
      occurredAt: this._now(),
    };
    this.auditTrail.push(entry);
    return entry;
  }

  _emit(eventName, payload, txId) {
    const envelope = {
      blockNumber: this.blockNumber,
      txIndex: ++this.txIndex,
      txId,
      name: eventName,
      payload,
      committedAt: this._now(),
    };
    for (const sub of this.subscribers) {
      try {
        sub(envelope);
      } catch (err) {
        console.error('Subscriber notification error:', err);
      }
    }
    return envelope;
  }

  async submit(caller, fnName, args = {}) {
    const txId = this._generateTxId();
    let result;

    switch (fnName) {
      case 'registerParticipant': {
        const id = args.id || `PRT-${Date.now()}`;
        // Duplicate PII check (salted hash)
        if (args.piiHash) {
          for (const p of this.participants.values()) {
            if (p.piiHash === args.piiHash) {
              throw new Error(
                `Duplicate registration: Participant with identical PII hash already exists (${p.id})`
              );
            }
          }
        }
        // Duplicate ZK nullifier check (Sybil resistance)
        const zkNullifier = args.zkPassport?.nullifier || args.zkNullifier;
        if (zkNullifier) {
          for (const p of this.participants.values()) {
            if (p.zkNullifier === zkNullifier || p.zkPassport?.nullifier === zkNullifier) {
              throw new Error(
                `Duplicate registration: ZKPassport nullifier has already been registered on ledger (${p.id})`
              );
            }
          }
        }
        const hasZk = Boolean(args.zkPassport && (args.zkPassport.proofHash || args.zkProofHash));
        const initialKyc = hasZk ? 'APPROVED' : (args.kycStatus || 'SUBMITTED');
        const record = {
          id,
          userId: args.userId || caller.userId || null,
          orgId: args.orgId || caller.orgId,
          mspId: caller.mspId,
          kind: args.kind,
          jurisdiction: args.jurisdiction || (args.zkPassport?.nationality || 'IN'),
          investorClass: args.investorClass || 'RETAIL',
          kycStatus: initialKyc,
          kycReason: hasZk ? 'Auto-verified via on-chain ZKPassport cryptographic zero-knowledge proof' : undefined,
          status: 'ACTIVE',
          limits: args.limits || {
            maxHoldingBps: 2500,
            maxTransferPaise: 100000000,
          },
          piiHash: args.piiHash || null,
          zkPassport: args.zkPassport || null,
          zkProofHash: args.zkPassport?.proofHash || args.zkProofHash || null,
          zkNullifier: zkNullifier || null,
          createdAt: this._now(),
        };
        this.participants.set(id, record);
        if (hasZk) {
          this._appendAudit(
            caller,
            'PARTICIPANT',
            id,
            'NONE',
            'APPROVED',
            'ZK_KYC_VERIFIED',
            `Participant registered with verified ZKPassport (Proof: ${(record.zkProofHash || '').slice(0, 16)}...)`,
            txId
          );
        } else {
          this._appendAudit(
            caller,
            'PARTICIPANT',
            id,
            'NONE',
            'SUBMITTED',
            'REGISTRATION',
            'Participant registered',
            txId
          );
        }
        this._emit(EventName.PARTICIPANT_REGISTERED, record, txId);
        result = record;
        break;
      }

      case 'updateKycStatus': {
        // Enforce Segregation of Duties: Admin CANNOT approve/update KYC; only Compliance
        if (caller.role !== Role.COMPLIANCE) {
          throw new Error(
            'Segregation of duties violation: Only Compliance role can update participant KYC status'
          );
        }
        const participant = this.participants.get(args.participantId);
        if (!participant)
          throw new Error(`Participant not found: ${args.participantId}`);
        const prev = participant.kycStatus;
        participant.kycStatus = args.kycStatus;
        participant.kycReason = args.reason || '';
        if (args.expiryDate) {
          participant.kycExpiryDate = args.expiryDate;
        }
        this._appendAudit(
          caller,
          'PARTICIPANT',
          participant.id,
          prev,
          args.kycStatus,
          'KYC_DECISION',
          args.reason,
          txId
        );
        this._emit(
          EventName.KYC_UPDATED,
          {
            participantId: participant.id,
            kycStatus: args.kycStatus,
            reason: args.reason,
          },
          txId
        );
        result = participant;
        break;
      }

      case 'setInvestorClass': {
        if (
          caller.role !== Role.COMPLIANCE &&
          caller.role !== Role.ADMINISTRATOR
        ) {
          throw new Error(
            'Only Compliance or Administrator can set investor class'
          );
        }
        const participant = this.participants.get(args.participantId);
        if (!participant)
          throw new Error(`Participant not found: ${args.participantId}`);
        const prev = participant.investorClass;
        participant.investorClass = args.investorClass;
        this._appendAudit(
          caller,
          'PARTICIPANT',
          participant.id,
          prev,
          args.investorClass,
          'INVESTOR_CLASS_UPDATED',
          args.reason || '',
          txId
        );
        this._emit(
          EventName.INVESTOR_CLASS_UPDATED,
          { participantId: participant.id, investorClass: args.investorClass },
          txId
        );
        result = participant;
        break;
      }

      case 'setLimits': {
        if (
          caller.role !== Role.COMPLIANCE &&
          caller.role !== Role.ADMINISTRATOR
        ) {
          throw new Error('Only Compliance or Administrator can set limits');
        }
        const participant = this.participants.get(args.participantId);
        if (!participant)
          throw new Error(`Participant not found: ${args.participantId}`);
        participant.limits = {
          maxHoldingBps:
            args.maxHoldingBps ?? participant.limits?.maxHoldingBps ?? 2500,
          maxTransferPaise:
            args.maxTransferPaise ??
            participant.limits?.maxTransferPaise ??
            100000000,
        };
        this._appendAudit(
          caller,
          'PARTICIPANT',
          participant.id,
          'ACTIVE',
          'ACTIVE',
          'LIMITS_UPDATED',
          args.reason || '',
          txId
        );
        this._emit(
          EventName.LIMITS_UPDATED,
          { participantId: participant.id, limits: participant.limits },
          txId
        );
        result = participant;
        break;
      }

      case 'suspendParticipant': {
        if (
          caller.role !== Role.COMPLIANCE &&
          caller.role !== Role.ADMINISTRATOR
        ) {
          throw new Error(
            'Only Compliance or Administrator can suspend participants'
          );
        }
        const participant = this.participants.get(args.participantId);
        if (!participant)
          throw new Error(`Participant not found: ${args.participantId}`);
        const prev = participant.status;
        participant.status = 'SUSPENDED';
        participant.suspendReason = args.reason || '';
        this._appendAudit(
          caller,
          'PARTICIPANT',
          participant.id,
          prev,
          'SUSPENDED',
          'SUSPENDED',
          args.reason || '',
          txId
        );
        this._emit(
          EventName.PARTICIPANT_SUSPENDED,
          { participantId: participant.id, reason: args.reason },
          txId
        );
        result = participant;
        break;
      }

      case 'reinstateParticipant': {
        if (
          caller.role !== Role.COMPLIANCE &&
          caller.role !== Role.ADMINISTRATOR
        ) {
          throw new Error(
            'Only Compliance or Administrator can reinstate participants'
          );
        }
        const participant = this.participants.get(args.participantId);
        if (!participant)
          throw new Error(`Participant not found: ${args.participantId}`);
        const prev = participant.status;
        participant.status = 'ACTIVE';
        delete participant.suspendReason;
        this._appendAudit(
          caller,
          'PARTICIPANT',
          participant.id,
          prev,
          'ACTIVE',
          'REINSTATED',
          args.reason || '',
          txId
        );
        this._emit(
          EventName.PARTICIPANT_REINSTATED,
          { participantId: participant.id, reason: args.reason },
          txId
        );
        result = participant;
        break;
      }

      case 'addToBlacklist': {
        if (caller.role !== Role.COMPLIANCE) {
          throw new Error('Only Compliance can add participants to blacklist');
        }
        const participant = this.participants.get(args.participantId);
        if (!participant)
          throw new Error(`Participant not found: ${args.participantId}`);
        const prev = participant.status;
        participant.status = 'BLACKLISTED';
        participant.blacklistReason = args.reason || '';
        this._appendAudit(
          caller,
          'PARTICIPANT',
          participant.id,
          prev,
          'BLACKLISTED',
          'BLACKLISTED',
          args.reason || '',
          txId
        );
        this._emit(
          EventName.BLACKLIST_ADDED,
          { participantId: participant.id, reason: args.reason },
          txId
        );
        result = participant;
        break;
      }

      case 'removeFromBlacklist': {
        if (caller.role !== Role.COMPLIANCE) {
          throw new Error(
            'Only Compliance can remove participants from blacklist'
          );
        }
        const participant = this.participants.get(args.participantId);
        if (!participant)
          throw new Error(`Participant not found: ${args.participantId}`);
        const prev = participant.status;
        participant.status = 'ACTIVE';
        delete participant.blacklistReason;
        this._appendAudit(
          caller,
          'PARTICIPANT',
          participant.id,
          prev,
          'ACTIVE',
          'BLACKLIST_REMOVED',
          args.reason || '',
          txId
        );
        this._emit(
          EventName.BLACKLIST_REMOVED,
          { participantId: participant.id, reason: args.reason },
          txId
        );
        result = participant;
        break;
      }

      case 'defineAssetType': {
        if (caller.role !== Role.ADMINISTRATOR) {
          throw new Error('Only Administrator can define asset types');
        }
        const key = `${args.key}:${args.version || 1}`;
        const typeRecord = {
          ...args,
          version: args.version || 1,
          status: args.status || 'ACTIVE',
        };
        this.assetTypes.set(key, typeRecord);
        this._appendAudit(
          caller,
          'ASSET_TYPE',
          key,
          'NONE',
          'ACTIVE',
          'TYPE_PUBLISHED',
          'Asset type published',
          txId
        );
        this._emit(
          EventName.ASSET_TYPE_DEFINED,
          { key: args.key, version: typeRecord.version },
          txId
        );
        result = typeRecord;
        break;
      }

      case 'deprecateAssetType': {
        if (
          caller.role !== Role.ADMINISTRATOR &&
          caller.role !== Role.COMPLIANCE
        ) {
          throw new Error(
            'Only Administrator or Compliance can deprecate asset types'
          );
        }
        const key = `${args.key}:${args.version || 1}`;
        const typeDef = this.assetTypes.get(key);
        if (!typeDef) throw new Error(`Asset type ${key} not found`);
        const prev = typeDef.status;
        typeDef.status = 'DEPRECATED';
        this._appendAudit(
          caller,
          'ASSET_TYPE',
          key,
          prev,
          'DEPRECATED',
          'TYPE_DEPRECATED',
          args.reason || '',
          txId
        );
        this._emit(
          'AssetTypeDeprecated',
          { key: args.key, version: typeDef.version },
          txId
        );
        result = typeDef;
        break;
      }

      case 'registerAsset': {
        if (caller.role !== Role.ISSUER) {
          throw new Error('Only Issuer can register assets');
        }
        const typeKey = `${args.typeKey}:${args.typeVersion || 1}`;
        const typeDef = this.assetTypes.get(typeKey);
        if (!typeDef) throw new Error(`Asset type ${typeKey} not found`);

        // Edge case: Deprecated type blocks new registrations
        if (typeDef.status === 'DEPRECATED') {
          throw new Error(
            `Cannot register asset under deprecated asset type (${typeKey})`
          );
        }

        // Schema validation: check required fields in attributeSchema
        const schema = typeDef.attributeSchema || {};
        for (const [field, rule] of Object.entries(schema)) {
          if (
            rule.required &&
            (args.attributes[field] === undefined ||
              args.attributes[field] === null ||
              args.attributes[field] === '')
          ) {
            throw new Error(
              `Schema validation error: Missing required field '${field}'`
            );
          }
        }

        // Duplicate asset detection on unique identity fields (real parity)
        const idFields = Array.isArray(typeDef.uniqueFields) && typeDef.uniqueFields.length > 0
          ? typeDef.uniqueFields
          : [
              'registrationNumber',
              'chassisNumber',
              'surveyNumber',
              'propertyId',
              'invoiceNumber',
              'batchId',
              'warehouseReceiptNo',
              'serialNumber',
            ];
        for (const field of idFields) {
          const val = args.attributes[field];
          if (val) {
            for (const existing of this.assets.values()) {
              if (
                existing.attributes &&
                existing.attributes[field] === val &&
                existing.typeKey === args.typeKey
              ) {
                throw new Error(
                  `Duplicate asset detected: Real-world asset with ${field} '${val}' already registered (${existing.id})`
                );
              }
            }
          }
        }

        const id = args.id || `AST-${Date.now()}`;
        const asset = {
          id,
          typeKey: args.typeKey,
          typeVersion: args.typeVersion || 1,
          originatorParticipantId: caller.participantId || caller.userId,
          displayName: args.displayName,
          attributes: args.attributes,
          attributesHash: crypto
            .createHash('sha256')
            .update(JSON.stringify(args.attributes))
            .digest('hex'),
          status: AssetStatus.REGISTERED,
          evidenceRoot: '',
          version: 1,
          evidence: [],
          createdAt: this._now(),
          updatedAt: this._now(),
        };
        this.assets.set(id, asset);
        this._appendAudit(
          caller,
          'ASSET',
          id,
          'NONE',
          AssetStatus.REGISTERED,
          'ASSET_REGISTERED',
          'Asset submitted',
          txId
        );
        this._emit(EventName.ASSET_REGISTERED, asset, txId);
        result = asset;
        break;
      }

      case 'updateAssetAttributes': {
        if (caller.role !== Role.ISSUER) {
          throw new Error('Only Issuer can update asset attributes');
        }
        const asset = this.assets.get(args.assetId);
        if (!asset) throw new Error(`Asset not found: ${args.assetId}`);

        // Edge case: Attribute changes after submission to verification are blocked
        if (
          asset.status !== AssetStatus.REGISTERED &&
          asset.status !== AssetStatus.CHANGES_REQUESTED
        ) {
          throw new Error(
            `Attribute change blocked: Asset is in status '${asset.status}'`
          );
        }

        const typeKey = `${asset.typeKey}:${asset.typeVersion}`;
        const typeDef = this.assetTypes.get(typeKey);
        const updatedAttrs = { ...asset.attributes, ...args.attributes };
        if (typeDef?.attributeSchema) {
          for (const [field, rule] of Object.entries(typeDef.attributeSchema)) {
            if (
              rule.required &&
              (updatedAttrs[field] === undefined ||
                updatedAttrs[field] === null ||
                updatedAttrs[field] === '')
            ) {
              throw new Error(
                `Schema validation error: Missing required field '${field}'`
              );
            }
          }
        }

        asset.attributes = updatedAttrs;
        asset.attributesHash = crypto
          .createHash('sha256')
          .update(JSON.stringify(asset.attributes))
          .digest('hex');
        asset.version++;
        asset.updatedAt = this._now();

        this._appendAudit(
          caller,
          'ASSET',
          asset.id,
          asset.status,
          asset.status,
          'ATTRIBUTES_UPDATED',
          args.reason || '',
          txId
        );
        this._emit(
          'AssetAttributesUpdated',
          { assetId: asset.id, version: asset.version },
          txId
        );
        result = asset;
        break;
      }

      case 'attachEvidence': {
        const asset = this.assets.get(args.assetId);
        if (!asset) throw new Error(`Asset not found: ${args.assetId}`);
        if (
          asset.status !== AssetStatus.REGISTERED &&
          asset.status !== AssetStatus.CHANGES_REQUESTED
        ) {
          throw new Error(
            `Cannot attach evidence when asset is in status ${asset.status}`
          );
        }

        // Duplicate-hash detection across other assets
        for (const existingEv of this.evidence.values()) {
          if (
            existingEv.sha256 === args.sha256 &&
            existingEv.assetId !== args.assetId
          ) {
            throw new Error(
              `Duplicate evidence detected: Evidence with SHA-256 already attached to asset ${existingEv.assetId}`
            );
          }
        }

        const evId = args.id || `EVD-${Date.now()}`;
        const evidence = {
          id: evId,
          assetId: args.assetId,
          docType: args.docType,
          fileName: args.fileName,
          mimeType: args.mimeType,
          fileSize: args.fileSize,
          sha256: args.sha256,
          storageKey: args.storageKey,
          uploadedBy: caller.userId,
          status: 'ATTACHED',
          createdAt: this._now(),
        };
        this.evidence.set(evId, evidence);

        // Keep track of evidence in asset and recompute Merkle root
        asset.evidence = asset.evidence || [];
        // Replace previous version of same docType if exists
        asset.evidence = asset.evidence.filter(
          (e) => e.docType !== args.docType
        );
        asset.evidence.push(evidence);

        // Compute Merkle / evidence root from active evidence leaves
        asset.evidenceRoot = this._computeEvidenceRoot(asset.evidence);

        this._appendAudit(
          caller,
          'EVIDENCE',
          evId,
          'NONE',
          'ATTACHED',
          'EVIDENCE_ATTACHED',
          args.fileName,
          txId
        );
        this._emit(EventName.EVIDENCE_ATTACHED, evidence, txId);
        result = {
          ...evidence,
          evidenceFiles: asset.evidence,
          evidenceRoot: asset.evidenceRoot,
        };
        break;
      }

      case 'submitForVerification': {
        const asset = this.assets.get(args.assetId);
        if (!asset) throw new Error(`Asset not found: ${args.assetId}`);
        if (
          asset.status !== AssetStatus.REGISTERED &&
          asset.status !== AssetStatus.CHANGES_REQUESTED
        ) {
          throw new Error(
            `Cannot submit asset for verification from status '${asset.status}'`
          );
        }

        // Edge case: Missing mandatory evidence blocks submission
        const typeKey = `${asset.typeKey}:${asset.typeVersion}`;
        const typeDef = this.assetTypes.get(typeKey);
        if (typeDef?.evidenceRequirements) {
          const attachedTypes = new Set(
            (asset.evidence || []).map((e) => e.docType)
          );
          for (const req of typeDef.evidenceRequirements) {
            if (req.required && !attachedTypes.has(req.docType)) {
              throw new Error(
                `Missing mandatory evidence document: '${req.description || req.docType}'`
              );
            }
          }
        }

        const prev = asset.status;
        asset.status = AssetStatus.UNDER_VERIFICATION;
        const caseId = `VER-${Date.now()}`;
        const vCase = {
          id: caseId,
          assetId: asset.id,
          status: 'PENDING_REVIEW',
          assignedTo: null,
          checks: {},
          slaDueAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
          createdAt: this._now(),
        };
        this.verificationCases.set(caseId, vCase);
        this._appendAudit(
          caller,
          'ASSET',
          asset.id,
          prev,
          AssetStatus.UNDER_VERIFICATION,
          'SUBMITTED_TO_VERIFIER',
          'Awaiting verification',
          txId
        );
        this._emit(
          EventName.VERIFICATION_STARTED,
          { caseId, assetId: asset.id },
          txId
        );
        result = {
          ...asset,
          verificationCase: vCase,
        };
        break;
      }

      case 'recordVerificationCheck': {
        if (caller.role !== Role.VERIFIER) {
          throw new Error('Only Verifier can record verification checks');
        }
        const vCase = this.verificationCases.get(args.caseId);
        if (!vCase)
          throw new Error(`Verification case not found: ${args.caseId}`);
        if (vCase.decision)
          throw new Error(`Verification case already decided: ${args.caseId}`);
        if (typeof args.checkKey !== 'string' || args.checkKey.trim() === '') {
          throw new Error('checkKey is required');
        }
        const validResults = Object.values(CheckResult);
        if (!validResults.includes(args.result)) {
          throw new Error(
            `Invalid verification check result '${args.result}'. Allowed: ${validResults.join(', ')}`
          );
        }
        const previousStatus = vCase.status;
        const checkKey = args.checkKey.trim();
        const checkedAt = this._now();
        vCase.checks[checkKey] = {
          result: args.result,
          notes: args.notes || '',
          sourceRef: args.sourceRef || '',
          checkedBy: caller.userId,
          checkedAt,
        };
        vCase.status = 'IN_PROGRESS';
        vCase.updatedAt = checkedAt;
        this._appendAudit(
          caller,
          'VERIFICATION',
          vCase.id,
          previousStatus,
          vCase.status,
          'CHECK_RECORDED',
          `${checkKey}:${args.result}`,
          txId
        );
        this._emit(
          'VerificationCheckRecorded',
          {
            caseId: vCase.id,
            checkKey,
            result: args.result,
            checkedBy: vCase.checks[checkKey].checkedBy,
          },
          txId
        );
        result = vCase;
        break;
      }

      case 'decideVerification': {
        if (caller.role !== Role.VERIFIER) {
          throw new Error('Only Verifier can decide verification');
        }
        const vCase = this.verificationCases.get(args.caseId);
        if (!vCase)
          throw new Error(`Verification case not found: ${args.caseId}`);
        if (vCase.decision)
          throw new Error(`Verification case already decided: ${args.caseId}`);
        if (!Object.values(VerificationDecision).includes(args.decision)) {
          throw new Error(`Invalid verification decision '${args.decision}'`);
        }
        if (
          typeof args.reasonCode !== 'string' ||
          args.reasonCode.trim() === ''
        ) {
          throw new Error(
            'A reasonCode is required for every verification decision'
          );
        }
        const asset = this.assets.get(vCase.assetId);
        if (!asset) throw new Error(`Asset not found: ${vCase.assetId}`);

        // Segregation of duties: Verifier cannot be originator
        if (
          asset.originatorParticipantId === caller.participantId ||
          asset.originatorParticipantId === caller.userId
        ) {
          throw new Error(
            'Segregation of duties violation: Originator cannot verify their own asset'
          );
        }

        const prev = asset.status;
        vCase.decision = args.decision;
        vCase.reasonCode = args.reasonCode;
        vCase.reasonText = args.reasonText || '';
        vCase.decidedBy = caller.userId;
        vCase.status = args.decision;
        vCase.updatedAt = this._now();

        if (args.decision === VerificationDecision.APPROVED) {
          asset.status = AssetStatus.VERIFIED;
          asset.verifiedBy =
            caller.userId || caller.participantId || caller.mspId;
          asset.verifiedByMspId = caller.mspId;
        } else if (args.decision === VerificationDecision.CHANGES_REQUESTED) {
          asset.status = AssetStatus.CHANGES_REQUESTED;
        } else if (args.decision === VerificationDecision.REJECTED) {
          asset.status = AssetStatus.REJECTED;
        }
        asset.updatedAt = vCase.updatedAt;

        this._appendAudit(
          caller,
          'VERIFICATION',
          vCase.id,
          prev,
          asset.status,
          'VERIFICATION_DECIDED',
          args.reasonText || args.reasonCode,
          txId
        );
        this._emit(
          EventName.VERIFICATION_DECIDED,
          {
            caseId: vCase.id,
            assetId: asset.id,
            decision: args.decision,
            reasonCode: args.reasonCode,
          },
          txId
        );
        result = { asset, verificationCase: vCase };
        break;
      }

      case 'proposeValuation': {
        if (caller.role !== Role.VALUER) {
          throw new Error('Only Valuer can propose valuations');
        }
        const asset = this.assets.get(args.assetId);
        if (!asset) throw new Error(`Asset not found: ${args.assetId}`);
        if (asset.status !== AssetStatus.VERIFIED) {
          throw new Error(
            `Asset must be VERIFIED before valuation, currently: ${asset.status}`
          );
        }

        if (!Number.isSafeInteger(args.amountPaise) || args.amountPaise <= 0) {
          throw new Error('amountPaise must be a positive safe integer');
        }
        if (args.currency !== 'INR') {
          throw new Error('Only INR valuations are supported');
        }
        if (typeof args.method !== 'string' || !args.method.trim()) {
          throw new Error('method is required');
        }
        const typeDef = this.assetTypes.get(
          `${asset.typeKey}:${asset.typeVersion || 1}`
        );
        if (!typeDef) throw new Error(`Asset type ${asset.typeKey} not found`);
        if (
          !Array.isArray(typeDef.valuation?.methods) ||
          !typeDef.valuation.methods.includes(args.method)
        ) {
          throw new Error(
            `Valuation method '${args.method}' is not allowed for asset type ${asset.typeKey}`
          );
        }
        if (
          !args.source ||
          typeof args.source.valuerName !== 'string' ||
          args.source.valuerName.trim().length < 2
        ) {
          throw new Error(
            'source.valuerName must contain at least 2 characters'
          );
        }
        if (
          typeof args.source.valuerOrg !== 'string' ||
          args.source.valuerOrg.trim().length < 2
        ) {
          throw new Error(
            'source.valuerOrg must contain at least 2 characters'
          );
        }
        if (
          args.source.reportHash !== undefined &&
          !/^[a-fA-F0-9]{64}$/.test(args.source.reportHash)
        ) {
          throw new Error(
            'source.reportHash must be a 64-character SHA-256 hex digest'
          );
        }
        const valuationDateMs = Date.parse(args.valuationDate);
        const validUntilMs = Date.parse(args.validUntil);
        const nowMs = Date.parse(this._now());
        if (!Number.isFinite(valuationDateMs) || valuationDateMs > nowMs) {
          throw new Error(
            'valuationDate must be valid and cannot be in the future'
          );
        }
        if (
          !Number.isFinite(validUntilMs) ||
          validUntilMs <= nowMs ||
          validUntilMs <= valuationDateMs
        ) {
          throw new Error(
            'validUntil must be after valuationDate and the current transaction time'
          );
        }
        const validityDays = typeDef.valuation?.validityDays;
        if (Number.isSafeInteger(validityDays) && validityDays > 0) {
          const latestValidUntil =
            valuationDateMs + validityDays * 24 * 60 * 60 * 1000;
          if (validUntilMs > latestValidUntil) {
            throw new Error(
              `validUntil exceeds the asset type validity limit of ${validityDays} days`
            );
          }
        }

        const originator = this.participants.get(asset.originatorParticipantId);
        if (!originator?.mspId) {
          throw new Error(
            `Originator organization not found for participant ${asset.originatorParticipantId}`
          );
        }
        if (caller.mspId === originator.mspId) {
          throw new Error(
            'Segregation of duties violation: Valuer organization cannot be the issuer organization'
          );
        }
        const verifier =
          asset.verifiedBy ||
          [...this.verificationCases.values()].find(
            (item) =>
              item.assetId === asset.id &&
              item.decision === VerificationDecision.APPROVED
          )?.decidedBy;
        if (!verifier) {
          throw new Error(
            `Approved verifier identity not found for asset ${asset.id}`
          );
        }
        const proposerId =
          caller.userId || caller.participantId || caller.mspId;
        if (proposerId === verifier) {
          throw new Error(
            'Segregation of duties violation: Asset verifier cannot propose its valuation'
          );
        }
        if (
          [...this.valuations.values()].some(
            (item) =>
              item.assetId === asset.id &&
              item.status === ValuationStatus.PROPOSED
          )
        ) {
          throw new Error(
            `A valuation proposal is already pending for asset ${asset.id}`
          );
        }

        const id = args.id || `VAL-${Date.now()}`;
        if (this.valuations.has(id)) {
          throw new Error(`Valuation with ID ${id} already exists`);
        }
        const normalizedValuationDate = new Date(valuationDateMs).toISOString();
        const normalizedValidUntil = new Date(validUntilMs).toISOString();
        const valuation = {
          id,
          assetId: args.assetId,
          version: 1,
          amountPaise: args.amountPaise,
          currency: args.currency,
          method: args.method.trim(),
          methodDetails: args.methodDetails || {},
          source: {
            ...args.source,
            valuerName: args.source.valuerName.trim(),
            valuerOrg: args.source.valuerOrg.trim(),
            reportHash: args.source.reportHash?.toLowerCase(),
          },
          valuationDate: normalizedValuationDate,
          validUntil: normalizedValidUntil,
          status: ValuationStatus.PROPOSED,
          proposedBy: proposerId,
          proposedByMspId: caller.mspId,
          createdAt: this._now(),
        };
        this.valuations.set(id, valuation);
        this._appendAudit(
          caller,
          'VALUATION',
          id,
          'NONE',
          ValuationStatus.PROPOSED,
          'VALUATION_PROPOSED',
          `Proposed ₹${(args.amountPaise / 100).toLocaleString()}`,
          txId
        );
        this._emit(EventName.VALUATION_PROPOSED, valuation, txId);
        result = valuation;
        break;
      }

      case 'approveValuation': {
        if (caller.role !== Role.COMPLIANCE && caller.role !== Role.VALUER) {
          throw new Error(
            'Only Compliance or a second Valuer can approve valuation (Maker-Checker)'
          );
        }
        const valuation = this.valuations.get(args.valuationId);
        if (!valuation)
          throw new Error(`Valuation not found: ${args.valuationId}`);
        if (valuation.status !== ValuationStatus.PROPOSED) {
          throw new Error(
            `Only PROPOSED valuations can be approved, currently: ${valuation.status}`
          );
        }
        const approverId =
          caller.userId || caller.participantId || caller.mspId;
        if (valuation.proposedBy === approverId) {
          throw new Error(
            'Maker-Checker violation: Valuation approver cannot be the same person who proposed it'
          );
        }

        const asset = this.assets.get(valuation.assetId);
        if (!asset) throw new Error(`Asset not found: ${valuation.assetId}`);
        if (asset.status !== AssetStatus.VERIFIED) {
          throw new Error(
            `Asset must remain VERIFIED until valuation approval, currently: ${asset.status}`
          );
        }
        const verifier =
          asset.verifiedBy ||
          [...this.verificationCases.values()].find(
            (item) =>
              item.assetId === asset.id &&
              item.decision === VerificationDecision.APPROVED
          )?.decidedBy;
        if (!verifier) {
          throw new Error(
            `Approved verifier identity not found for asset ${asset.id}`
          );
        }
        if (approverId === verifier) {
          throw new Error(
            'Segregation of duties violation: Asset verifier cannot approve its valuation'
          );
        }
        const originator = this.participants.get(asset.originatorParticipantId);
        if (!originator?.mspId) {
          throw new Error(
            `Originator organization not found for participant ${asset.originatorParticipantId}`
          );
        }
        if (caller.mspId === originator.mspId) {
          throw new Error(
            'Segregation of duties violation: Issuer organization cannot approve the valuation'
          );
        }
        if (Date.parse(valuation.validUntil) <= Date.parse(this._now())) {
          throw new Error('Valuation has expired and cannot be approved');
        }

        const previousAssetStatus = asset.status;
        valuation.status = ValuationStatus.APPROVED;
        valuation.approvedBy = approverId;
        valuation.approvedByMspId = caller.mspId;
        valuation.approvedAt = this._now();
        asset.status = AssetStatus.VALUED;
        asset.valuationId = valuation.id;
        asset.updatedAt = this._now();

        this._appendAudit(
          caller,
          'VALUATION',
          valuation.id,
          ValuationStatus.PROPOSED,
          ValuationStatus.APPROVED,
          'VALUATION_APPROVED',
          `Valuation approved for asset ${asset.id}`,
          txId
        );
        this._appendAudit(
          caller,
          'ASSET',
          asset.id,
          previousAssetStatus,
          AssetStatus.VALUED,
          'VALUATION_APPROVED',
          `Valuation ${valuation.id} approved`,
          txId
        );
        this._emit(
          EventName.VALUATION_APPROVED,
          {
            valuation,
            assetId: asset.id,
            assetStatus: asset.status,
          },
          txId
        );
        result = { valuation, asset };
        break;
      }

      case 'mintToken': {
        if (caller.role !== Role.COMPLIANCE) {
          throw new Error('Only Compliance can execute/approve token mint');
        }
        const input = RequestMintTokenSchema.parse(args);
        const asset = this.assets.get(input.assetId);
        if (!asset) throw new Error(`Asset not found: ${input.assetId}`);
        if (asset.tokenId)
          throw new Error(`Asset ${asset.id} is already tokenized`);
        if (asset.status !== AssetStatus.VALUED) {
          throw new Error(
            `Asset must be in VALUED state before tokenization, currently ${asset.status}`
          );
        }
        if (!asset.originatorParticipantId) {
          throw new Error(
            `Asset ${asset.id} has no originator participant for initial token allocation`
          );
        }

        const id = `TKN-${txId}`;
        const token = {
          id,
          assetId: asset.id,
          standard: input.standard,
          totalUnits: input.totalUnits,
          unitLabel: input.unitLabel,
          rightsType: input.rightsType,
          representation: input.representation,
          initialHolderId: asset.originatorParticipantId,
          status: 'ACTIVE',
          mintedAt: this._now(),
          mintedTxId: txId,
        };
        this.tokens.set(id, token);

        // Assign initial full balance to originator
        const balKey = `${id}:${token.initialHolderId}`;
        this.balances.set(balKey, token.totalUnits);

        const prev = asset.status;
        asset.status = AssetStatus.TOKENIZED;
        asset.tokenId = id;
        asset.updatedAt = token.mintedAt;

        this._appendAudit(
          caller,
          'TOKEN',
          id,
          'NONE',
          'ACTIVE',
          'TOKEN_MINTED',
          `Minted ${token.totalUnits} ${token.unitLabel}`,
          txId
        );
        this._appendAudit(
          caller,
          'ASSET',
          asset.id,
          prev,
          AssetStatus.TOKENIZED,
          'TOKEN_MINTED',
          `Asset tokenized into ${id}`,
          txId
        );
        this._emit(EventName.TOKEN_MINTED, token, txId);
        result = token;
        break;
      }

      case 'proposeTransfer': {
        const token = this.tokens.get(args.tokenId);
        if (!token) throw new Error(`Token not found: ${args.tokenId}`);
        const fromParticipantId =
          args.fromParticipantId || caller.participantId;
        const balKey = `${token.id}:${fromParticipantId}`;
        const currentBal = this.balances.get(balKey) || 0;

        const id = args.id || `TRF-${Date.now()}`;
        const transfer = {
          id,
          tokenId: args.tokenId,
          fromParticipantId,
          toParticipantId: args.toParticipantId,
          units: args.units,
          pricePaise: args.pricePaise || 0,
          paymentRef: args.paymentRef || '',
          status: TransferStatus.PROPOSED,
          rejectionReasons: [],
          ruleResults: {},
          createdAt: this._now(),
        };
        this.transfers.set(id, transfer);
        this._appendAudit(
          caller,
          'TRANSFER',
          id,
          'NONE',
          TransferStatus.PROPOSED,
          'TRANSFER_PROPOSED',
          `${args.units} units proposed to ${args.toParticipantId}`,
          txId
        );
        this._emit(EventName.TRANSFER_PROPOSED, transfer, txId);
        result = transfer;
        break;
      }

      case 'executeTransfer': {
        const transfer = this.transfers.get(args.transferId);
        if (!transfer)
          throw new Error(`Transfer not found: ${args.transferId}`);
        const token = this.tokens.get(transfer.tokenId);
        if (!token) throw new Error(`Token not found: ${transfer.tokenId}`);
        const asset = this.assets.get(token.assetId);

        // Evaluate all business rules deterministically
        const ruleOutcomes = this._evaluateRules(transfer, token, asset);
        transfer.ruleResults = ruleOutcomes.results;

        // CRITICAL FABRIC DESIGN RULE 3.4-1:
        // A rejected transfer must NOT fail/revert transaction.
        // It returns successfully after persisting REJECTED status and reason codes!
        if (!ruleOutcomes.passed) {
          transfer.status = TransferStatus.REJECTED;
          transfer.rejectionReasons = ruleOutcomes.rejectionReasons;
          this._appendAudit(
            caller,
            'TRANSFER',
            transfer.id,
            TransferStatus.PROPOSED,
            TransferStatus.REJECTED,
            'RULES_FAILED',
            ruleOutcomes.rejectionReasons.map((r) => r.code).join(', '),
            txId
          );
          this._emit(EventName.TRANSFER_REJECTED, transfer, txId);
          result = transfer;
          break;
        }

        // Rules passed -> Execute balance transfer atomically
        const senderKey = `${token.id}:${transfer.fromParticipantId}`;
        const receiverKey = `${token.id}:${transfer.toParticipantId}`;
        const senderBal = this.balances.get(senderKey) || 0;
        const receiverBal = this.balances.get(receiverKey) || 0;

        this.balances.set(senderKey, senderBal - transfer.units);
        this.balances.set(receiverKey, receiverBal + transfer.units);
        this.balanceAcquiredAt.set(receiverKey, this._now());

        transfer.status = TransferStatus.EXECUTED;
        transfer.executedTxId = txId;
        this._appendAudit(
          caller,
          'TRANSFER',
          transfer.id,
          TransferStatus.PROPOSED,
          TransferStatus.EXECUTED,
          'TRANSFER_EXECUTED',
          'Settled successfully',
          txId
        );
        this._emit(EventName.TRANSFER_EXECUTED, transfer, txId);
        result = transfer;
        break;
      }

      case 'cancelTransfer': {
        const transfer = this.transfers.get(args.transferId || args.id);
        if (!transfer)
          throw new Error(`Transfer not found: ${args.transferId || args.id}`);
        const prev = transfer.status;
        transfer.status = TransferStatus.CANCELLED;
        this._appendAudit(
          caller,
          'TRANSFER',
          transfer.id,
          prev,
          TransferStatus.CANCELLED,
          'TRANSFER_CANCELLED',
          args.reason || 'Cancelled by user',
          txId
        );
        result = transfer;
        break;
      }

      case 'freezeAsset': {
        if (caller.role !== Role.COMPLIANCE) {
          throw new Error('Only Compliance can freeze assets');
        }
        const asset = this.assets.get(args.assetId);
        if (!asset) throw new Error(`Asset not found: ${args.assetId}`);
        const prev = asset.status;
        asset.status = AssetStatus.FROZEN;
        asset.freezeReason = args.reasonText;
        if (asset.tokenId) {
          const t = this.tokens.get(asset.tokenId);
          if (t) t.status = 'FROZEN';
        }
        this._appendAudit(
          caller,
          'ASSET',
          asset.id,
          prev,
          AssetStatus.FROZEN,
          'COMPLIANCE_HOLD',
          args.reasonText,
          txId
        );
        this._emit(
          EventName.ASSET_FROZEN,
          { assetId: asset.id, reason: args.reasonText },
          txId
        );
        result = asset;
        break;
      }

      case 'unfreezeAsset': {
        if (caller.role !== Role.COMPLIANCE) {
          throw new Error('Only Compliance can unfreeze assets');
        }
        const asset = this.assets.get(args.assetId);
        if (!asset) throw new Error(`Asset not found: ${args.assetId}`);
        if (asset.status !== AssetStatus.FROZEN) {
          throw new Error('Asset is not currently frozen');
        }
        const prev = asset.status;
        asset.status = asset.tokenId
          ? AssetStatus.TOKENIZED
          : AssetStatus.VALUED;
        if (asset.tokenId) {
          const t = this.tokens.get(asset.tokenId);
          if (t) t.status = 'ACTIVE';
        }
        this._appendAudit(
          caller,
          'ASSET',
          asset.id,
          prev,
          asset.status,
          'COMPLIANCE_RELEASE',
          args.reasonText,
          txId
        );
        this._emit(
          EventName.ASSET_UNFROZEN,
          { assetId: asset.id, reason: args.reasonText },
          txId
        );
        result = asset;
        break;
      }

      case 'redeemAsset': {
        if (
          caller.role !== Role.COMPLIANCE &&
          caller.role !== Role.ADMINISTRATOR
        ) {
          throw new Error(
            'Only Compliance or Administrator can approve redemption'
          );
        }
        const asset = this.assets.get(args.assetId);
        if (!asset) throw new Error(`Asset not found: ${args.assetId}`);
        const prev = asset.status;
        asset.status = AssetStatus.REDEEMED;
        if (asset.tokenId) {
          const t = this.tokens.get(asset.tokenId);
          if (t) t.status = 'BURNED';
        }
        this._appendAudit(
          caller,
          'ASSET',
          asset.id,
          prev,
          AssetStatus.REDEEMED,
          'CONSOLIDATED_REDEMPTION',
          args.reasonText,
          txId
        );
        this._emit(EventName.ASSET_REDEEMED, { assetId: asset.id }, txId);
        result = asset;
        break;
      }

      case 'retireAsset': {
        if (
          caller.role !== Role.COMPLIANCE &&
          caller.role !== Role.ADMINISTRATOR
        ) {
          throw new Error('Only Compliance or Administrator can retire assets');
        }
        const asset = this.assets.get(args.assetId);
        if (!asset) throw new Error(`Asset not found: ${args.assetId}`);
        const prev = asset.status;
        asset.status = AssetStatus.RETIRED;
        if (asset.tokenId) {
          const t = this.tokens.get(asset.tokenId);
          if (t) t.status = 'BURNED';
        }
        this._appendAudit(
          caller,
          'ASSET',
          asset.id,
          prev,
          AssetStatus.RETIRED,
          args.reasonCode || 'SCRAPPED_OR_DESTROYED',
          args.reasonText,
          txId
        );
        this._emit(EventName.ASSET_RETIRED, { assetId: asset.id }, txId);
        result = asset;
        break;
      }

      default:
        throw new Error(`Unknown chaincode function: ${fnName}`);
    }

    this.blockNumber++;
    return {
      status: 'COMMITTED',
      txId,
      blockNumber: this.blockNumber - 1,
      result,
    };
  }

  async evaluate(caller, fnName, args = {}) {
    switch (fnName) {
      case 'getAsset': {
        const raw = this.assets.get(args.id);
        if (!raw) return null;
        return this._filterAssetVisibility(raw, caller);
      }
      case 'getEvidence': {
        const id = args.id || args.evidenceId;
        let found = this.evidence.get(id);
        if (!found) {
          for (const asset of this.assets.values()) {
            if (asset.evidence) {
              const match = asset.evidence.find((e) => e.id === id);
              if (match) {
                found = { ...match, assetId: asset.id };
                break;
              }
            }
          }
        }
        return found || null;
      }
      case 'listAssets':
        return Array.from(this.assets.values()).map((a) =>
          this._filterAssetVisibility(a, caller)
        );
      case 'getAssetType':
        return this.assetTypes.get(`${args.key}:${args.version || 1}`) || null;
      case 'listAssetTypes':
        return Array.from(this.assetTypes.values());
      case 'getParticipant':
        return this.participants.get(args.id) || null;
      case 'listParticipants':
        return Array.from(this.participants.values());
      case 'getToken':
        return this.tokens.get(args.id) || null;
      case 'listTokens':
        return Array.from(this.tokens.values());
      case 'getBalance': {
        if (!this.tokens.has(args.tokenId))
          throw new Error(`Token not found: ${args.tokenId}`);
        const key = `${args.tokenId}:${args.participantId}`;
        return { units: this.balances.get(key) || 0 };
      }
      case 'listHolders': {
        if (!this.tokens.has(args.tokenId))
          throw new Error(`Token not found: ${args.tokenId}`);
        const holders = [];
        for (const [key, units] of this.balances.entries()) {
          if (key.startsWith(`${args.tokenId}:`) && units > 0) {
            const [, participantId] = key.split(':');
            holders.push({ participantId, units });
          }
        }
        return holders;
      }
      case 'getTokenTrace': {
        const token = this.tokens.get(args.tokenId);
        if (!token) return null;
        const asset = this.assets.get(token.assetId);
        if (!asset)
          throw new Error(
            `Asset not found for token ${args.tokenId}: ${token.assetId}`
          );
        return {
          token,
          asset,
          holders: await this.evaluate(caller, 'listHolders', {
            tokenId: args.tokenId,
          }),
          auditTrail: this.auditTrail.filter(
            (entry) => entry.entityId === args.tokenId
          ),
        };
      }
      case 'getTransfer':
        return this.transfers.get(args.id) || null;
      case 'listTransfers':
        return Array.from(this.transfers.values());
      case 'getTransferHistory': {
        const tokenId = args.tokenId || args.id;
        return Array.from(this.transfers.values()).filter(
          (t) => t.tokenId === tokenId
        );
      }
      case 'getAuditTrail': {
        let entries = [...this.auditTrail];
        if (args.entityId) {
          entries = entries.filter((e) => e.entityId === args.entityId);
        }
        return entries;
      }
      case 'evaluateTransfer': {
        const transfer = this.transfers.get(args.transferId) || args;
        const token = this.tokens.get(transfer.tokenId);
        const asset = token ? this.assets.get(token.assetId) : null;
        return this._evaluateRules(transfer, token, asset);
      }
      case 'participantExistsAndActive': {
        const p = this.participants.get(args.participantId || args.id);
        return {
          exists: !!p,
          active: !!p && p.status === 'ACTIVE',
          kycApproved: !!p && p.kycStatus === 'APPROVED',
        };
      }
      case 'getVerificationCase': {
        const c = this.verificationCases.get(args.caseId || args.id);
        if (!c) return null;
        const asset = this.assets.get(c.assetId);
        return { ...c, asset: this._filterAssetVisibility(asset, caller) };
      }
      case 'listVerificationCases': {
        return Array.from(this.verificationCases.values()).map((c) => {
          const asset = this.assets.get(c.assetId);
          return { ...c, asset: this._filterAssetVisibility(asset, caller) };
        });
      }
      case 'getValuation':
        return this.valuations.get(args.id) || null;
      case 'listValuations': {
        return Array.from(this.valuations.values()).map((v) => {
          const asset = this.assets.get(v.assetId);
          return { ...v, asset: this._filterAssetVisibility(asset, caller) };
        });
      }
      default:
        throw new Error(`Unknown query function: ${fnName}`);
    }
  }

  _filterAssetVisibility(asset, caller) {
    if (!asset) return null;
    const typeKey = `${asset.typeKey}:${asset.typeVersion}`;
    const typeDef = this.assetTypes.get(typeKey);
    const schema = typeDef?.attributeSchema || {};

    const copy = { ...asset, attributes: { ...asset.attributes } };

    const isRestrictedPrivileged =
      caller?.role === Role.VERIFIER ||
      caller?.role === Role.COMPLIANCE ||
      caller?.role === Role.AUDITOR ||
      caller?.userId === asset.originatorParticipantId ||
      caller?.participantId === asset.originatorParticipantId;

    if (!isRestrictedPrivileged) {
      for (const [key, rule] of Object.entries(schema)) {
        if (rule.visibility === 'RESTRICTED') {
          delete copy.attributes[key];
        }
      }
    }
    return copy;
  }

  _evaluateRules(transfer, token, asset) {
    const results = {};
    const rejectionReasons = [];

    // Rule: Participant status (Active & Not Suspended/Blacklisted)
    const sender = this.participants.get(transfer.fromParticipantId);
    const receiver = this.participants.get(transfer.toParticipantId);

    if (
      (sender && sender.status !== 'ACTIVE') ||
      (receiver && receiver.status !== 'ACTIVE')
    ) {
      rejectionReasons.push(TransferRuleReason.PARTICIPANT_INACTIVE);
      results.PARTICIPANT_ACTIVE = {
        passed: false,
        senderStatus: sender?.status,
        receiverStatus: receiver?.status,
      };
    } else {
      results.PARTICIPANT_ACTIVE = { passed: true };
    }

    // Rule: KYC status must be APPROVED for both parties
    if (
      (sender && sender.kycStatus !== 'APPROVED') ||
      (receiver && receiver.kycStatus !== 'APPROVED')
    ) {
      rejectionReasons.push(TransferRuleReason.KYC_NOT_VERIFIED);
      results.KYC_VERIFIED = {
        passed: false,
        senderKyc: sender?.kycStatus,
        receiverKyc: receiver?.kycStatus,
      };
    } else {
      results.KYC_VERIFIED = { passed: true };
    }

    // Rule: Self transfer prohibited
    if (transfer.fromParticipantId === transfer.toParticipantId) {
      rejectionReasons.push(TransferRuleReason.SELF_TRANSFER_PROHIBITED);
      results.SELF_TRANSFER = { passed: false };
    } else {
      results.SELF_TRANSFER = { passed: true };
    }

    // Rule: Asset transferable (not frozen)
    if (
      asset &&
      (asset.status === AssetStatus.FROZEN ||
        (token && token.status === 'FROZEN'))
    ) {
      rejectionReasons.push(TransferRuleReason.ASSET_FROZEN);
      results.ASSET_TRANSFERABLE = { passed: false };
    } else {
      results.ASSET_TRANSFERABLE = { passed: true };
    }

    // Rule: Token-specific checks (Balance, Whole split, Max holding cap)
    if (token) {
      const senderKey = `${token.id}:${transfer.fromParticipantId}`;
      const currentBal = this.balances.get(senderKey) || 0;
      if (currentBal < transfer.units) {
        rejectionReasons.push(TransferRuleReason.INSUFFICIENT_UNITS);
        results.SELLER_BALANCE = {
          passed: false,
          currentBal,
          required: transfer.units,
        };
      } else {
        results.SELLER_BALANCE = { passed: true };
      }

      // Rule: Whole token cannot be split
      if (token.standard === TokenStandard.WHOLE && transfer.units !== 1) {
        rejectionReasons.push(TransferRuleReason.WHOLE_TOKEN_SPLIT_FORBIDDEN);
        results.WHOLE_ONLY = { passed: false };
      } else {
        results.WHOLE_ONLY = { passed: true };
      }

      // Rule: Max holding cap (e.g. 25% = 2500 bps for land)
      if (token.standard === TokenStandard.FRACTIONAL) {
        const receiverKey = `${token.id}:${transfer.toParticipantId}`;
        const receiverBal = this.balances.get(receiverKey) || 0;
        const futureBal = receiverBal + transfer.units;
        const maxUnitsAllowed = Math.floor(token.totalUnits * 0.25);
        if (futureBal > maxUnitsAllowed) {
          rejectionReasons.push(TransferRuleReason.MAX_HOLDING_CAP_EXCEEDED);
          results.MAX_HOLDING_CAP = {
            passed: false,
            futureBal,
            maxAllowed: maxUnitsAllowed,
          };
        } else {
          results.MAX_HOLDING_CAP = { passed: true };
        }
      }
    }

    const assetType = asset
      ? this.assetTypes.get(`${asset.typeKey}:${asset.typeVersion || 1}`)
      : null;
    const txTimeMs = Date.now();

    // RULE: LOCK_IN_PERIOD (seller's units held less than lockInDays)
    const lockInDays =
      assetType?.complianceRules?.lockInDays ??
      assetType?.token?.lockInDays ??
      assetType?.rules?.lockInDays ??
      0;
    if (lockInDays > 0 && token) {
      const senderKey = `${token.id}:${transfer.fromParticipantId}`;
      const acquiredAt = this.balanceAcquiredAt.get(senderKey);
      if (acquiredAt) {
        const acquiredAtMs = new Date(acquiredAt).getTime() || 0;
        const elapsedDays = (txTimeMs - acquiredAtMs) / (24 * 60 * 60 * 1000);
        if (elapsedDays < lockInDays) {
          rejectionReasons.push(TransferRuleReason.LOCK_IN_ACTIVE);
          results.LOCK_IN_PERIOD = {
            passed: false,
            elapsedDays: Math.floor(elapsedDays),
            lockInDays,
          };
        } else {
          results.LOCK_IN_PERIOD = { passed: true };
        }
      } else {
        results.LOCK_IN_PERIOD = { passed: true };
      }
    }

    // RULE: BUYER_CLASS_INSUFFICIENT (investor class tier below minBuyerClass)
    const minBuyerClass =
      assetType?.complianceRules?.minBuyerClass ??
      assetType?.token?.minBuyerClass ??
      assetType?.rules?.minBuyerClass;
    if (minBuyerClass) {
      const CLASS_TIER = { RETAIL: 1, QUALIFIED: 2, INSTITUTIONAL: 3 };
      const buyerTier = CLASS_TIER[receiver?.investorClass] || 0;
      const requiredTier = CLASS_TIER[minBuyerClass] || 0;
      if (buyerTier < requiredTier) {
        rejectionReasons.push(TransferRuleReason.BUYER_CLASS_INSUFFICIENT);
        results.BUYER_CLASS = {
          passed: false,
          buyerClass: receiver?.investorClass,
          minBuyerClass,
        };
      } else {
        results.BUYER_CLASS = { passed: true };
      }
    }

    // RULE: JURISDICTION_NOT_ALLOWED (buyer jurisdiction restricted)
    const allowedJurisdictions =
      assetType?.complianceRules?.allowedJurisdictions ??
      assetType?.token?.allowedJurisdictions ??
      assetType?.rules?.allowedJurisdictions;
    if (
      Array.isArray(allowedJurisdictions) &&
      allowedJurisdictions.length > 0
    ) {
      if (
        receiver?.jurisdiction &&
        !allowedJurisdictions.includes(receiver.jurisdiction)
      ) {
        rejectionReasons.push(TransferRuleReason.JURISDICTION_RESTRICTED);
        results.JURISDICTION = {
          passed: false,
          buyerJurisdiction: receiver.jurisdiction,
          allowedJurisdictions,
        };
      } else {
        results.JURISDICTION = { passed: true };
      }
    }

    // RULE: KYC_EXPIRED (participant KYC expiry timestamp exceeded)
    const senderKycExpired =
      sender?.kycExpiresAt &&
      new Date(sender.kycExpiresAt).getTime() <= txTimeMs;
    const receiverKycExpired =
      receiver?.kycExpiresAt &&
      new Date(receiver.kycExpiresAt).getTime() <= txTimeMs;
    if (senderKycExpired || receiverKycExpired) {
      rejectionReasons.push(TransferRuleReason.KYC_EXPIRED);
      results.KYC_EXPIRED = {
        passed: false,
        senderKycExpiresAt: sender?.kycExpiresAt,
        receiverKycExpiresAt: receiver?.kycExpiresAt,
      };
    } else {
      results.KYC_EXPIRED = { passed: true };
    }

    // RULE: VALUATION_STALE (asset valuation validUntil window has passed)
    const blockOnStaleValuation =
      assetType?.complianceRules?.blockOnStaleValuation ??
      assetType?.token?.blockOnStaleValuation ??
      assetType?.rules?.blockOnStaleValuation;
    if (blockOnStaleValuation && asset?.valuation?.validUntil) {
      const validUntilMs = new Date(asset.valuation.validUntil).getTime();
      if (validUntilMs > 0 && validUntilMs <= txTimeMs) {
        rejectionReasons.push(TransferRuleReason.VALUATION_STALE);
        results.VALUATION_STALE = {
          passed: false,
          validUntil: asset.valuation.validUntil,
        };
      } else {
        results.VALUATION_STALE = { passed: true };
      }
    }

    return {
      passed: rejectionReasons.length === 0,
      results,
      rejectionReasons,
    };
  }

  /**
   * Computes the Merkle-style evidence root from the actual on-chain evidence
   * leaves (SHA-256 digests). Deterministic — no hardcoded/fake roots.
   * An empty evidence set yields the root of no documents (sha256 of "").
   */
  _computeEvidenceRoot(evidenceArray = []) {
    const leaves = (evidenceArray || [])
      .map((e) => e.sha256)
      .sort();
    return crypto
      .createHash('sha256')
      .update(leaves.join(':'))
      .digest('hex');
  }

  _filterAssetVisibility(asset, caller) {
    if (!asset) return null;
    const cloned = JSON.parse(JSON.stringify(asset));
    if (!caller) return cloned;

    const hasPrivilegedAccess =
      caller.role === Role.ADMINISTRATOR ||
      caller.role === Role.VERIFIER ||
      caller.role === Role.VALUER ||
      caller.role === Role.COMPLIANCE ||
      caller.role === Role.AUDITOR ||
      (caller.role === Role.ISSUER &&
        (caller.participantId === asset.originatorParticipantId ||
          caller.userId === asset.originatorParticipantId ||
          !asset.originatorParticipantId));

    if (hasPrivilegedAccess) {
      return cloned;
    }

    // Redact RESTRICTED fields for INVESTOR or public
    const typeKey = `${cloned.typeKey}:${cloned.typeVersion || 1}`;
    const typeDef = this.assetTypes.get(typeKey);
    const schema = typeDef?.attributeSchema || {};

    if (cloned.attributes) {
      for (const [key, rule] of Object.entries(schema)) {
        if (
          rule.visibility === 'RESTRICTED' &&
          cloned.attributes[key] !== undefined
        ) {
          cloned.attributes[key] = '[REDACTED (CONSORTIUM PRIVILEGED)]';
        }
      }
    }

    return cloned;
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
}
