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
jest.setTimeout(15000);

// Mock environment variables for consistent testing
process.env.NODE_ENV = 'test';

// Add global test isolation helpers
beforeEach(() => {
  // Clear any pending timers
  jest.clearAllTimers();
});

afterEach(async () => {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  // Small delay to allow async cleanup
  await new Promise(resolve => setTimeout(resolve, 10));
});
