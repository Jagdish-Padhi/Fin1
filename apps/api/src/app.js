import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './core/config/env.js';
import { requestLogger } from './core/middleware/request-logger.js';
import { idempotency } from './core/middleware/idempotency.middleware.js';
import { globalRateLimiter } from './core/middleware/rate-limiter.js';
import { errorHandler } from './core/errors/error-handler.js';

// Modular routes
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { participantsRouter } from './modules/participants/participants.routes.js';
import { identityAdminRouter } from './modules/identity-admin/identity-admin.routes.js';
import { assetTypesRouter } from './modules/asset-types/asset-types.routes.js';
import { assetsRouter } from './modules/assets/assets.routes.js';
import { evidenceRouter } from './modules/evidence/evidence.routes.js';
import { verificationRouter } from './modules/verification/verification.routes.js';
import { registryOracleRouter } from './modules/registry-oracle/registry-oracle.routes.js';
import { valuationRouter } from './modules/valuation/valuation.routes.js';
import { tokensRouter } from './modules/tokens/tokens.routes.js';
import { transfersRouter } from './modules/transfers/transfers.routes.js';
import { lifecycleRouter } from './modules/lifecycle/lifecycle.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { eventsRouter } from './modules/events/events.routes.js';

export const app = express();

// Security and standard middlewares
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(globalRateLimiter);
app.use(requestLogger);
app.use(idempotency);

// Health check routes
app.use('/', healthRouter);

// Modular API v1 Routes
const v1 = express.Router();
v1.use('/auth', authRouter);
v1.use('/participants', participantsRouter);
v1.use('/identity-admin', identityAdminRouter);
v1.use('/asset-types', assetTypesRouter);
v1.use('/assets', assetsRouter);
v1.use('/evidence', evidenceRouter);
v1.use('/verification', verificationRouter);
v1.use('/verification', registryOracleRouter);
v1.use('/valuation', valuationRouter);
v1.use('/tokens', tokensRouter);
v1.use('/transfers', transfersRouter);
v1.use('/lifecycle', lifecycleRouter);
v1.use('/audit', auditRouter);
v1.use('/events', eventsRouter);

app.use(config.apiPrefix, v1);

// Global Error Handler
app.use(errorHandler);
