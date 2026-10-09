import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { loginRateLimiter } from '../../core/middleware/rate-limiter.js';

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, (req, res, next) => authController.login(req, res, next));
authRouter.post('/register', loginRateLimiter, (req, res, next) => authController.register(req, res, next));
authRouter.post('/zkpassport/verify', (req, res, next) => authController.verifyZkPassport(req, res, next));
authRouter.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));
authRouter.post('/logout', authenticate, (req, res) => authController.logout(req, res));
