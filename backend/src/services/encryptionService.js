const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Decrypt data using AES-GCM
 * @param {string} ciphertext - Base64 encoded ciphertext
 * @param {string} key - Base64 encoded 256-bit key
 * @param {string} iv - Base64 encoded initialization vector
 * @returns {Promise<string>} Decrypted plaintext
 */
async function decrypt(ciphertext, key, iv) {
  try {
    // Decode base64 inputs
    const ciphertextBuffer = Buffer.from(ciphertext, 'base64');
    const keyBuffer = Buffer.from(key, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');

    // Validate key length (must be 256 bits = 32 bytes)
    if (keyBuffer.length !== 32) {
      throw new Error('Invalid key length. Expected 256-bit (32 bytes) key.');
    }

    // Validate IV length (recommended 12 bytes for GCM)
    if (ivBuffer.length !== 12) {
      throw new Error('Invalid IV length. Expected 12 bytes for AES-GCM.');
    }

    // For AES-GCM, the last 16 bytes of ciphertext are the authentication tag
    if (ciphertextBuffer.length < 16) {
      throw new Error('Invalid ciphertext length. Must include authentication tag.');
    }

    const authTagLength = 16;
    const encryptedData = ciphertextBuffer.slice(0, -authTagLength);
    const authTag = ciphertextBuffer.slice(-authTagLength);

    // Create decipher
    const decipher = crypto.createDecipherGCM('aes-256-gcm');
    decipher.setAuthTag(authTag);

    // Initialize with key and IV
    decipher.init(keyBuffer, ivBuffer);

    // Decrypt
    let decrypted = decipher.update(encryptedData, null, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;

  } catch (error) {
    logger.error('Decryption failed', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Validate encryption parameters
 * @param {string} ciphertext - Base64 encoded ciphertext
 * @param {string} key - Base64 encoded key
 * @param {string} iv - Base64 encoded IV
 * @returns {boolean} True if valid
 */
function validateEncryptionParams(ciphertext, key, iv) {
  try {
    // Check if all parameters are provided
    if (!ciphertext || !key || !iv) {
      return false;
    }

    // Check if all parameters are valid base64
    Buffer.from(ciphertext, 'base64');
    Buffer.from(key, 'base64');
    Buffer.from(iv, 'base64');

    // Check key length (32 bytes for AES-256)
    const keyBuffer = Buffer.from(key, 'base64');
    if (keyBuffer.length !== 32) {
      return false;
    }

    // Check IV length (12 bytes recommended for GCM)
    const ivBuffer = Buffer.from(iv, 'base64');
    if (ivBuffer.length !== 12) {
      return false;
    }

    // Check minimum ciphertext length (must include auth tag)
    const ciphertextBuffer = Buffer.from(ciphertext, 'base64');
    if (ciphertextBuffer.length < 16) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate secure random values for testing (not for production use)
 * @returns {Object} Object containing key and iv as base64 strings
 */
function generateTestKeys() {
  const key = crypto.randomBytes(32); // 256-bit key
  const iv = crypto.randomBytes(12);  // 96-bit IV for GCM

  return {
    key: key.toString('base64'),
    iv: iv.toString('base64')
  };
}

module.exports = {
  decrypt,
  validateEncryptionParams,
  generateTestKeys
};