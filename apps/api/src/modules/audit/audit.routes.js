import { Router } from 'express';
import { auditController } from './audit.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';

export const auditRouter = Router();

auditRouter.use(authenticate);

auditRouter.get('/trail', (req, res, next) => auditController.getTrail(req, res, next));
auditRouter.get('/explorer', (req, res, next) => auditController.getExplorer(req, res, next));
