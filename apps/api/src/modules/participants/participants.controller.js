import { participantsService } from './participants.service.js';

export class ParticipantsController {
  async list(req, res, next) {
    try {
      const data = await participantsService.listParticipants(req.user);
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
      const data = await participantsService.registerParticipant(req.user, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateKyc(req, res, next) {
    try {
      const { kycStatus, reason } = req.body;
      const data = await participantsService.updateKycStatus(req.user, req.params.id, kycStatus, reason);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const participantsController = new ParticipantsController();
