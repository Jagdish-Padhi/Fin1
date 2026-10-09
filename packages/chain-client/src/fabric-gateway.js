import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as grpc from '@grpc/grpc-js';
import { connect, signers } from '@hyperledger/fabric-gateway';
import { FUNCTION_MAP } from './fn-map.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');

const utf8Decoder = new TextDecoder();

export class FabricGateway {
  constructor(options = {}) {
    this.connectionProfilePath =
      options.connectionProfilePath ||
      process.env.FABRIC_CONNECTION ||
      path.join(REPO_ROOT, '.fabric', 'connection.json');

    this.identityMapPath =
      options.identityMapPath ||
      process.env.FABRIC_IDENTITY_MAP ||
      path.join(REPO_ROOT, '.fabric', 'identity-map.json');

    this.channelName = options.channelName || process.env.FABRIC_CHANNEL || 'rwa-channel';
    this.chaincodeName = options.chaincodeName || process.env.FABRIC_CHAINCODE || 'rwa';

    this.userGateways = new Map();
    this.subscribers = new Set();
    this.eventListening = false;

    // Graceful cleanup
    if (typeof process !== 'undefined') {
      process.on('SIGTERM', () => this.close());
      process.on('SIGINT', () => this.close());
    }
  }

  async _loadConfig() {
    if (!fs.existsSync(this.connectionProfilePath)) {
      throw new Error(
        `Fabric connection profile not found at: ${this.connectionProfilePath}. Ensure Fabric network is running and scripts/fabric/gen-connection.mjs has executed.`
      );
    }
    if (!fs.existsSync(this.identityMapPath)) {
      throw new Error(
        `Fabric identity map not found at: ${this.identityMapPath}. Ensure tools/identity/enroll.mjs has executed.`
      );
    }

    const connection = JSON.parse(
      fs.readFileSync(this.connectionProfilePath, 'utf8')
    );
    const identityMap = JSON.parse(
      fs.readFileSync(this.identityMapPath, 'utf8')
    );

    return { connection, identityMap };
  }

  async _getUserContext(caller) {
    const userId = caller?.userId || caller?.id;
    if (!userId) {
      throw new Error('Caller userId is required for Fabric transaction');
    }

    if (this.userGateways.has(userId)) {
      return this.userGateways.get(userId);
    }

    const { connection, identityMap } = await this._loadConfig();
    const idEntry = identityMap[userId];
    if (!idEntry) {
      throw new Error(`No enrolled Fabric identity found for user: ${userId}`);
    }

    const walletPath = path.isAbsolute(idEntry.wallet)
      ? idEntry.wallet
      : path.join(REPO_ROOT, idEntry.wallet);

    if (!fs.existsSync(walletPath)) {
      throw new Error(`Wallet file not found at: ${walletPath}`);
    }

    const wallet = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    const orgConfig = connection.organizations[idEntry.mspId];
    if (!orgConfig) {
      throw new Error(`MSP ${idEntry.mspId} not found in connection profile`);
    }

    const tlsCertPath = orgConfig.peer.tlsCaCertPath;
    if (!fs.existsSync(tlsCertPath)) {
      throw new Error(`Peer TLS CA cert not found at: ${tlsCertPath}`);
    }
    const tlsCert = fs.readFileSync(tlsCertPath);

    const client = new grpc.Client(
      orgConfig.peer.endpoint,
      grpc.credentials.createSsl(tlsCert),
      {
        'grpc.ssl_target_name_override': orgConfig.peer.hostAlias,
      }
    );

    const signer = signers.newPrivateKeySigner(
      crypto.createPrivateKey(wallet.privateKey)
    );

    const gateway = connect({
      client,
      identity: {
        mspId: wallet.mspId,
        credentials: Buffer.from(wallet.certificate),
      },
      signer,
    });

    const network = gateway.getNetwork(this.channelName);
    const userCtx = {
      gateway,
      client,
      network,
      contracts: new Map(),
    };

    this.userGateways.set(userId, userCtx);

    // If subscribers exist and event stream isn't listening yet, start it with this user network
    if (this.subscribers.size > 0 && !this.eventListening) {
      this._startEventListener(network);
    }

    return userCtx;
  }

  _getContract(userCtx, contractName) {
    if (!userCtx.contracts.has(contractName)) {
      userCtx.contracts.set(
        contractName,
        userCtx.network.getContract(this.chaincodeName, contractName)
      );
    }
    return userCtx.contracts.get(contractName);
  }

  _mapError(err) {
    const msg = err.message || String(err);

    // Handle Unauthorized / Segregation of Duties -> 403
    if (msg.includes('Unauthorized') || msg.includes('Segregation of Duties') || msg.includes('Permission denied')) {
      const e = new Error(msg);
      e.statusCode = 403;
      return e;
    }

    // Handle not found -> 404
    if (msg.includes('not found') || msg.includes('Not found')) {
      const e = new Error(msg);
      e.statusCode = 404;
      return e;
    }

    // Handle already exists / duplicates -> 409 (must match error-handler.js)
    if (
      msg.includes('already exists') ||
      msg.includes('Already exists') ||
      msg.includes('Duplicate') ||
      msg.includes('already registered') ||
      msg.includes('already attached') ||
      msg.includes('already pending') ||
      msg.includes('already tokenized') ||
      msg.includes('already decided') ||
      msg.includes('already frozen') ||
      msg.includes('already redeemed') ||
      msg.includes('already retired') ||
      msg.includes('already suspended') ||
      msg.includes('already BLACKLISTED') ||
      msg.includes('Only PROPOSED valuations')
    ) {
      const e = new Error(msg);
      e.statusCode = 409;
      return e;
    }

    const e = new Error(msg);
    e.statusCode = 400;
    return e;
  }

  async submit(caller, fnName, args = {}, opts = {}) {
    const mapping = FUNCTION_MAP[fnName];
    if (!mapping) {
      throw new Error(`Unknown chaincode function: ${fnName}`);
    }

    const userCtx = await this._getUserContext(caller);
    const contract = this._getContract(userCtx, mapping.contract);
    const callArgs = mapping.args(args);

    let lastError = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const proposal = contract.newProposal(fnName, {
          arguments: callArgs,
        });
        const transaction = await proposal.endorse();
        const commit = await transaction.submit();
        const status = await commit.getStatus();

        if (!status.successful) {
          throw new Error(
            `Fabric transaction ${fnName} failed with code: ${status.code}`
          );
        }

        const resultBytes = transaction.getResult();
        const text = utf8Decoder.decode(resultBytes);
        let parsed = text;
        try {
          parsed = text ? JSON.parse(text) : {};
        } catch {
          parsed = text;
        }

        return {
          status: 'COMMITTED',
          txId: proposal.getTransactionId(),
          blockNumber: Number(status.blockNumber),
          result: parsed,
          committedAt: new Date().toISOString(),
        };
      } catch (err) {
        lastError = err;
        if (
          err.message &&
          err.message.includes('MVCC_READ_CONFLICT') &&
          attempt < maxRetries
        ) {
          await new Promise((r) => setTimeout(r, 100 * attempt));
          continue;
        }
        throw this._mapError(err);
      }
    }

    throw this._mapError(lastError);
  }

  async evaluate(caller, fnName, args = {}) {
    const mapping = FUNCTION_MAP[fnName];
    if (!mapping) {
      throw new Error(`Unknown chaincode function: ${fnName}`);
    }

    const userCtx = await this._getUserContext(caller);
    const contract = this._getContract(userCtx, mapping.contract);
    const callArgs = mapping.args(args);

    try {
      const resultBytes = await contract.evaluateTransaction(
        fnName,
        ...callArgs
      );
      const text = utf8Decoder.decode(resultBytes);
      if (!text || text.trim() === '') return null;
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } catch (err) {
      throw this._mapError(err);
    }
  }

  async _startEventListener(network) {
    if (this.eventListening) return;
    this.eventListening = true;

    try {
      const events = await network.getChaincodeEvents(this.chaincodeName);
      (async () => {
        try {
          for await (const event of events) {
            const rawPayload = utf8Decoder.decode(event.payload);
            let payload = {};
            try {
              payload = JSON.parse(rawPayload);
            } catch {
              payload = rawPayload;
            }

            // Unpack TxEvents batch if emitted via EventAggregator
            if (event.eventName === 'TxEvents' && Array.isArray(payload.events)) {
              for (const inner of payload.events) {
                const normalized = {
                  type: inner.name,
                  data: inner.payload,
                  txId: event.transactionId,
                  blockNumber: Number(event.blockNumber),
                  timestamp: new Date().toISOString(),
                };
                for (const cb of this.subscribers) {
                  try {
                    cb(normalized);
                  } catch (e) {
                    console.error('Subscriber callback error:', e);
                  }
                }
              }
            } else {
              const normalized = {
                type: event.eventName,
                data: payload,
                txId: event.transactionId,
                blockNumber: Number(event.blockNumber),
                timestamp: new Date().toISOString(),
              };
              for (const cb of this.subscribers) {
                try {
                  cb(normalized);
                } catch (e) {
                  console.error('Subscriber callback error:', e);
                }
              }
            }
          }
        } catch (streamErr) {
          console.warn('Chaincode event stream disconnected:', streamErr.message);
          this.eventListening = false;
        }
      })();
    } catch (err) {
      console.warn('Failed to initialize chaincode event listener:', err.message);
      this.eventListening = false;
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  close() {
    for (const [, userCtx] of this.userGateways) {
      try {
        userCtx.gateway.close();
        userCtx.client.close();
      } catch {}
    }
    this.userGateways.clear();
  }
}
