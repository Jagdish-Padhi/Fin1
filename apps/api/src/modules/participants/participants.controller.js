import { participantsService } from './participants.service.js';
import {
  RegisterParticipantSchema,
  UpdateKycSchema,
  SetInvestorClassSchema,
  SetLimitsSchema,
  SuspendParticipantSchema,
  BlacklistParticipantSchema,
} from '@rwa/contracts';

export class ParticipantsController {
  async list(req, res, next) {
    try {
      const data = await participantsService.listParticipants(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async lookup(req, res, next) {
    try {
      const q = req.query.q || '';
      const data = await participantsService.lookupCounterparties(req.user, q);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await participantsService.getParticipant(req.user, req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Participant not found' });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async register(req, res, next) {
    try {
      const parsed = RegisterParticipantSchema.parse(req.body);
      const data = await participantsService.registerParticipant(req.user, parsed);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateKyc(req, res, next) {
    try {
      const parsed = UpdateKycSchema.parse(req.body);
      const data = await participantsService.updateKycStatus(
        req.user,
        req.params.id,
        parsed.kycStatus,
        parsed.reason,
        parsed.expiryDate
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async setInvestorClass(req, res, next) {
    try {
      const parsed = SetInvestorClassSchema.parse(req.body);
      const data = await participantsService.setInvestorClass(
        req.user,
        req.params.id,
        parsed.investorClass,
        parsed.reason
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async setLimits(req, res, next) {
    try {
      const parsed = SetLimitsSchema.parse(req.body);
      const data = await participantsService.setLimits(
        req.user,
        req.params.id,
        parsed.maxHoldingBps,
        parsed.maxTransferPaise,
        parsed.reason
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async suspend(req, res, next) {
    try {
      const parsed = SuspendParticipantSchema.parse(req.body);
      const data = await participantsService.suspendParticipant(req.user, req.params.id, parsed.reason);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async reinstate(req, res, next) {
    try {
      const reason = req.body.reason || 'Reinstated by governance authority';
      const data = await participantsService.reinstateParticipant(req.user, req.params.id, reason);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async addToBlacklist(req, res, next) {
    try {
      const parsed = BlacklistParticipantSchema.parse(req.body);
      const data = await participantsService.addToBlacklist(req.user, req.params.id, parsed.reason);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async removeFromBlacklist(req, res, next) {
    try {
      const reason = req.body.reason || 'Removed from blacklist following verification clearance';
      const data = await participantsService.removeFromBlacklist(req.user, req.params.id, reason);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async uploadKycDoc(req, res, next) {
    try {
      const doc = await participantsService.uploadKycDocument(req.user, req.params.id, req.body);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  }
}

export const participantsController = new ParticipantsController();
