import { app } from './app.js';
import { config } from './core/config/env.js';

const server = app.listen(config.port, () => {
  console.log(`======================================================================`);
  console.log(`🚀 EkamVistar RWA Tokenization API listening on port ${config.port}`);
  console.log(`📡 Base API URL: http://localhost:${config.port}${config.apiPrefix}`);
  console.log(`🔗 Blockchain Mode: ${config.chainGatewayMode.toUpperCase()}`);
  console.log(`🛡️  Health check: http://localhost:${config.port}/healthz`);
  console.log(`======================================================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
