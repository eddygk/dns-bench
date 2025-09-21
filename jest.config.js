module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverageFrom: [
    'web-app/server/src/services/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/utils/test-setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/web-app/server/src/$1'
  },
  testTimeout: 30000,
  verbose: true
}