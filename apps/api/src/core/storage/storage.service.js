import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';

/**
 * Storage Service implementing AES-256-GCM Envelope Encryption
 * Computes exact SHA-256 for on-chain anchoring while encrypting payloads.
 */
export class StorageService {
  constructor() {
    this.masterKey = Buffer.from(config.encryptionMasterKey.slice(0, 64), 'hex');
    this.vaultDir = path.resolve(process.cwd(), 'vault_storage');
    if (!fs.existsSync(this.vaultDir)) {
      fs.mkdirSync(this.vaultDir, { recursive: true });
    }
  }

  /**
   * Encrypts and stores a document buffer
   * Returns { storageKey, sha256, encryptedDek, size }
   */
  async storeDocument(buffer, originalName, mimeType) {
    // 1. Compute plaintext SHA-256
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    // 2. Generate random 256-bit Data Encryption Key (DEK)
    const dek = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);

    // 3. Encrypt payload with DEK using AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
    const encryptedData = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // 4. Encrypt DEK with Master Key (Key Encryption Key)
    const dekIv = crypto.randomBytes(12);
    const dekCipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, dekIv);
    const encryptedDek = Buffer.concat([dekCipher.update(dek), dekCipher.final()]);
    const dekAuthTag = dekCipher.getAuthTag();

    // Bundle DEK metadata envelope
    const dekEnvelope = {
      dekIv: dekIv.toString('hex'),
      encryptedDek: encryptedDek.toString('hex'),
      dekAuthTag: dekAuthTag.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };

    const storageKey = `DOC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const filePath = path.join(this.vaultDir, `${storageKey}.bin`);
    fs.writeFileSync(filePath, encryptedData);
    const metaPath = path.join(this.vaultDir, `${storageKey}.meta.json`);
    fs.writeFileSync(
      metaPath,
      JSON.stringify({
        dekEnvelope,
        storageKey,
        sha256,
        size: buffer.length,
        mimeType,
        fileName: originalName,
      })
    );

    return {
      storageKey,
      sha256,
      encryptedDek: JSON.stringify(dekEnvelope),
      size: buffer.length,
      mimeType,
      fileName: originalName,
    };
  }

  /**
   * Retrieves and decrypts a stored document
   */
  async retrieveDocument(storageKey, encryptedDekJson) {
    const filePath = path.join(this.vaultDir, `${storageKey}.bin`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Document file not found for key: ${storageKey}`);
    }

    if (!encryptedDekJson) {
      const metaPath = path.join(this.vaultDir, `${storageKey}.meta.json`);
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        encryptedDekJson = JSON.stringify(meta.dekEnvelope);
      } else {
        throw new Error(`Envelope metadata not found for key: ${storageKey}`);
      }
    }

    const encryptedData = fs.readFileSync(filePath);
    const env = JSON.parse(encryptedDekJson);

    // 1. Decrypt DEK
    const dekDecipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, Buffer.from(env.dekIv, 'hex'));
    dekDecipher.setAuthTag(Buffer.from(env.dekAuthTag, 'hex'));
    const dek = Buffer.concat([dekDecipher.update(Buffer.from(env.encryptedDek, 'hex')), dekDecipher.final()]);

    // 2. Decrypt payload
    const decipher = crypto.createDecipheriv('aes-256-gcm', dek, Buffer.from(env.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(env.authTag, 'hex'));
    return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  }
}

export const storageService = new StorageService();
