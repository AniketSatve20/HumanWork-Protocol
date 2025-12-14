import CryptoJS from 'crypto-js';
import { config } from '../config/index.js';
import { logger } from './logger.js';

// ============ Configuration ============

const ENCRYPTION_KEY = config.encryption.key;

// Validate key length (32 bytes for AES-256)
if (ENCRYPTION_KEY.length !== 32) {
  logger.warn(`⚠️ Encryption key should be 32 characters for AES-256. Current: ${ENCRYPTION_KEY.length}`);
}

// ============ Core Encryption Functions ============

/**
 * Encrypt a string using AES-256
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;
  
  try {
    // Generate random IV
    const iv = CryptoJS.lib.WordArray.random(16);
    
    // Encrypt
    const encrypted = CryptoJS.AES.encrypt(plaintext, CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY), {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    // Combine IV + ciphertext for storage
    const combined = iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.toString();
    return combined;
  } catch (error) {
    logger.error('Encryption failed:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt a string encrypted with AES-256
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext || !ciphertext.includes(':')) return ciphertext;
  
  try {
    // Split IV and ciphertext
    const [ivHex, encryptedText] = ciphertext.split(':');
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    
    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(encryptedText, CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY), {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    logger.error('Decryption failed:', error);
    throw new Error('Decryption failed');
  }
}

/**
 * Encrypt an object's specified fields
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  const result = { ...obj };
  
  for (const field of fieldsToEncrypt) {
    if (result[field] !== undefined && result[field] !== null) {
      if (typeof result[field] === 'string') {
        (result[field] as any) = encrypt(result[field] as string);
      } else if (typeof result[field] === 'object') {
        // Encrypt stringified JSON for complex objects
        (result[field] as any) = encrypt(JSON.stringify(result[field]));
      }
    }
  }
  
  return result;
}

/**
 * Decrypt an object's specified fields
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToDecrypt: (keyof T)[],
  parseJson: boolean = false
): T {
  const result = { ...obj };
  
  for (const field of fieldsToDecrypt) {
    if (result[field] !== undefined && result[field] !== null && typeof result[field] === 'string') {
      try {
        const decrypted = decrypt(result[field] as string);
        if (parseJson) {
          try {
            (result[field] as any) = JSON.parse(decrypted);
          } catch {
            (result[field] as any) = decrypted;
          }
        } else {
          (result[field] as any) = decrypted;
        }
      } catch {
        // Field might not be encrypted, keep original
      }
    }
  }
  
  return result;
}

/**
 * Hash sensitive data for searching (one-way)
 */
export function hashForSearch(value: string): string {
  return CryptoJS.SHA256(value + ENCRYPTION_KEY).toString(CryptoJS.enc.Hex);
}

/**
 * Check if a value matches a hash
 */
export function verifyHash(value: string, hash: string): boolean {
  return hashForSearch(value) === hash;
}

// ============ Mongoose Plugin ============

export interface EncryptionPluginOptions {
  fields: string[];
  exclude?: string[];
}

export function encryptionPlugin(schema: any, options: EncryptionPluginOptions) {
  const { fields, exclude = [] } = options;
  
  // Encrypt before save
  schema.pre('save', function(this: any, next: () => void) {
    for (const field of fields) {
      if (exclude.includes(field)) continue;
      
      if (this[field] !== undefined && this[field] !== null) {
        // Check if already encrypted (contains ':' separator)
        if (typeof this[field] === 'string' && !this[field].includes(':')) {
          this[field] = encrypt(this[field]);
        } else if (typeof this[field] === 'object') {
          this[field] = encrypt(JSON.stringify(this[field]));
        }
      }
    }
    next();
  });
  
  // Decrypt after find
  const decryptDoc = (doc: any) => {
    if (!doc) return doc;
    
    for (const field of fields) {
      if (exclude.includes(field)) continue;
      
      if (doc[field] && typeof doc[field] === 'string' && doc[field].includes(':')) {
        try {
          const decrypted = decrypt(doc[field]);
          // Try to parse as JSON
          try {
            doc[field] = JSON.parse(decrypted);
          } catch {
            doc[field] = decrypted;
          }
        } catch {
          // Keep original if decryption fails
        }
      }
    }
    
    return doc;
  };
  
  // Apply to various query types
  schema.post('find', function(docs: any[]) {
    return docs.map(decryptDoc);
  });
  
  schema.post('findOne', decryptDoc);
  schema.post('findById', decryptDoc);
}

// ============ Sensitive Field Detection ============

const SENSITIVE_PATTERNS = [
  /ssn/i,
  /social.?security/i,
  /tax.?id/i,
  /passport/i,
  /driver.?license/i,
  /bank.?account/i,
  /credit.?card/i,
  /cvv/i,
  /pin/i,
  /national.?id/i,
  /aadhaar/i,
  /pan.?card/i,
  /gst.?number/i,
  /medical/i,
  /health/i,
  /diagnosis/i,
  /prescription/i,
];

export function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(fieldName));
}

export function detectSensitiveFields(schema: Record<string, any>): string[] {
  const sensitiveFields: string[] = [];
  
  for (const [key, value] of Object.entries(schema)) {
    if (isSensitiveField(key)) {
      sensitiveFields.push(key);
    }
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nested = detectSensitiveFields(value);
      sensitiveFields.push(...nested.map(n => `${key}.${n}`));
    }
  }
  
  return sensitiveFields;
}

export default {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  hashForSearch,
  verifyHash,
  encryptionPlugin,
  isSensitiveField,
  detectSensitiveFields,
};
