import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

function getEncryptionKey(): Buffer {
  const hexKey = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!hexKey) {
    // Default fallback for dev/test if not set
    return crypto.createHash('sha256').update('shipcheck-default-dev-secret-key-32').digest();
  }
  return Buffer.from(hexKey, 'hex');
}

export interface EncryptedPayload {
  iv: string; // hex
  tag: string; // hex
  data: string; // hex
}

/**
 * Encrypts sensitive credentials with AES-256-GCM.
 */
export function encryptCredentials(plainText: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  const payload: EncryptedPayload = {
    iv: iv.toString('hex'),
    tag: authTag.toString('hex'),
    data: encrypted,
  };

  return JSON.stringify(payload);
}

/**
 * Decrypts sensitive credentials with AES-256-GCM.
 */
export function decryptCredentials(cipherString: string): string {
  const key = getEncryptionKey();
  const payload: EncryptedPayload = JSON.parse(cipherString);

  const iv = Buffer.from(payload.iv, 'hex');
  const tag = Buffer.from(payload.tag, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(payload.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
