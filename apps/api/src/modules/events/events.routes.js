import { Router } from 'express';
import { chainBridge } from '../../core/chain/chain-bridge.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';

export const eventsRouter = Router();

/**
 * Server-Sent Events (SSE) Stream
 * Pushes live blockchain transactions, mints, transfers, and state transitions to clients
 */
eventsRouter.get('/stream', authenticate, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial connected ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  const onChainEvent = (event) => {
    res.write(`data: ${JSON.stringify({ type: 'CHAIN_EVENT', event })}\n\n`);
  };

  chainBridge.on('chainEvent', onChainEvent);

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    chainBridge.off('chainEvent', onChainEvent);
    res.end();
  });
});
