import { authService } from './auth.service.js';

export class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const result = await authService.getMe(req.user.userId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async verifyZkPassport(req, res, next) {
    try {
      const result = await authService.verifyZkPassport(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res) {
    res.json({ success: true, message: 'Logged out successfully' });
  }
}

export const authController = new AuthController();
