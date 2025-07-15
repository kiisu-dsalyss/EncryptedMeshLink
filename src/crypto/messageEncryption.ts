/**
 * Message Encryption Functions
 * Handles encryption/decryption of P2P messages using hybrid RSA+AES encryption
 */

import { createCipheriv, createDecipheriv, randomBytes, publicEncrypt, privateDecrypt } from 'crypto';
import { CryptoConfig } from './types';

export async function encryptMessage(
  message: string, 
  recipientPublicKey: string,
  config: Required<CryptoConfig>
): Promise<string> {
  try {
    // Generate random AES key and IV
    const aesKey = randomBytes(config.aesKeyLength);
    const iv = randomBytes(config.ivLength);

    // Encrypt message with AES-256-GCM
    const cipher = createCipheriv('aes-256-gcm', aesKey, iv);

    let encryptedMessage = cipher.update(message, 'utf8', 'base64');
    encryptedMessage += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Encrypt AES key with recipient's RSA public key
    const encryptedAESKey = publicEncrypt({
      key: recipientPublicKey,
      padding: 4 // RSA_PKCS1_OAEP_PADDING
    }, aesKey);

    // Combine all components
    const payload = {
      encryptedAESKey: encryptedAESKey.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      encryptedMessage: encryptedMessage
    };

    return JSON.stringify(payload);
  } catch (error) {
    throw new Error(`Message encryption failed: ${error}`);
  }
}

export async function decryptMessage(
  encryptedPayload: string, 
  privateKey: string,
  config: Required<CryptoConfig>
): Promise<string> {
  try {
    const payload = JSON.parse(encryptedPayload);

    // Decrypt AES key with our RSA private key
    const aesKey = privateDecrypt({
      key: privateKey,
      padding: 4 // RSA_PKCS1_OAEP_PADDING
    }, Buffer.from(payload.encryptedAESKey, 'base64'));

    // Decrypt message with AES
    const decipher = createDecipheriv('aes-256-gcm', aesKey, Buffer.from(payload.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));

    let decrypted = decipher.update(payload.encryptedMessage, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Message decryption failed: ${error}`);
  }
}
