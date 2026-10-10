import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Same repo-root .env anchoring as the API (see apps/api/src/core/config/env.js)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { BlockIndexer } from './indexer/block-indexer.js';
import { CommandSubmitter } from './command-submitter/command-submitter.js';
import { Reconciler } from './reconciler/reconciler.js';

console.log('======================================================================');
console.log('🛠️  EkamVistar RWA Worker Service Starting (Foundation Phase 0)');
console.log('======================================================================');

const indexer = new BlockIndexer();
const submitter = new CommandSubmitter();
const reconciler = new Reconciler();

indexer.start();
submitter.start();

// Schedule periodic reconciliation check every 60s
setInterval(() => {
  reconciler.runAuditReconciliation();
}, 60000);

process.on('SIGTERM', () => {
  console.log('Worker shutting down gracefully...');
  submitter.stop();
  process.exit(0);
});
