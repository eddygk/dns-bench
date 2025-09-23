// Basic test setup for Node.js environment
// Set test environment variables
process.env.NODE_ENV = 'test';

// Suppress console warnings during tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
});