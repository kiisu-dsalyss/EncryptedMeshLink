/**
 * EncryptedMeshLink Discovery Client Tests
 * Tests for MIB-004: Discovery Client Implementation
 */

import { DiscoveryClient, DiscoveredPeer, ContactInfo } from '../src/discoveryClient';
import { StationConfig } from '../src/config/types';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('DiscoveryClient', () => {
  let discoveryClient: DiscoveryClient;
  let mockConfig: StationConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      stationId: 'test-station-001',
      displayName: 'Test Station',
      keys: {
        publicKey: '-----BEGIN PUBLIC KEY-----\nMOCK_KEY\n-----END PUBLIC KEY-----',
        privateKey: '-----BEGIN PRIVATE KEY-----\nMOCK_PRIVATE_KEY\n-----END PRIVATE KEY-----'
      },
      discovery: {
        serviceUrl: 'https://test.example.com/api/discovery.php',
        checkInterval: 30,
        timeout: 10
      },
      p2p: {
        listenPort: 4403,
        maxConnections: 10,
        connectionTimeout: 30
      },
      mesh: {
        autoDetect: true,
        baudRate: 115200
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };

    discoveryClient = new DiscoveryClient(mockConfig);
    
    // Mock the getPublicIP method to avoid external HTTP calls
    jest.spyOn(discoveryClient as any, 'getPublicIP').mockResolvedValue('192.168.1.100');
  });

  afterEach(() => {
    discoveryClient.stop();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(discoveryClient).toBeDefined();
      expect(discoveryClient['config'].stationId).toBe('test-station-001');
    });

    it('should validate discovery services', () => {
      const invalidConfig = { ...mockConfig, discovery: { ...mockConfig.discovery, serviceUrl: '' } };
      
      expect(() => {
        new DiscoveryClient(invalidConfig);
      }).toThrow('Discovery service URL is required');
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { message: 'Station registered successfully' }
        })
      } as Response);

      const result = await discoveryClient.register();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.example.com/api/discovery.php',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"station_id":"test-station-001"')
        })
      );
    });

    it('should handle registration failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Invalid station_id format'
        })
      } as Response);

      const result = await discoveryClient.register();

      expect(result).toBe(false);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await discoveryClient.register();

      expect(result).toBe(false);
    });
  });

  describe('discoverPeers', () => {
    it('should discover peers successfully', async () => {
      const mockPeers: DiscoveredPeer[] = [
        {
          stationId: 'peer-station-001',
          encryptedContactInfo: 'encrypted-contact-data',
          publicKey: '-----BEGIN PUBLIC KEY-----\nMOCK_KEY\n-----END PUBLIC KEY-----',
          lastSeen: Date.now()
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            peers: mockPeers,
            count: 1,
            timestamp: Date.now()
          }
        })
      } as Response);

      const peers = await discoveryClient.discoverPeers();

      expect(peers).toHaveLength(1);
      expect(peers[0].stationId).toBe('peer-station-001');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.example.com/api/discovery.php?peers=true',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should return empty array on failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const peers = await discoveryClient.discoverPeers();

      expect(peers).toEqual([]);
    });
  });

  describe('unregister', () => {
    it('should unregister successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { message: 'Station unregistered successfully' }
        })
      } as Response);

      const result = await discoveryClient.unregister();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://test.example.com/api/discovery.php?station_id=test-station-001`,
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('checkHealth', () => {
    it('should perform health check successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            status: 'healthy',
            timestamp: Date.now(),
            version: '1.0.0',
            active_stations: 5,
            php_version: '8.4.10',
            sqlite_version: '3.45.1'
          }
        })
      } as Response);

      const health = await discoveryClient.checkHealth();

      expect(health.status).toBe('healthy');
      expect(health.activeStations).toBe(5);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.example.com/api/discovery.php?health=true',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });
  });

  describe('start/stop', () => {
    it('should start and stop intervals', async () => {
      jest.useFakeTimers();
      
      // Mock successful responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            success: true, 
            data: { 
              status: 'healthy', 
              active_stations: 0,
              timestamp: Date.now(),
              version: '1.0.0',
              php_version: '8.4.10',
              sqlite_version: '3.45.1'
            } 
          })
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, data: {} })
        } as Response);

      await discoveryClient.start();

      // Advance timers to trigger heartbeat and peer discovery
      jest.advanceTimersByTime(60000);
      await Promise.resolve(); // Flush microtask queue

      // Should have made several calls including health, register, and interval tasks
      expect(mockFetch).toHaveBeenCalled();

      discoveryClient.stop();
      jest.clearAllTimers();
      jest.useRealTimers();
    });
  });

  describe('error handling', () => {
    let testDiscoveryClient: DiscoveryClient;
    
    beforeEach(() => {
      // Clear all mocks before each test
      jest.clearAllMocks();
      
      // Create a fresh discovery client for error handling tests
      testDiscoveryClient = new DiscoveryClient(mockConfig);
      jest.spyOn(testDiscoveryClient as any, 'getPublicIP').mockResolvedValue('192.168.1.100');
    });
    
    it('should handle malformed JSON responses', async () => {
      // Mock the specific fetch call for this test
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: async () => { throw new Error('Invalid JSON'); }
        } as unknown as Response)
      );

      const result = await testDiscoveryClient.register();

      expect(result).toBe(false);
    });

    it('should handle AbortController timeout', async () => {
      const mockAbortError = new Error('The operation was aborted');
      mockAbortError.name = 'AbortError';
      
      // Mock the fetch to reject with abort error
      mockFetch.mockImplementation(() => Promise.reject(mockAbortError));

      const result = await testDiscoveryClient.register();

      expect(result).toBe(false);
    });
  });
});
