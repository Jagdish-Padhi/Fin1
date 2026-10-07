import { identityAdminService } from './identity-admin.service.js';
import { AdminCreateUserSchema, AdminCreateOrgSchema } from '@rwa/contracts';

export class IdentityAdminController {
  async listUsers(req, res, next) {
    try {
      const data = await identityAdminService.listUsers();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async listOrgs(req, res, next) {
    try {
      const data = await identityAdminService.listOrgs();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createUser(req, res, next) {
    try {
      const parsed = AdminCreateUserSchema.parse(req.body);
      const data = await identityAdminService.createUser(req.user, parsed);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateUserStatus(req, res, next) {
    try {
      const { status, reason } = req.body;
      const data = await identityAdminService.updateUserStatus(req.user, req.params.id, status, reason);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createOrg(req, res, next) {
    try {
      const parsed = AdminCreateOrgSchema.parse(req.body);
      const data = await identityAdminService.createOrg(req.user, parsed);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const identityAdminController = new IdentityAdminController();
