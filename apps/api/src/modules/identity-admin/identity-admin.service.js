import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { SEED_DATA } from '../../../../../db/seeds/seed.js';
import { AppError } from '../../core/errors/app-error.js';
import { Role } from '@rwa/contracts';

// In-memory extension of users & orgs for dev/mock runtime
const usersStore = [...SEED_DATA.users.map((u) => ({ ...u, status: u.status || 'ACTIVE' }))];
const orgsStore = [...SEED_DATA.organizations];

// Org to allowed roles mapping (MSP alignment)
const ORG_ROLE_MAP = {
  'ORG-ADMIN': [Role.ADMINISTRATOR],
  'ORG-ISSUER': [Role.ISSUER],
  'ORG-VERIFIER': [Role.VERIFIER, Role.VALUER],
  'ORG-COMPLIANCE': [Role.COMPLIANCE],
  'ORG-INVESTOR': [Role.INVESTOR],
  'ORG-AUDITOR': [Role.AUDITOR],
};

export class IdentityAdminService {
  async listUsers() {
    return usersStore.map((u) => {
      const org = orgsStore.find((o) => o.id === u.orgId);
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        orgId: u.orgId,
        orgName: org?.name || u.orgId,
        mspId: org?.mspId || 'EkamVistarMSP',
        status: u.status || 'ACTIVE',
        fabricIdentity: {
          enrollmentId: u.email.split('@')[0],
          mspId: org?.mspId || 'EkamVistarMSP',
          role: u.role,
          status: 'ENROLLED',
        },
      };
    });
  }

  async listOrgs() {
    return orgsStore;
  }

  async createUser(adminUser, data) {
    if (adminUser.role !== Role.ADMINISTRATOR) {
      throw AppError.forbidden('Only Administrator can onboard users');
    }

    const org = orgsStore.find((o) => o.id === data.orgId);
    if (!org) {
      throw AppError.badRequest(`Organization not found: ${data.orgId}`);
    }

    // Edge case check: participant belongs to wrong org for requested role
    const allowedRoles = ORG_ROLE_MAP[org.id] || [];
    if (allowedRoles.length > 0 && !allowedRoles.includes(data.role)) {
      throw AppError.badRequest(
        `Role mismatch: Role '${data.role}' is not allowed in organization '${org.name}'. Allowed roles: ${allowedRoles.join(', ')}`
      );
    }

    const existing = usersStore.find((u) => u.email.toLowerCase() === data.email.toLowerCase());
    if (existing) {
      throw AppError.conflict(`User with email '${data.email}' already exists`);
    }

    const id = `USR-${Date.now()}`;
    const password = data.password || 'Password@123';
    let passwordHash;
    try {
      passwordHash = await bcrypt.hash(password, 10);
    } catch {
      passwordHash = undefined;
    }

    const newUser = {
      id,
      orgId: data.orgId,
      email: data.email.toLowerCase(),
      name: data.name,
      role: data.role,
      status: 'ACTIVE',
      password,
      passwordHash,
      // Auto-issued Fabric Certificate & Enrollment Identity
      fabricIdentity: {
        enrollmentId: data.email.split('@')[0],
        mspId: org.mspId,
        role: data.role,
        certSerial: `CERT-${Date.now()}`,
        status: 'ENROLLED',
        issuedAt: new Date().toISOString(),
      },
    };

    usersStore.push(newUser);
    // Also update SEED_DATA in case other modules query it
    SEED_DATA.users.push(newUser);

    return newUser;
  }

  async updateUserStatus(adminUser, userId, status, reason) {
    if (adminUser.role !== Role.ADMINISTRATOR) {
      throw AppError.forbidden('Only Administrator can change user activation status');
    }

    const user = usersStore.find((u) => u.id === userId);
    if (!user) {
      throw AppError.notFound(`User not found: ${userId}`);
    }

    // Administrator cannot deactivate their own active session
    if (user.id === adminUser.userId && status === 'INACTIVE') {
      throw AppError.badRequest('Administrators cannot deactivate their own account');
    }

    user.status = status;
    user.deactivatedReason = status === 'INACTIVE' ? reason || 'Deactivated by Platform Administrator' : undefined;

    // Update in SEED_DATA
    const seedUser = SEED_DATA.users.find((u) => u.id === userId);
    if (seedUser) {
      seedUser.status = status;
    }

    return user;
  }

  async createOrg(adminUser, data) {
    if (adminUser.role !== Role.ADMINISTRATOR) {
      throw AppError.forbidden('Only Administrator can create organizations');
    }

    const existing = orgsStore.find((o) => o.id === data.id || o.mspId === data.mspId);
    if (existing) {
      throw AppError.conflict(`Organization with ID or MSP ID already exists`);
    }

    const newOrg = {
      id: data.id,
      mspId: data.mspId,
      name: data.name,
    };

    orgsStore.push(newOrg);
    SEED_DATA.organizations.push(newOrg);
    return newOrg;
  }

  isUserActive(userId) {
    const user = usersStore.find((u) => u.id === userId);
    return !user || user.status !== 'INACTIVE';
  }
}

export const identityAdminService = new IdentityAdminService();
