/**
 * Tests for Cryptography Module
 * MIB-003: Cryptography Module Tests
 */

import { CryptoService, ContactInfo } from '../src/crypto';
import { KeyManager } from '../src/config/keyManager';
import { findAvailablePort } from './testUtils';

describe('CryptoService', () => {
  let cryptoService: CryptoService;
  let testKeyPair: { publicKey: string; privateKey: string; fingerprint: string };
  let testContactInfo: ContactInfo;

  beforeAll(async () => {
    cryptoService = new CryptoService();
    testKeyPair = await KeyManager.generateKeyPair();
    const availablePort = await findAvailablePort();
    testContactInfo = {
      stationId: 'test-station-001',
      ipAddress: '192.168.1.100',
      port: availablePort,
      publicKey: testKeyPair.publicKey,
      lastSeen: Date.now(),
      capabilities: ['relay', 'bridge']
    };
  });

  describe('Contact Info Encryption/Decryption', () => {
    it('should encrypt and decrypt contact info correctly', async () => {
      const discoveryKey = 'test-discovery-key-12345';
      
      const encrypted = await cryptoService.encryptContactInfo(testContactInfo, discoveryKey);
      expect(encrypted).toBeTruthy();
      expect(typeof encrypted).toBe('string');
      
      const decrypted = await cryptoService.decryptContactInfo(encrypted, discoveryKey);
      expect(decrypted).toEqual(testContactInfo);
    });

    it('should fail decryption with wrong discovery key', async () => {
      const discoveryKey = 'correct-key';
      const wrongKey = 'wrong-key';
      
      const encrypted = await cryptoService.encryptContactInfo(testContactInfo, discoveryKey);
      
      await expect(
        cryptoService.decryptContactInfo(encrypted, wrongKey)
      ).rejects.toThrow('Contact info decryption failed');
    });

    it('should handle corrupted encrypted data', async () => {
      const discoveryKey = 'test-key';
      const corruptedData = 'invalid-base64-data!!!';
      
      await expect(
        cryptoService.decryptContactInfo(corruptedData, discoveryKey)
      ).rejects.toThrow('Contact info decryption failed');
    });
  });

  describe('Message Encryption/Decryption', () => {
    it('should encrypt and decrypt messages correctly', async () => {
      const message = 'Hello from test station! This is a test message.';
      
      const encrypted = await cryptoService.encryptMessage(message, testKeyPair.publicKey);
      expect(encrypted).toBeTruthy();
      expect(typeof encrypted).toBe('string');
      
      const decrypted = await cryptoService.decryptMessage(encrypted, testKeyPair.privateKey);
      expect(decrypted).toBe(message);
    });

    it('should handle large messages', async () => {
      const largeMessage = 'A'.repeat(10000); // 10KB message
      
      const encrypted = await cryptoService.encryptMessage(largeMessage, testKeyPair.publicKey);
      const decrypted = await cryptoService.decryptMessage(encrypted, testKeyPair.privateKey);
      
      expect(decrypted).toBe(largeMessage);
    });

    it('should fail decryption with wrong private key', async () => {
      const message = 'Test message';
      const wrongKeyPair = await KeyManager.generateKeyPair();
      
      const encrypted = await cryptoService.encryptMessage(message, testKeyPair.publicKey);
      
      await expect(
        cryptoService.decryptMessage(encrypted, wrongKeyPair.privateKey)
      ).rejects.toThrow('Message decryption failed');
    });

    it('should handle corrupted encrypted message', async () => {
      const corruptedPayload = '{"invalid": "json structure"}';
      
      await expect(
        cryptoService.decryptMessage(corruptedPayload, testKeyPair.privateKey)
      ).rejects.toThrow('Message decryption failed');
    });
  });

  describe('Key Derivation', () => {
    it('should derive consistent discovery keys', async () => {
      const masterSecret = 'my-super-secret-master-key';
      const networkName = 'test-network';
      
      const key1 = await cryptoService.deriveDiscoveryKey(masterSecret, networkName);
      const key2 = await cryptoService.deriveDiscoveryKey(masterSecret, networkName);
      
      expect(key1).toBe(key2);
      expect(key1).toMatch(/^[a-f0-9]{64}$/); // 64 hex chars = 256 bits
    });

    it('should derive different keys for different networks', async () => {
      const masterSecret = 'my-super-secret-master-key';
      
      const key1 = await cryptoService.deriveDiscoveryKey(masterSecret, 'network-1');
      const key2 = await cryptoService.deriveDiscoveryKey(masterSecret, 'network-2');
      
      expect(key1).not.toBe(key2);
    });

    it('should derive different keys for different secrets', async () => {
      const networkName = 'test-network';
      
      const key1 = await cryptoService.deriveDiscoveryKey('secret-1', networkName);
      const key2 = await cryptoService.deriveDiscoveryKey('secret-2', networkName);
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('Utility Functions', () => {
    it('should generate random keys of correct length', () => {
      const key16 = cryptoService.generateRandomKey(16);
      const key32 = cryptoService.generateRandomKey(32);
      
      expect(key16).toMatch(/^[a-f0-9]{32}$/); // 32 hex chars = 16 bytes
      expect(key32).toMatch(/^[a-f0-9]{64}$/); // 64 hex chars = 32 bytes
      
      // Keys should be different
      expect(cryptoService.generateRandomKey()).not.toBe(cryptoService.generateRandomKey());
    });

    it('should create and verify HMAC signatures', () => {
      const message = 'Test message for HMAC';
      const key = 'test-hmac-key';
      
      const signature = cryptoService.createHMACSignature(message, key);
      expect(signature).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
      
      expect(cryptoService.verifyHMACSignature(message, signature, key)).toBe(true);
      expect(cryptoService.verifyHMACSignature(message, signature, 'wrong-key')).toBe(false);
      expect(cryptoService.verifyHMACSignature('wrong-message', signature, key)).toBe(false);
    });

    it('should create message hashes', () => {
      const message = 'Test message for hashing';
      
      const hash1 = cryptoService.createMessageHash(message);
      const hash2 = cryptoService.createMessageHash(message);
      const hash3 = cryptoService.createMessageHash('Different message');
      
      expect(hash1).toBe(hash2); // Same message = same hash
      expect(hash1).not.toBe(hash3); // Different message = different hash
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it('should validate message freshness', () => {
      const now = Date.now();
      const oneMinuteAgo = now - (60 * 1000);
      const tenMinutesAgo = now - (10 * 60 * 1000);
      const futureTime = now + (60 * 1000);
      
      // Fresh messages
      expect(cryptoService.validateMessageFreshness(now)).toBe(true);
      expect(cryptoService.validateMessageFreshness(oneMinuteAgo)).toBe(true);
      
      // Stale message (default 5 min timeout)
      expect(cryptoService.validateMessageFreshness(tenMinutesAgo)).toBe(false);
      
      // Future message (invalid)
      expect(cryptoService.validateMessageFreshness(futureTime)).toBe(false);
      
      // Custom timeout
      expect(cryptoService.validateMessageFreshness(tenMinutesAgo, 15 * 60 * 1000)).toBe(true);
    });

    it('should generate unique message IDs', () => {
      const id1 = cryptoService.generateMessageId();
      const id2 = cryptoService.generateMessageId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[a-z0-9]+-[a-f0-9]{16}$/); // timestamp-random format
      expect(id2).toMatch(/^[a-z0-9]+-[a-f0-9]{16}$/);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid public keys gracefully', async () => {
      const message = 'Test message';
      const invalidKey = 'not-a-valid-pem-key';
      
      await expect(
        cryptoService.encryptMessage(message, invalidKey)
      ).rejects.toThrow('Message encryption failed');
    });

    it('should handle invalid private keys gracefully', async () => {
      const message = 'Test message';
      const encrypted = await cryptoService.encryptMessage(message, testKeyPair.publicKey);
      const invalidKey = 'not-a-valid-pem-key';
      
      await expect(
        cryptoService.decryptMessage(encrypted, invalidKey)
      ).rejects.toThrow('Message decryption failed');
    });

    it('should handle invalid discovery key derivation parameters', async () => {
      // Test with null/undefined parameters - these should actually fail
      await expect(
        cryptoService.deriveDiscoveryKey(null as any, 'network')
      ).rejects.toThrow('Discovery key derivation failed');
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with discovery service workflow', async () => {
      // Simulate complete discovery workflow
      const masterSecret = 'network-master-secret';
      const networkName = 'test-mesh-network';
      
      // Derive discovery key
      const discoveryKey = await cryptoService.deriveDiscoveryKey(masterSecret, networkName);
      
      // Encrypt contact info for discovery service
      const encrypted = await cryptoService.encryptContactInfo(testContactInfo, discoveryKey);
      
      // Decrypt contact info (simulating discovery service response)
      const decrypted = await cryptoService.decryptContactInfo(encrypted, discoveryKey);
      
      expect(decrypted).toEqual(testContactInfo);
    });

    it('should work end-to-end with P2P message workflow', async () => {
      // Generate two stations
      const station1Keys = await KeyManager.generateKeyPair();
      const station2Keys = await KeyManager.generateKeyPair();
      
      const message = 'Hello from Station 1 to Station 2!';
      
      // Station 1 encrypts message for Station 2
      const encrypted = await cryptoService.encryptMessage(message, station2Keys.publicKey);
      
      // Station 2 decrypts message from Station 1
      const decrypted = await cryptoService.decryptMessage(encrypted, station2Keys.privateKey);
      
      expect(decrypted).toBe(message);
    });
  });
});
