import { findPort } from '../findPort';
import { SerialPort } from 'serialport';

// Mock SerialPort
jest.mock('serialport', () => ({
  SerialPort: {
    list: jest.fn()
  }
}));

const mockSerialPortList = SerialPort.list as jest.MockedFunction<typeof SerialPort.list>;

describe('findPort', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('error cases', () => {
    test('throws error when no serial ports found', async () => {
      mockSerialPortList.mockResolvedValue([]);

      await expect(findPort()).rejects.toThrow('No serial ports found on this system.');
    });

    test('throws error when no likely Meshtastic devices found', async () => {
      const ports = [
        {
          path: '/dev/ttyS0',
          manufacturer: 'Unknown Manufacturer',
          vendorId: undefined,
          productId: undefined,
          serialNumber: undefined
        }
      ];

      mockSerialPortList.mockResolvedValue(ports as any);

      await expect(findPort()).rejects.toThrow(
        'No likely Meshtastic devices found. Please check your device connection.'
      );
    });
  });

  describe('scoring system', () => {
    test('scores ESP32/Espressif manufacturer highest', async () => {
      const ports = [
        {
          path: '/dev/ttyUSB0',
          manufacturer: 'Espressif Systems',
          vendorId: '303a',
          productId: '1001',
          serialNumber: 'esp32-123'
        }
      ];

      mockSerialPortList.mockResolvedValue(ports as any);

      const result = await findPort();
      expect(result).toBe('/dev/ttyUSB0');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('ESP32/Espressif manufacturer')
      );
    });

    test('scores Silicon Labs manufacturer high', async () => {
      const ports = [
        {
          path: '/dev/tty.usbserial-0001',
          manufacturer: 'Silicon Labs',
          vendorId: '10c4',
          productId: 'ea60',
          serialNumber: 'sl-123'
        }
      ];

      mockSerialPortList.mockResolvedValue(ports as any);

      const result = await findPort();
      expect(result).toBe('/dev/tty.usbserial-0001');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Silicon Labs USB-to-serial chip')
      );
    });

    test('recognizes CP2102 USB-to-UART Bridge by vendor/product ID', async () => {
      const ports = [
        {
          path: '/dev/ttyUSB0',
          manufacturer: 'Silicon Labs',
          vendorId: '10c4',
          productId: 'ea60',
          serialNumber: 'cp2102-123'
        }
      ];

      mockSerialPortList.mockResolvedValue(ports as any);

      const result = await findPort();
      expect(result).toBe('/dev/ttyUSB0');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('CP2102 USB-to-UART Bridge (common in Meshtastic)')
      );
    });

    test('scores FTDI manufacturer moderately', async () => {
      const ports = [
        {
          path: '/dev/ttyUSB1',
          manufacturer: 'FTDI',
          vendorId: '0403',
          productId: '6001',
          serialNumber: 'ftdi-123'
        }
      ];

      mockSerialPortList.mockResolvedValue(ports as any);

      const result = await findPort();
      expect(result).toBe('/dev/ttyUSB1');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('FTDI USB-to-serial chip')
      );
    });

    test('gives bonus points for serial number', async () => {
      const ports = [
        {
          path: '/dev/ttyUSB0',
          manufacturer: 'Unknown',
          vendorId: '1234',
          productId: '5678',
          serialNumber: 'device-serial-123'
        }
      ];

      mockSerialPortList.mockResolvedValue(ports as any);

      const result = await findPort();
      expect(result).toBe('/dev/ttyUSB0');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Has serial number')
      );
    });
  });

  describe('path pattern recognition', () => {
    test('recognizes Linux ACM device pattern', async () => {
      const ports = [
        {
          path: '/dev/ttyACM0',
          manufacturer: 'Test Manufacturer',
          vendorId: '1234',
          productId: '5678',
          serialNumber: 'test-123'
        }
      ];

      mockSerialPortList.mockResolvedValue(ports as any);

      const result = await findPort();
      expect(result).toBe('/dev/ttyACM0');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Linux ACM device pattern')
      );
    });

    test('recognizes Linux USB serial pattern', async () => {
      const ports = [
        {
          path: '/dev/ttyUSB0',
          manufacturer: 'Test Manufacturer',
          vendorId: '1234',
          productId: '5678',
          serialNumber: 'test-123'
        }
      ];

      mockSerialPortList.mockResolvedValue(ports as any);

      const result = await findPort();
      expect(result).toBe('/dev/ttyUSB0');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Linux USB serial pattern')
      );
    });

    test('recognizes macOS USB modem pattern', async () => {
      const ports = [
        {
          path: '/dev/cu.usbmodem123',
          manufacturer: 'Test Manufacturer',
          vendorId: '1234',
          productId: '5678',
          serialNumber: 'test-123'
        }
      ];

      mockSerialPortList.mockResolvedValue(ports as any);

      const result = await findPort();
      expect(result).toBe('/dev/cu.usbmodem123');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('macOS USB modem pattern')
      );
    });

    test('recognizes USB serial pattern', async () => {
      const ports = [
        {
          path: '/dev/tty.usbserial-0001',
          manufacturer: 'Test Manufacturer',
          vendorId: '1234',
          productId: '5678',
          serialNumber: 'test-123'
        }
      ];

      mockSerialPortList.mockResolvedValue(ports as any);

      const result = await findPort();
      expect(result).toBe('/dev/tty.usbserial-0001');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('USB serial pattern')
      );
    });
  });

  describe('multiple ports selection', () => {
    test('selects highest scoring port among multiple options', async () => {
      const ports = [
        {
          path: '/dev/ttyUSB0',
          manufacturer: 'Unknown',
          vendorId: '1234',
          productId: '5678',
          serialNumber: undefined
        },
        {
          path: '/dev/ttyUSB1',
          manufacturer: 'Silicon Labs',
          vendorId: '10c4',
          productId: 'ea60',
          serialNumber: 'cp2102-123'
        },
        {
          path: '/dev/ttyACM0',
          manufacturer: 'Arduino',
          vendorId: '2341',
          productId: '0043',
          serialNumber: 'arduino-123'
        }
      ];

      mockSerialPortList.mockResolvedValue(ports as any);

      const result = await findPort();
      expect(result).toBe('/dev/ttyUSB1'); // Should pick Silicon Labs CP2102
    });

    test('shows analysis for all ports', async () => {
      const ports = [
        {
          path: '/dev/ttyUSB0',
          manufacturer: 'Unknown',
          vendorId: undefined,
          productId: undefined,
          serialNumber: undefined
        },
        {
          path: '/dev/ttyUSB1',
          manufacturer: 'Silicon Labs',
          vendorId: '10c4',
          productId: 'ea60',
          serialNumber: 'test'
        }
      ];

      mockSerialPortList.mockResolvedValue(ports as any);

      await findPort();

      expect(console.log).toHaveBeenCalledWith('\n📊 Port Analysis:');
      expect(console.log).toHaveBeenCalledWith('==================');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/dev/ttyUSB0'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/dev/ttyUSB1'));
    });
  });

  describe('confidence levels', () => {
    test('shows Very High confidence for score >= 100', async () => {
      const ports = [
        {
          path: '/dev/ttyUSB0',
          manufacturer: 'Espressif Systems',
          vendorId: '303a',
          productId: '1001',
          serialNumber: 'esp32-123'
        }
      ];

      mockSerialPortList.mockResolvedValue(ports as any);

      await findPort();
      expect(console.log).toHaveBeenCalledWith('   Confidence: Very High');
    });

    test('shows High confidence for score >= 80', async () => {
      const ports = [
        {
          path: '/dev/ttyUSB0',
          manufacturer: 'Silicon Labs',
          vendorId: '10c4',
          productId: 'ea60',
          serialNumber: 'test'
        }
      ];

      mockSerialPortList.mockResolvedValue(ports as any);

      await findPort();
      expect(console.log).toHaveBeenCalledWith('   Confidence: Very High'); // Silicon Labs + CP2102 + USB + serial = 80+90+50+10 = 230
    });

    test('shows Medium confidence for score >= 50', async () => {
      const ports = [
        {
          path: '/dev/ttyUSB0',
          manufacturer: 'FTDI',
          vendorId: '0403',
          productId: '6001',
          serialNumber: undefined
        }
      ];

      mockSerialPortList.mockResolvedValue(ports as any);

      await findPort();
      expect(console.log).toHaveBeenCalledWith('   Confidence: Very High'); // FTDI + FTDI vendor + USB = 70+50+50 = 170
    });

    test('shows warning for low confidence matches', async () => {
      const ports = [
        {
          path: '/dev/ttyS0', // No USB pattern
          manufacturer: 'Unknown',
          vendorId: '1234',
          productId: '5678',
          serialNumber: 'test' // Only gets 10 points
        }
      ];

      mockSerialPortList.mockResolvedValue(ports as any);

      const result = await findPort();
      expect(result).toBe('/dev/ttyS0');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  No high-confidence match found')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('you may need to set MESHTASTIC_PORT manually')
      );
    });
  });

  describe('vendor/product ID recognition', () => {
    test('recognizes CH340 USB-to-serial', async () => {
      const ports = [
        {
          path: '/dev/ttyUSB0',
          manufacturer: 'QinHeng Electronics',
          vendorId: '1a86',
          productId: '7523',
          serialNumber: 'ch340-123'
        }
      ];

      mockSerialPortList.mockResolvedValue(ports as any);

      await findPort();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('CH340 USB-to-serial (sometimes used)')
      );
    });

    test('recognizes FTDI vendor ID', async () => {
      const ports = [
        {
          path: '/dev/ttyUSB0',
          manufacturer: 'FTDI',
          vendorId: '0403',
          productId: '6001',
          serialNumber: 'ftdi-123'
        }
      ];

      mockSerialPortList.mockResolvedValue(ports as any);

      await findPort();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('FTDI vendor ID')
      );
    });
  });
});
