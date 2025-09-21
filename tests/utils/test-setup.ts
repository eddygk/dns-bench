// Global test setup file
// This file runs before all tests

// Set test environment
process.env.NODE_ENV = 'test'

// Increase test timeout for DNS operations
jest.setTimeout(30000)

// Mock console methods to reduce noise in tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(), // Uncomment to suppress console.log in tests
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// }