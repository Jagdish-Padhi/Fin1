import { tokensService } from './tokens.service.js';

export class TokensController {
  async list(req, res, next) {
    try {
      const data = await tokensService.listTokens(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await tokensService.getToken(req.user, req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Token not found' });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getHolders(req, res, next) {
    try {
      const data = await tokensService.getHolders(req.user, req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async mint(req, res, next) {
    try {
      const data = await tokensService.mintToken(req.user, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getTrace(req, res, next) {
    try {
      const data = await tokensService.getTokenTrace(req.user, req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Token not found' });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async publicVerify(req, res, next) {
    try {
      const data = await tokensService.publicVerify(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Token passport not found' });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const tokensController = new TokensController();
