import { Router } from 'express';
import { identityAdminController } from './identity-admin.controller.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { requireRole } from '../../core/middleware/role.guard.js';
import { Role } from '@rwa/contracts';

export const identityAdminRouter = Router();

identityAdminRouter.use(authenticate);
identityAdminRouter.use(requireRole(Role.ADMINISTRATOR));

identityAdminRouter.get('/users', (req, res, next) => identityAdminController.listUsers(req, res, next));
identityAdminRouter.post('/users', (req, res, next) => identityAdminController.createUser(req, res, next));
identityAdminRouter.patch('/users/:id/status', (req, res, next) =>
  identityAdminController.updateUserStatus(req, res, next)
);

identityAdminRouter.get('/orgs', (req, res, next) => identityAdminController.listOrgs(req, res, next));
identityAdminRouter.post('/orgs', (req, res, next) => identityAdminController.createOrg(req, res, next));
