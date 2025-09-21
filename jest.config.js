module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json'
    }
  },
  roots: ['<rootDir>/tests'],
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
  collectCoverageFrom: [
    'web-app/server/src/services/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/utils/test-setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/web-app/server/src/$1'
  },
  testTimeout: 30000,
  verbose: true
}