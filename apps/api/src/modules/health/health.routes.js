import { Router } from 'express';
import { config } from '../../core/config/env.js';

export const healthRouter = Router();

healthRouter.get('/healthz', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'ekamvistar-rwa-api',
  });
});

healthRouter.get('/readyz', (req, res) => {
  res.json({
    ready: true,
    mode: config.chainGatewayMode,
    timestamp: new Date().toISOString(),
  });
});
