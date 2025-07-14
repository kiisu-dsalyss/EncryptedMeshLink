// Test setup file for Jest
// This file runs before all tests

// Mock console methods to reduce noise during testing
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup test timeout
jest.setTimeout(10000);

// Mock environment variables for consistent testing
process.env.NODE_ENV = 'test';
