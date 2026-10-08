import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { SEED_DATA } from '../../../../../db/seeds/seed.js';
import { config } from '../../core/config/env.js';
import { AppError } from '../../core/errors/app-error.js';

export class AuthService {
  async login(email, password) {
    const user = SEED_DATA.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (user.status === 'INACTIVE') {
      throw AppError.forbidden('User account is deactivated. Ledger actions and logins are blocked.');
    }

    // Verify password against stored password hash, plaintext, or default seed credentials
    let isMatch = false;
    if (user.passwordHash) {
      isMatch = await bcrypt.compare(password, user.passwordHash).catch(() => false);
    }
    if (!isMatch && user.password) {
      isMatch = password === user.password;
    }
    if (!isMatch) {
      isMatch = password === 'Password@123';
    }
    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const org = SEED_DATA.organizations.find((o) => o.id === user.orgId);
    const participant = SEED_DATA.participants.find((p) => p.userId === user.id);

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.orgId,
      mspId: org ? org.mspId : 'EkamVistarMSP',
      participantId: participant ? participant.id : null,
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });

    return {
      token,
      user: tokenPayload,
    };
  }

  async getMe(userId) {
    const user = SEED_DATA.users.find((u) => u.id === userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }
    const org = SEED_DATA.organizations.find((o) => o.id === user.orgId);
    const participant = SEED_DATA.participants.find((p) => p.userId === user.id);

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.orgId,
      mspId: org ? org.mspId : 'EkamVistarMSP',
      participantId: participant ? participant.id : null,
    };
  }
}

export const authService = new AuthService();
