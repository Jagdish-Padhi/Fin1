import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load repo-root .env explicitly so `pnpm dev:all` (cwd=apps/api) gets
// the same live Fabric config as running node from the repo root.
// dotenv never overrides already-set vars, so real env keeps precedence.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });
dotenv.config();

const DEFAULT_JWT_SECRET = 'super_secret_jwt_signing_key_rwa_platform_2026_ekamvistar';
const DEFAULT_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
const encryptionMasterKey = process.env.ENCRYPTION_MASTER_KEY || DEFAULT_ENCRYPTION_KEY;

if (nodeEnv === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET) {
    throw new Error('SECURITY VIOLATION: JWT_SECRET must be set to a secure unique secret in production');
  }
  if (!process.env.ENCRYPTION_MASTER_KEY || process.env.ENCRYPTION_MASTER_KEY === DEFAULT_ENCRYPTION_KEY) {
    throw new Error('SECURITY VIOLATION: ENCRYPTION_MASTER_KEY must be set to a secure unique 32-byte hex key in production');
  }
} else if (nodeEnv !== 'test') {
  if (jwtSecret === DEFAULT_JWT_SECRET || encryptionMasterKey === DEFAULT_ENCRYPTION_KEY) {
    console.warn('[SECURITY WARNING] Running with default development secrets. Set JWT_SECRET and ENCRYPTION_MASTER_KEY before deploying to production.');
  }
}

export const config = {
  nodeEnv,
  port: parseInt(process.env.PORT || '5000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  chainGatewayMode: process.env.CHAIN_GATEWAY_MODE || 'mock',
  encryptionMasterKey,
  registryProviders: {
    VAHAN: {
      url: process.env.REGISTRY_VAHAN_URL || '',
      key: process.env.REGISTRY_VAHAN_KEY || '',
    },
    BHOOMI_RTC: {
      url: process.env.REGISTRY_BHOOMI_RTC_URL || '',
      key: process.env.REGISTRY_BHOOMI_RTC_KEY || '',
    },
    GST_EINVOICE: {
      url: process.env.REGISTRY_GST_EINVOICE_URL || '',
      key: process.env.REGISTRY_GST_EINVOICE_KEY || '',
    },
  },
};
