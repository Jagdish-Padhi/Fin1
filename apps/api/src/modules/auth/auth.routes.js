import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';

export const authRouter = Router();

authRouter.post('/login', (req, res, next) => authController.login(req, res, next));
authRouter.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));
authRouter.post('/logout', authenticate, (req, res) => authController.logout(req, res));
