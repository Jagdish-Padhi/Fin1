import { Router } from 'express';
import multer from 'multer';
import { evidenceController } from './evidence.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireRole } from '../../core/middleware/role.guard.js';
import { Role } from '@rwa/contracts';

const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } }); // 25 MB max

export const evidenceRouter = Router();

evidenceRouter.use(authenticate);

evidenceRouter.post(
  '/upload',
  requireRole(Role.ISSUER),
  upload.single('file'),
  (req, res, next) => evidenceController.upload(req, res, next)
);
