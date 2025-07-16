import { TransportNodeSerial } from '../src/transport';
import { SerialPort } from 'serialport';
import { findPortWithFallback } from '../src/hardware/deviceDetection';

// Mock dependencies
jest.mock('serialport');
jest.mock('../src/hardware/deviceDetection');

// Mock SerialPort.list() to return empty array by default
const MockedSerialPort = SerialPort as jest.MockedClass<typeof SerialPort>;
MockedSerialPort.list = jest.fn().mockResolvedValue([]);

jest.mock('@jsr/meshtastic__core', () => ({
  Utils: {
    toDeviceStream: {
      writable: {
        getWriter: jest.fn(() => ({
          write: jest.fn(),
          close: jest.fn(),
        })),
      },
      readable: {
        pipeTo: jest.fn().mockResolvedValue(undefined),
      },
    },
    fromDeviceStream: jest.fn(() => ({
      readable: new ReadableStream({
        start(controller) {
          // Mock readable stream
        }
      }),
      writable: new WritableStream({
        write(chunk) {
          // Mock writable stream
        }
      }),
    })),
  },
}));

const mockFindPortWithFallback = findPortWithFallback as jest.MockedFunction<typeof findPortWithFallback>;
const mockSerialPort = SerialPort as jest.MockedClass<typeof SerialPort>;

describe('TransportNodeSerial', () => {
  let mockPort: jest.Mocked<SerialPort>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock SerialPort instance
    mockPort = {
      write: jest.fn(),
      on: jest.fn(),
      close: jest.fn(),
      removeAllListeners: jest.fn(),
    } as any;
    
    mockSerialPort.mockImplementation(() => mockPort);
  });

  describe('create', () => {
    test('creates transport with found port', async () => {
      mockFindPortWithFallback.mockResolvedValue('/dev/ttyUSB0');

      const transport = await TransportNodeSerial.create();
      
      expect(findPortWithFallback).toHaveBeenCalled();
      expect(SerialPort).toHaveBeenCalledWith({
        path: '/dev/ttyUSB0',
        baudRate: 115200,
      });
      expect(transport).toBeInstanceOf(TransportNodeSerial);
    });

    test('creates transport with custom baud rate', async () => {
      mockFindPortWithFallback.mockResolvedValue('/dev/ttyUSB0');

      await TransportNodeSerial.create(9600);
      
      expect(SerialPort).toHaveBeenCalledWith({
        path: '/dev/ttyUSB0',
        baudRate: 9600,
      });
    });

    test('throws error when no port found', async () => {
      mockFindPortWithFallback.mockRejectedValue(new Error('No Meshtastic device found'));

      await expect(TransportNodeSerial.create()).rejects.toThrow('No Meshtastic device found');
    });

    test('throws error when findPort throws', async () => {
      mockFindPortWithFallback.mockRejectedValue(new Error('USB detection failed'));

      await expect(TransportNodeSerial.create()).rejects.toThrow('USB detection failed');
    });
  });

  describe('constructor', () => {
    test('sets up streams and event handlers', () => {
      const transport = new TransportNodeSerial(mockPort);

      expect(mockPort.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockPort.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockPort.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(transport.toDevice).toBeDefined();
      expect(transport.fromDevice).toBeDefined();
    });

    test('handles data events from port', () => {
      new TransportNodeSerial(mockPort);

      // Get the data handler
      const dataHandler = mockPort.on.mock.calls.find(call => call[0] === 'data')?.[1];
      expect(dataHandler).toBeDefined();

      // Simulate data event
      const testData = Buffer.from('test data');
      if (dataHandler) {
        expect(() => dataHandler(testData)).not.toThrow();
      }
    });

    test('handles error events from port', () => {
      new TransportNodeSerial(mockPort);

      // Get the error handler
      const errorHandler = mockPort.on.mock.calls.find(call => call[0] === 'error')?.[1];
      expect(errorHandler).toBeDefined();

      // Simulate error event
      const testError = new Error('Port error');
      if (errorHandler) {
        expect(() => errorHandler(testError)).not.toThrow();
      }
    });

    test('handles close events from port', () => {
      new TransportNodeSerial(mockPort);

      // Get the close handler
      const closeHandler = mockPort.on.mock.calls.find(call => call[0] === 'close')?.[1];
      expect(closeHandler).toBeDefined();

      // Simulate close event
      if (closeHandler) {
        expect(() => closeHandler()).not.toThrow();
      }
    });
  });

  describe('disconnect', () => {
    test('closes port successfully', async () => {
      mockPort.close.mockImplementation((callback) => {
        if (callback) callback(null);
      });

      const transport = new TransportNodeSerial(mockPort);
      await transport.disconnect();

      expect(mockPort.close).toHaveBeenCalled();
    });

    test('rejects when port close fails', async () => {
      const closeError = new Error('Failed to close port');
      mockPort.close.mockImplementation((callback) => {
        if (callback) callback(closeError);
      });

      const transport = new TransportNodeSerial(mockPort);
      
      await expect(transport.disconnect()).rejects.toThrow('Failed to close port');
    });

    test('handles missing callback in close', async () => {
      mockPort.close.mockImplementation(() => {
        // No callback called
      });

      const transport = new TransportNodeSerial(mockPort);
      
      // This should not resolve or reject immediately
      const disconnectPromise = transport.disconnect();
      
      // Give it a moment to see if it resolves unexpectedly
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 10));
      const result = await Promise.race([disconnectPromise, timeoutPromise]);
      
      // Should not have resolved yet
      expect(result).toBeUndefined();
    });
  });

  describe('stream getters', () => {
    test('toDevice returns writable stream', () => {
      const transport = new TransportNodeSerial(mockPort);
      const toDevice = transport.toDevice;
      
      expect(toDevice).toBeDefined();
      expect(typeof toDevice).toBe('object');
    });

    test('fromDevice returns readable stream', () => {
      const transport = new TransportNodeSerial(mockPort);
      const fromDevice = transport.fromDevice;
      
      expect(fromDevice).toBeDefined();
      expect(typeof fromDevice).toBe('object');
    });
  });
});
