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
    this.transfers = new Map();
    this.auditTrail = [];
    this.blocks = [];
    this.subscribers = new Set();
    this.blockNumber = 1;
    this.txIndex = 0;

    this.initDefaultSeed();
  }

  initDefaultSeed() {
    // Seed default types: VEHICLE (whole) & LAND (fractional)
    this.assetTypes.set('VEHICLE:1', {
      key: 'VEHICLE',
      version: 1,
      displayName: 'Commercial & Agricultural Vehicles',
      attributeSchema: {
        registrationNumber: { type: 'string', required: true, visibility: 'PUBLIC' },
        chassisNumber: { type: 'string', required: true, visibility: 'RESTRICTED' },
        make: { type: 'string', required: true, visibility: 'PUBLIC' },
        model: { type: 'string', required: true, visibility: 'PUBLIC' },
        year: { type: 'number', required: true, visibility: 'PUBLIC' },
      },
      evidenceRequirements: [
        { docType: 'RC', required: true, description: 'Registration Certificate' },
        { docType: 'INSURANCE', required: true, description: 'Valid Commercial Insurance' },
      ],
      verificationChecklist: [
        { key: 'RC_VALID', label: 'Verify RC with Vahan / Transport Dept', required: true },
        { key: 'CHASSIS_MATCH', label: 'Physical inspection match on chassis/engine', required: true },
        { key: 'NO_HYPOTHECATION', label: 'Verify no undeclared bank lien / hypothecation', required: true },
      ],
      valuation: { methods: ['DEPRECIATED_COST', 'MARKET_COMPARABLE'], validityDays: 180 },
      token: { standard: TokenStandard.WHOLE },
      transferRules: [
        { id: 'PARTY_KYC_VERIFIED', type: 'PARTY_KYC_VERIFIED' },
        { id: 'WHOLE_ONLY', type: 'WHOLE_ONLY' },
      ],
      terminalReasons: {
        REDEEMED: ['OFF_PLATFORM_REPOSSESSION'],
        RETIRED: ['SCRAPPED', 'THEFT_TOTAL_LOSS'],
      },
    });

    this.assetTypes.set('LAND:1', {
      key: 'LAND',
      version: 1,
      displayName: 'Agricultural & Commercial Land Parcels',
      attributeSchema: {
        surveyNumber: { type: 'string', required: true, visibility: 'PUBLIC' },
        district: { type: 'string', required: true, visibility: 'PUBLIC' },
        state: { type: 'string', required: true, visibility: 'PUBLIC' },
        areaSqMeters: { type: 'number', required: true, visibility: 'PUBLIC' },
        landUse: { type: 'string', required: true, visibility: 'PUBLIC' },
      },
      evidenceRequirements: [
        { docType: 'TITLE_DEED', required: true, description: 'Registered Title Deed' },
        { docType: 'ENCUMBRANCE_CERT', required: true, description: '15-Year Encumbrance Certificate' },
        { docType: 'SURVEY_MAP', required: true, description: 'Government Survey & Boundary Map' },
      ],
      verificationChecklist: [
        { key: 'TITLE_CHAIN', label: 'Chain of title 30-year search verified', required: true },
        { key: 'ENCUMBRANCE_CLEAR', label: 'Encumbrance certificate shows zero active lien', required: true },
        { key: 'SURVEY_MATCH', label: 'Boundary coordinates match revenue map', required: true },
      ],
      valuation: { methods: ['CIRCLE_RATE', 'MARKET_COMPARABLE'], validityDays: 180 },
      token: { standard: TokenStandard.FRACTIONAL, minUnits: 100, maxUnits: 100000 },
      transferRules: [
        { id: 'PARTY_KYC_VERIFIED', type: 'PARTY_KYC_VERIFIED' },
        { id: 'MAX_HOLDING_BPS', type: 'MAX_HOLDING_BPS', params: { maxBps: 2500 } }, // 25% max cap
      ],
      terminalReasons: {
        REDEEMED: ['CONSOLIDATED_BUYOUT'],
        RETIRED: ['LEGAL_INVALIDATION', 'GOVT_ACQUISITION'],
      },
    });
  }

  _now() {
    return new Date().toISOString();
  }

  _generateTxId() {
    return '0x' + crypto.randomBytes(32).toString('hex');
  }

  _appendAudit(actor, entityType, entityId, fromState, toState, reasonCode, reasonText, txId) {
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
        const record = {
          id,
          orgId: args.orgId,
          mspId: caller.mspId,
          kind: args.kind,
          jurisdiction: args.jurisdiction || 'IN',
          investorClass: args.investorClass || 'RETAIL',
          kycStatus: 'SUBMITTED',
          status: 'ACTIVE',
          limits: { maxHoldingBps: 2500, maxTransferPaise: 100000000 },
          createdAt: this._now(),
        };
        this.participants.set(id, record);
        this._appendAudit(caller, 'PARTICIPANT', id, 'NONE', 'SUBMITTED', 'REGISTRATION', 'Participant registered', txId);
        this._emit(EventName.PARTICIPANT_REGISTERED, record, txId);
        result = record;
        break;
      }

      case 'updateKycStatus': {
        if (caller.role !== Role.COMPLIANCE && caller.role !== Role.ADMINISTRATOR) {
          throw new Error('Only Compliance or Administrator can update KYC status');
        }
        const participant = this.participants.get(args.participantId);
        if (!participant) throw new Error(`Participant not found: ${args.participantId}`);
        const prev = participant.kycStatus;
        participant.kycStatus = args.kycStatus;
        participant.kycReason = args.reason || '';
        this._appendAudit(caller, 'PARTICIPANT', participant.id, prev, args.kycStatus, 'KYC_DECISION', args.reason, txId);
        this._emit(EventName.KYC_UPDATED, { participantId: participant.id, kycStatus: args.kycStatus }, txId);
        result = participant;
        break;
      }

      case 'defineAssetType': {
        if (caller.role !== Role.ADMINISTRATOR) {
          throw new Error('Only Administrator can define asset types');
        }
        const key = `${args.key}:${args.version}`;
        this.assetTypes.set(key, args);
        this._appendAudit(caller, 'ASSET_TYPE', key, 'NONE', 'ACTIVE', 'TYPE_PUBLISHED', 'Asset type published', txId);
        this._emit(EventName.ASSET_TYPE_DEFINED, { key: args.key, version: args.version }, txId);
        result = args;
        break;
      }

      case 'registerAsset': {
        if (caller.role !== Role.ISSUER) {
          throw new Error('Only Issuer can register assets');
        }
        const id = args.id || `AST-${Date.now()}`;
        const typeKey = `${args.typeKey}:${args.typeVersion || 1}`;
        const typeDef = this.assetTypes.get(typeKey);
        if (!typeDef) throw new Error(`Asset type ${typeKey} not found`);

        const asset = {
          id,
          typeKey: args.typeKey,
          typeVersion: args.typeVersion || 1,
          originatorParticipantId: caller.participantId || caller.userId,
          displayName: args.displayName,
          attributes: args.attributes,
          attributesHash: crypto.createHash('sha256').update(JSON.stringify(args.attributes)).digest('hex'),
          status: AssetStatus.REGISTERED,
          evidenceRoot: '',
          version: 1,
          createdAt: this._now(),
        };
        this.assets.set(id, asset);
        this._appendAudit(caller, 'ASSET', id, 'NONE', AssetStatus.REGISTERED, 'ASSET_REGISTERED', 'Asset submitted', txId);
        this._emit(EventName.ASSET_REGISTERED, asset, txId);
        result = asset;
        break;
      }

      case 'attachEvidence': {
        const asset = this.assets.get(args.assetId);
        if (!asset) throw new Error(`Asset not found: ${args.assetId}`);
        if (asset.status !== AssetStatus.REGISTERED && asset.status !== AssetStatus.CHANGES_REQUESTED) {
          throw new Error(`Cannot attach evidence when asset is in status ${asset.status}`);
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
        this._appendAudit(caller, 'EVIDENCE', evId, 'NONE', 'ATTACHED', 'EVIDENCE_ATTACHED', args.fileName, txId);
        this._emit(EventName.EVIDENCE_ATTACHED, evidence, txId);
        result = evidence;
        break;
      }

      case 'submitForVerification': {
        const asset = this.assets.get(args.assetId);
        if (!asset) throw new Error(`Asset not found: ${args.assetId}`);
        const prev = asset.status;
        asset.status = AssetStatus.UNDER_VERIFICATION;
        const caseId = `VER-${Date.now()}`;
        const vCase = {
          id: caseId,
          assetId: asset.id,
          status: 'PENDING_REVIEW',
          assignedTo: null,
          checks: {},
          createdAt: this._now(),
        };
        this.verificationCases.set(caseId, vCase);
        this._appendAudit(caller, 'ASSET', asset.id, prev, AssetStatus.UNDER_VERIFICATION, 'SUBMITTED_TO_VERIFIER', 'Awaiting verification', txId);
        this._emit(EventName.VERIFICATION_STARTED, { caseId, assetId: asset.id }, txId);
        result = { asset, verificationCase: vCase };
        break;
      }

      case 'recordVerificationCheck': {
        if (caller.role !== Role.VERIFIER) {
          throw new Error('Only Verifier can record verification checks');
        }
        const vCase = this.verificationCases.get(args.caseId);
        if (!vCase) throw new Error(`Verification case not found: ${args.caseId}`);
        vCase.checks[args.checkKey] = {
          result: args.result,
          notes: args.notes || '',
          sourceRef: args.sourceRef || '',
          checkedBy: caller.userId,
          checkedAt: this._now(),
        };
        result = vCase;
        break;
      }

      case 'decideVerification': {
        if (caller.role !== Role.VERIFIER) {
          throw new Error('Only Verifier can decide verification');
        }
        const vCase = this.verificationCases.get(args.caseId);
        if (!vCase) throw new Error(`Verification case not found: ${args.caseId}`);
        const asset = this.assets.get(vCase.assetId);
        if (!asset) throw new Error(`Asset not found: ${vCase.assetId}`);

        // Segregation of duties: Verifier cannot be originator
        if (asset.originatorParticipantId === caller.participantId) {
          throw new Error('Segregation of duties violation: Originator cannot verify their own asset');
        }

        const prev = asset.status;
        vCase.decision = args.decision;
        vCase.reasonCode = args.reasonCode;
        vCase.reasonText = args.reasonText || '';
        vCase.decidedBy = caller.userId;

        if (args.decision === VerificationDecision.APPROVED) {
          asset.status = AssetStatus.VERIFIED;
        } else if (args.decision === VerificationDecision.CHANGES_REQUESTED) {
          asset.status = AssetStatus.CHANGES_REQUESTED;
        } else if (args.decision === VerificationDecision.REJECTED) {
          asset.status = AssetStatus.REJECTED;
        }

        this._appendAudit(caller, 'ASSET', asset.id, prev, asset.status, args.reasonCode, args.reasonText, txId);
        this._emit(EventName.VERIFICATION_DECIDED, { assetId: asset.id, decision: args.decision }, txId);
        result = { asset, verificationCase: vCase };
        break;
      }

      case 'proposeValuation': {
        if (caller.role !== Role.VERIFIER && caller.role !== Role.VALUER) {
          throw new Error('Only Verifier / Valuer can propose valuations');
        }
        const asset = this.assets.get(args.assetId);
        if (!asset) throw new Error(`Asset not found: ${args.assetId}`);
        if (asset.status !== AssetStatus.VERIFIED && asset.status !== AssetStatus.VALUED && asset.status !== AssetStatus.TOKENIZED) {
          throw new Error(`Asset must be at least VERIFIED to receive valuation, currently: ${asset.status}`);
        }

        const id = args.id || `VAL-${Date.now()}`;
        const valuation = {
          id,
          assetId: args.assetId,
          amountPaise: args.amountPaise,
          currency: args.currency || 'INR',
          method: args.method,
          methodDetails: args.methodDetails || {},
          source: args.source,
          valuationDate: args.valuationDate,
          validUntil: args.validUntil,
          status: ValuationStatus.PROPOSED,
          proposedBy: caller.userId,
          createdAt: this._now(),
        };
        this.valuations.set(id, valuation);
        this._appendAudit(caller, 'VALUATION', id, 'NONE', ValuationStatus.PROPOSED, 'VALUATION_PROPOSED', `Proposed ₹${(args.amountPaise/100).toLocaleString()}`, txId);
        this._emit(EventName.VALUATION_PROPOSED, valuation, txId);
        result = valuation;
        break;
      }

      case 'approveValuation': {
        if (caller.role !== Role.COMPLIANCE && caller.role !== Role.ADMINISTRATOR) {
          throw new Error('Only Compliance or Administrator can approve valuation (Maker-Checker)');
        }
        const valuation = this.valuations.get(args.valuationId);
        if (!valuation) throw new Error(`Valuation not found: ${args.valuationId}`);
        if (valuation.proposedBy === caller.userId) {
          throw new Error('Maker-Checker violation: Valuation approver cannot be the same person who proposed it');
        }

        valuation.status = ValuationStatus.APPROVED;
        valuation.approvedBy = caller.userId;

        const asset = this.assets.get(valuation.assetId);
        if (asset && asset.status === AssetStatus.VERIFIED) {
          const prev = asset.status;
          asset.status = AssetStatus.VALUED;
          this._appendAudit(caller, 'ASSET', asset.id, prev, AssetStatus.VALUED, 'VALUATION_APPROVED', 'Asset successfully valued', txId);
        }

        this._appendAudit(caller, 'VALUATION', valuation.id, ValuationStatus.PROPOSED, ValuationStatus.APPROVED, 'VALUATION_APPROVED', 'Valuation confirmed', txId);
        this._emit(EventName.VALUATION_APPROVED, valuation, txId);
        result = valuation;
        break;
      }

      case 'mintToken': {
        if (caller.role !== Role.COMPLIANCE && caller.role !== Role.ADMINISTRATOR) {
          throw new Error('Only Compliance or Administrator can execute/approve token mint');
        }
        const asset = this.assets.get(args.assetId);
        if (!asset) throw new Error(`Asset not found: ${args.assetId}`);
        if (asset.status !== AssetStatus.VALUED) {
          throw new Error(`Asset must be in VALUED state before tokenization, currently ${asset.status}`);
        }

        const id = args.id || `TKN-${Date.now()}`;
        const token = {
          id,
          assetId: asset.id,
          standard: args.standard || TokenStandard.FRACTIONAL,
          totalUnits: args.totalUnits || 10000,
          unitLabel: args.unitLabel || 'UNITS',
          rightsType: args.rightsType || 'UNDIVIDED_FRACTION',
          representation: args.representation || 'Undivided economic interest in asset',
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

        this._appendAudit(caller, 'TOKEN', id, 'NONE', 'ACTIVE', 'TOKEN_MINTED', `Minted ${token.totalUnits} ${token.unitLabel}`, txId);
        this._appendAudit(caller, 'ASSET', asset.id, prev, AssetStatus.TOKENIZED, 'TOKEN_MINTED', `Asset tokenized into ${id}`, txId);
        this._emit(EventName.TOKEN_MINTED, token, txId);
        result = token;
        break;
      }

      case 'proposeTransfer': {
        const token = this.tokens.get(args.tokenId);
        if (!token) throw new Error(`Token not found: ${args.tokenId}`);
        const fromParticipantId = args.fromParticipantId || caller.participantId;
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
        this._appendAudit(caller, 'TRANSFER', id, 'NONE', TransferStatus.PROPOSED, 'TRANSFER_PROPOSED', `${args.units} units proposed to ${args.toParticipantId}`, txId);
        this._emit(EventName.TRANSFER_PROPOSED, transfer, txId);
        result = transfer;
        break;
      }

      case 'executeTransfer': {
        const transfer = this.transfers.get(args.transferId);
        if (!transfer) throw new Error(`Transfer not found: ${args.transferId}`);
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

        transfer.status = TransferStatus.EXECUTED;
        transfer.executedTxId = txId;
        this._appendAudit(caller, 'TRANSFER', transfer.id, TransferStatus.PROPOSED, TransferStatus.EXECUTED, 'TRANSFER_EXECUTED', 'Settled successfully', txId);
        this._emit(EventName.TRANSFER_EXECUTED, transfer, txId);
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
        this._appendAudit(caller, 'ASSET', asset.id, prev, AssetStatus.FROZEN, 'COMPLIANCE_HOLD', args.reasonText, txId);
        this._emit(EventName.ASSET_FROZEN, { assetId: asset.id, reason: args.reasonText }, txId);
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
        asset.status = asset.tokenId ? AssetStatus.TOKENIZED : AssetStatus.VALUED;
        if (asset.tokenId) {
          const t = this.tokens.get(asset.tokenId);
          if (t) t.status = 'ACTIVE';
        }
        this._appendAudit(caller, 'ASSET', asset.id, prev, asset.status, 'COMPLIANCE_RELEASE', args.reasonText, txId);
        this._emit(EventName.ASSET_UNFROZEN, { assetId: asset.id, reason: args.reasonText }, txId);
        result = asset;
        break;
      }

      case 'redeemAsset': {
        if (caller.role !== Role.COMPLIANCE && caller.role !== Role.ADMINISTRATOR) {
          throw new Error('Only Compliance or Administrator can approve redemption');
        }
        const asset = this.assets.get(args.assetId);
        if (!asset) throw new Error(`Asset not found: ${args.assetId}`);
        const prev = asset.status;
        asset.status = AssetStatus.REDEEMED;
        if (asset.tokenId) {
          const t = this.tokens.get(asset.tokenId);
          if (t) t.status = 'BURNED';
        }
        this._appendAudit(caller, 'ASSET', asset.id, prev, AssetStatus.REDEEMED, 'CONSOLIDATED_REDEMPTION', args.reasonText, txId);
        this._emit(EventName.ASSET_REDEEMED, { assetId: asset.id }, txId);
        result = asset;
        break;
      }

      case 'retireAsset': {
        if (caller.role !== Role.COMPLIANCE && caller.role !== Role.ADMINISTRATOR) {
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
        this._appendAudit(caller, 'ASSET', asset.id, prev, AssetStatus.RETIRED, args.reasonCode || 'SCRAPPED_OR_DESTROYED', args.reasonText, txId);
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
      case 'getAsset':
        return this.assets.get(args.id) || null;
      case 'listAssets':
        return Array.from(this.assets.values());
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
        const key = `${args.tokenId}:${args.participantId}`;
        return { units: this.balances.get(key) || 0 };
      }
      case 'listHolders': {
        const holders = [];
        for (const [key, units] of this.balances.entries()) {
          if (key.startsWith(`${args.tokenId}:`) && units > 0) {
            const [, participantId] = key.split(':');
            holders.push({ participantId, units });
          }
        }
        return holders;
      }
      case 'getTransfer':
        return this.transfers.get(args.id) || null;
      case 'listTransfers':
        return Array.from(this.transfers.values());
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
      default:
        throw new Error(`Unknown query function: ${fnName}`);
    }
  }

  _evaluateRules(transfer, token, asset) {
    const results = {};
    const rejectionReasons = [];

    // Rule: Self transfer prohibited
    if (transfer.fromParticipantId === transfer.toParticipantId) {
      rejectionReasons.push(TransferRuleReason.SELF_TRANSFER_PROHIBITED);
      results.SELF_TRANSFER = { passed: false };
    } else {
      results.SELF_TRANSFER = { passed: true };
    }

    // Rule: Asset transferable (not frozen)
    if (asset && (asset.status === AssetStatus.FROZEN || (token && token.status === 'FROZEN'))) {
      rejectionReasons.push(TransferRuleReason.ASSET_FROZEN);
      results.ASSET_TRANSFERABLE = { passed: false };
    } else {
      results.ASSET_TRANSFERABLE = { passed: true };
    }

    // Rule: Seller balance check
    const senderKey = `${token.id}:${transfer.fromParticipantId}`;
    const currentBal = this.balances.get(senderKey) || 0;
    if (currentBal < transfer.units) {
      rejectionReasons.push(TransferRuleReason.INSUFFICIENT_UNITS);
      results.SELLER_BALANCE = { passed: false, currentBal, required: transfer.units };
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
        results.MAX_HOLDING_CAP = { passed: false, futureBal, maxAllowed: maxUnitsAllowed };
      } else {
        results.MAX_HOLDING_CAP = { passed: true };
      }
    }

    return {
      passed: rejectionReasons.length === 0,
      results,
      rejectionReasons,
    };
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
}
