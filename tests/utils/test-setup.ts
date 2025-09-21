// Jest test setup file
// This file runs before each test suite

// Set longer timeout for DNS tests
jest.setTimeout(30000)

// Suppress console output during tests unless debugging
if (!process.env.DEBUG_TESTS) {
  console.log = jest.fn()
  console.warn = jest.fn()
  console.error = jest.fn()
}