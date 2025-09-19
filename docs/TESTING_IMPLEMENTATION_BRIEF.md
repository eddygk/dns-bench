# DNS Benchmark Testing Implementation Brief

**Engineering Task**: Implement comprehensive testing strategy for DNS Benchmark Web Application
**Assignee**: Claude Code Implementation Team
**Priority**: High (Critical for production readiness)
**Estimated Effort**: 3-5 days
**Created**: 2025-09-19

## 🎯 Objective

Implement a complete testing framework for the DNS Benchmark application to ensure reliability, performance, and correctness of DNS performance measurements. The application currently has **zero automated testing**, which is unacceptable for a network performance tool.

## 📋 Success Criteria

- [ ] **Unit Test Coverage**: ≥85% code coverage for backend services
- [ ] **Integration Tests**: All API endpoints tested with real DNS queries
- [ ] **E2E Tests**: Critical user journeys automated with Playwright
- [ ] **CI Pipeline**: GitHub Actions workflow running all test suites
- [ ] **Performance Tests**: Baseline DNS benchmark validation
- [ ] **Documentation**: Test execution and maintenance guides

## 🏗️ Technical Architecture

### Testing Stack
- **Unit Tests**: Jest + TypeScript + Real DNS (Node.js dns.Resolver)
- **Integration Tests**: Jest + Real DNS + Docker Test Containers
- **E2E Tests**: Playwright + TypeScript
- **Performance Tests**: Artillery.js or k6
- **CI/CD**: GitHub Actions + Docker
- **Coverage**: Istanbul/nyc

### DNS Testing Philosophy
⚠️ **CRITICAL**: This application uses Node.js `dns.Resolver()` for DNS resolution, NOT external `dig` commands. Unit and integration tests MUST use real DNS calls against reliable servers (8.8.8.8, 8.8.4.4) to validate the actual DNS resolution logic, timeout handling, and response parsing.

### Practical Fast CI Strategy
**Fast Lane (PR Tests) - Target: <8 minutes**
- ✅ Unit Tests with Real DNS: ~3 min (Google DNS is fast: 20-50ms per query)
- ✅ TypeScript + Linting: ~2 min
- ✅ Component Tests: ~2 min
- ✅ Basic Docker health check: ~1 min

**Why Real DNS in PR Tests Works:**
- Node.js `dns.Resolver()` is extremely fast compared to spawning `dig` processes
- Google DNS (8.8.8.8/8.8.4.4) has 99.9%+ uptime and sub-100ms response times
- Tests the actual core functionality rather than mocked behavior
- Catches real DNS parsing errors, timeout issues, and resolver problems
- Total DNS testing overhead: ~30 seconds for comprehensive validation

**Mocking Strategy:**
- ✅ **Mock**: File system (settings files), database (use in-memory SQLite), WebSocket connections, HTTP APIs
- ❌ **Don't Mock**: DNS resolution, `dns.Resolver()` calls, network timeouts, DNS response parsing
- **Reason**: DNS resolution IS the core business logic - mocking it defeats the purpose of testing

### Project Structure
```
dns-bench/
├── .github/workflows/
│   ├── ci.yml                    # Main CI pipeline
│   ├── performance.yml           # Performance testing
│   └── security.yml              # Security scanning
├── tests/
│   ├── unit/                     # Unit tests
│   │   ├── backend/
│   │   │   ├── services/
│   │   │   │   ├── dns-benchmark.test.ts
│   │   │   │   ├── settings.test.ts
│   │   │   │   └── database.test.ts
│   │   │   └── utils/
│   │   │       └── validation.test.ts
│   │   └── frontend/
│   │       ├── components/
│   │       │   ├── benchmark.test.tsx
│   │       │   ├── settings.test.tsx
│   │       │   └── history.test.tsx
│   │       └── hooks/
│   │           └── api.test.ts
│   ├── integration/
│   │   ├── api/
│   │   │   ├── benchmark.test.ts
│   │   │   ├── settings.test.ts
│   │   │   └── websocket.test.ts
│   │   └── database/
│   │       └── operations.test.ts
│   ├── e2e/
│   │   ├── benchmark-flow.spec.ts
│   │   ├── settings-management.spec.ts
│   │   └── history-navigation.spec.ts
│   ├── performance/
│   │   ├── dns-load.yml
│   │   └── concurrent-users.yml
│   ├── fixtures/
│   │   ├── dns-responses.json
│   │   ├── benchmark-data.json
│   │   └── test-domains.json
│   └── utils/
│       ├── test-helpers.ts
│       ├── mock-dns.ts
│       └── test-setup.ts
├── jest.config.js               # Jest configuration
├── playwright.config.ts         # Playwright configuration
└── package.json                # Test dependencies
```

## 📝 Implementation Tasks

### Phase 1: Test Infrastructure Setup

#### Task 1.1: Install Testing Dependencies
```bash
cd /home/ansible/dns-bench
npm install --save-dev \
  jest @types/jest ts-jest \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  supertest @types/supertest \
  playwright @playwright/test \
  artillery
```

#### Task 1.2: Configure Jest
Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/web-app'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  collectCoverageFrom: [
    'web-app/server/src/**/*.ts',
    'web-app/client/src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/utils/test-setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/web-app/server/src/$1',
    '^~/(.*)$': '<rootDir>/web-app/client/src/$1'
  }
}
```

#### Task 1.3: Configure Playwright
Create `playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### Phase 2: Unit Tests Implementation

#### Task 2.1: Backend Service Tests

**DNS Benchmark Service** (`tests/unit/backend/services/dns-benchmark.test.ts`):
```typescript
import { DNSBenchmarkService } from '@/services/dns-benchmark'

describe('DNSBenchmarkService - Real DNS', () => {
  let service: DNSBenchmarkService

  beforeEach(() => {
    service = new DNSBenchmarkService()
  })

  describe('runDnsQuery', () => {
    it('should resolve domains via Google DNS', async () => {
      const result = await service['runDnsQuery']('8.8.8.8', 'google.com', 5000)

      expect(result.success).toBe(true)
      expect(result.ip).toMatch(/^\d+\.\d+\.\d+\.\d+$/) // Valid IP format
      expect(result.queryTime).toBeGreaterThan(0)
      expect(result.queryTime).toBeLessThan(1000) // Should be fast
      expect(result.responseCode).toBe('NOERROR')
    })

    it('should handle different DNS servers consistently', async () => {
      const [google, cloudflare] = await Promise.all([
        service['runDnsQuery']('8.8.8.8', 'github.com', 5000),
        service['runDnsQuery']('1.1.1.1', 'github.com', 5000)
      ])

      expect(google.success).toBe(true)
      expect(cloudflare.success).toBe(true)
      // Both should resolve to valid IPs (might be different due to CDN)
      expect(google.ip).toMatch(/^\d+\.\d+\.\d+\.\d+$/)
      expect(cloudflare.ip).toMatch(/^\d+\.\d+\.\d+\.\d+$/)
    })

    it('should handle timeout gracefully', async () => {
      // Test with very short timeout
      const result = await service['runDnsQuery']('8.8.8.8', 'google.com', 1)

      expect(result.success).toBe(false)
      expect(result.errorType).toBe('DNS_TIMEOUT')
    }, 10000)

    it('should handle invalid DNS servers', async () => {
      const result = await service['runDnsQuery']('192.0.2.1', 'google.com', 2000)

      expect(result.success).toBe(false)
      expect(result.errorType).toMatch(/TIMEOUT|NOTFOUND|SERVFAIL/)
    }, 15000)

    it('should handle non-existent domains', async () => {
      const result = await service['runDnsQuery']('8.8.8.8', 'this-domain-definitely-does-not-exist-12345.com', 5000)

      expect(result.success).toBe(false)
      expect(result.responseCode).toMatch(/NXDOMAIN|NOTFOUND/)
    })
  })

  describe('benchmarkDNSServers', () => {
    it('should benchmark multiple DNS servers with real queries', async () => {
      const result = await service.benchmarkDNSServers([
        { ip: '8.8.8.8', name: 'Google Primary' },
        { ip: '8.8.4.4', name: 'Google Secondary' }
      ], ['google.com', 'github.com'])

      expect(result).toHaveLength(2)
      expect(result[0].serverName).toBe('Google Primary')
      expect(result[0].avgResponseTime).toBeGreaterThan(0)
      expect(result[0].successRate).toBeGreaterThanOrEqual(90) // Should be very reliable
      expect(result[1].serverName).toBe('Google Secondary')
    }, 30000)

    it('should validate DNS server IP addresses', async () => {
      await expect(
        service.benchmarkDNSServers([
          { ip: 'invalid-ip', name: 'Bad' }
        ], ['test.com'])
      ).rejects.toThrow('Invalid DNS server IP')
    })

    it('should handle mixed success/failure scenarios', async () => {
      const result = await service.benchmarkDNSServers([
        { ip: '8.8.8.8', name: 'Google' },      // Should work
        { ip: '192.0.2.1', name: 'Invalid' }   // Should fail
      ], ['google.com'])

      expect(result).toHaveLength(2)
      expect(result[0].successRate).toBeGreaterThan(50) // Google should work
      expect(result[1].successRate).toBeLessThan(50)    // Invalid should fail
    }, 20000)
  })
})
```

**Settings Service Tests** (`tests/unit/backend/services/settings.test.ts`):
```typescript
import { SettingsService } from '@/services/settings'
import fs from 'fs/promises'

jest.mock('fs/promises')

describe('SettingsService', () => {
  let service: SettingsService
  const mockFs = fs as jest.Mocked<typeof fs>

  beforeEach(() => {
    service = new SettingsService()
    jest.clearAllMocks()
  })

  describe('loadLocalDNSServers', () => {
    it('should load DNS servers from file', async () => {
      const mockServers = [
        { ip: '10.10.20.30', enabled: true },
        { ip: '10.10.20.31', enabled: false }
      ]

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockServers))

      const result = await service.loadLocalDNSServers()

      expect(result).toEqual(mockServers)
      expect(mockFs.readFile).toHaveBeenCalledWith('local-dns.json', 'utf-8')
    })

    it('should handle missing configuration file', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'))

      const result = await service.loadLocalDNSServers()

      expect(result).toEqual([])
    })

    it('should validate DNS server IP format', async () => {
      const invalidServers = [{ ip: 'not-an-ip', enabled: true }]

      await expect(
        service.saveLocalDNSServers(invalidServers)
      ).rejects.toThrow('Invalid IP address format')
    })
  })

  describe('CORS configuration', () => {
    it('should generate correct CORS origins', () => {
      const settings = {
        cors: {
          allowedOrigins: ['http://localhost:3000'],
          customOrigins: ['http://10.10.20.2:3000']
        }
      }

      const origins = service.getCORSOrigins(settings)

      expect(origins).toContain('http://localhost:3000')
      expect(origins).toContain('http://10.10.20.2:3000')
    })
  })
})
```

#### Task 2.2: Frontend Component Tests

**Benchmark Component** (`tests/unit/frontend/components/benchmark.test.tsx`):
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BenchmarkPage from '~/pages/benchmark'

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
})

const renderWithClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('BenchmarkPage', () => {
  it('should display DNS servers and start benchmark', async () => {
    // Mock fetch API
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { ip: '1.1.1.1', name: 'Cloudflare', enabled: true },
          { ip: '8.8.8.8', name: 'Google', enabled: true }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'started', benchmarkId: '123' })
      })

    renderWithClient(<BenchmarkPage />)

    await waitFor(() => {
      expect(screen.getByText('Cloudflare')).toBeInTheDocument()
      expect(screen.getByText('Google')).toBeInTheDocument()
    })

    const startButton = screen.getByText('Start Benchmark')
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByText('Benchmark Running')).toBeInTheDocument()
    })
  })

  it('should handle WebSocket real-time updates', async () => {
    // Mock WebSocket
    const mockWebSocket = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      close: jest.fn()
    }

    global.WebSocket = jest.fn(() => mockWebSocket) as any

    renderWithClient(<BenchmarkPage />)

    // Simulate WebSocket message
    const messageHandler = mockWebSocket.addEventListener.mock.calls
      .find(call => call[0] === 'message')[1]

    messageHandler({
      data: JSON.stringify({
        type: 'progress',
        server: 'Cloudflare',
        domain: 'google.com',
        responseTime: 23
      })
    })

    await waitFor(() => {
      expect(screen.getByText('google.com')).toBeInTheDocument()
      expect(screen.getByText('23ms')).toBeInTheDocument()
    })
  })

  it('should display error states for failed benchmarks', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    renderWithClient(<BenchmarkPage />)

    const startButton = screen.getByText('Start Benchmark')
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})
```

### Phase 3: Integration Tests

#### Task 3.1: API Integration Tests

**Benchmark API** (`tests/integration/api/benchmark.test.ts`):
```typescript
import request from 'supertest'
import { app } from '@/index'
import { Database } from '@/services/database'

describe('Benchmark API Integration', () => {
  let database: Database

  beforeAll(async () => {
    database = new Database(':memory:') // Use in-memory DB for tests
    await database.initialize()
  })

  afterAll(async () => {
    await database.close()
  })

  describe('POST /api/benchmark', () => {
    it('should start benchmark and return job ID', async () => {
      const response = await request(app)
        .post('/api/benchmark')
        .send({
          testType: 'quick',
          dnsServers: [
            { ip: '1.1.1.1', name: 'Cloudflare' }
          ],
          domains: ['google.com', 'github.com']
        })
        .expect(200)

      expect(response.body).toMatchObject({
        status: 'started',
        benchmarkId: expect.any(String)
      })
    })

    it('should validate DNS server format', async () => {
      await request(app)
        .post('/api/benchmark')
        .send({
          testType: 'quick',
          dnsServers: [
            { ip: 'invalid-ip', name: 'Bad' }
          ]
        })
        .expect(400)
    })

    it('should handle concurrent benchmark requests', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/benchmark')
          .send({
            testType: 'quick',
            dnsServers: [{ ip: '8.8.8.8', name: 'Google' }]
          })
      )

      const responses = await Promise.all(requests)

      expect(responses.every(r => r.status === 200)).toBe(true)
      expect(new Set(responses.map(r => r.body.benchmarkId)).size).toBe(5)
    })
  })

  describe('WebSocket /ws/benchmark', () => {
    it('should broadcast real-time progress updates', (done) => {
      const WebSocket = require('ws')
      const ws = new WebSocket('ws://localhost:3001/ws/benchmark')

      ws.on('open', () => {
        // Start benchmark via HTTP
        request(app)
          .post('/api/benchmark')
          .send({
            testType: 'quick',
            dnsServers: [{ ip: '1.1.1.1', name: 'Cloudflare' }]
          })
      })

      ws.on('message', (data: string) => {
        const message = JSON.parse(data)

        if (message.type === 'progress') {
          expect(message).toMatchObject({
            server: expect.any(String),
            domain: expect.any(String),
            responseTime: expect.any(Number)
          })

          ws.close()
          done()
        }
      })
    })
  })
})
```

#### Task 3.2: Database Integration Tests

**Database Operations** (`tests/integration/database/operations.test.ts`):
```typescript
import { Database } from '@/services/database'
import { BenchmarkResult } from '@/types'

describe('Database Integration', () => {
  let db: Database

  beforeEach(async () => {
    db = new Database(':memory:')
    await db.initialize()
  })

  afterEach(async () => {
    await db.close()
  })

  describe('Benchmark Results', () => {
    it('should store and retrieve benchmark results', async () => {
      const result: BenchmarkResult = {
        id: 'test-123',
        startedAt: new Date(),
        completedAt: new Date(),
        testType: 'quick',
        status: 'completed',
        results: [
          {
            serverName: 'Cloudflare',
            serverIP: '1.1.1.1',
            avgResponseTime: 23.5,
            minResponseTime: 18,
            maxResponseTime: 31,
            successRate: 100,
            totalQueries: 10,
            successfulQueries: 10,
            failures: []
          }
        ]
      }

      await db.saveBenchmarkResult(result)

      const retrieved = await db.getBenchmarkResult('test-123')

      expect(retrieved).toMatchObject({
        id: 'test-123',
        testType: 'quick',
        status: 'completed'
      })
      expect(retrieved.results).toHaveLength(1)
      expect(retrieved.results[0].serverName).toBe('Cloudflare')
    })

    it('should handle pagination for benchmark history', async () => {
      // Insert 25 test results
      for (let i = 0; i < 25; i++) {
        await db.saveBenchmarkResult({
          id: `test-${i}`,
          startedAt: new Date(Date.now() - i * 1000),
          testType: 'quick',
          status: 'completed',
          results: []
        })
      }

      const page1 = await db.getBenchmarkHistory(0, 10)
      const page2 = await db.getBenchmarkHistory(10, 10)

      expect(page1.results).toHaveLength(10)
      expect(page2.results).toHaveLength(10)
      expect(page1.total).toBe(25)
      expect(page1.results[0].id).toBe('test-0') // Most recent first
    })
  })
})
```

### Phase 4: End-to-End Tests

#### Task 4.1: Critical User Journey Tests

**Complete Benchmark Flow** (`tests/e2e/benchmark-flow.spec.ts`):
```typescript
import { test, expect } from '@playwright/test'

test.describe('Complete Benchmark Flow', () => {
  test('should run full benchmark and display results', async ({ page }) => {
    await page.goto('/')

    // Verify initial state
    await expect(page.getByText('DNS Benchmark')).toBeVisible()

    // Navigate to benchmark page
    await page.click('[data-testid="start-benchmark"]')
    await expect(page).toHaveURL('/benchmark')

    // Verify DNS servers are loaded
    await expect(page.getByText('Cloudflare')).toBeVisible()
    await expect(page.getByText('Google')).toBeVisible()

    // Start benchmark
    await page.click('[data-testid="start-benchmark-button"]')

    // Wait for benchmark to complete (with real DNS queries)
    await expect(page.getByText('Benchmark Running')).toBeVisible()
    await expect(page.getByText('Benchmark Complete')).toBeVisible({ timeout: 30000 })

    // Verify results are displayed
    await expect(page.getByTestId('results-overview')).toBeVisible()
    await expect(page.getByText(/avg response time/i)).toBeVisible()
    await expect(page.getByText(/success rate/i)).toBeVisible()

    // Check tabs work
    await page.click('[data-testid="failures-tab"]')
    await expect(page.getByTestId('failures-content')).toBeVisible()

    await page.click('[data-testid="server-analysis-tab"]')
    await expect(page.getByTestId('server-analysis-content')).toBeVisible()

    // Save to history
    await page.click('[data-testid="save-results"]')
    await expect(page.getByText('Results saved')).toBeVisible()
  })

  test('should handle benchmark failures gracefully', async ({ page }) => {
    await page.goto('/benchmark')

    // Add invalid DNS server
    await page.click('[data-testid="add-dns-server"]')
    await page.fill('[data-testid="dns-ip-input"]', '192.0.2.1') // Invalid test IP
    await page.fill('[data-testid="dns-name-input"]', 'Invalid Server')
    await page.click('[data-testid="save-dns-server"]')

    // Start benchmark
    await page.click('[data-testid="start-benchmark-button"]')

    // Wait for completion
    await expect(page.getByText('Benchmark Complete')).toBeVisible({ timeout: 30000 })

    // Check failure analysis
    await page.click('[data-testid="failures-tab"]')
    await expect(page.getByText('Invalid Server')).toBeVisible()
    await expect(page.getByText(/timeout|failed/i)).toBeVisible()
  })
})
```

**Settings Management** (`tests/e2e/settings-management.spec.ts`):
```typescript
import { test, expect } from '@playwright/test'

test.describe('Settings Management', () => {
  test('should configure DNS servers and save settings', async ({ page }) => {
    await page.goto('/settings')

    // Configure local DNS
    await page.fill('[data-testid="local-dns-primary"]', '10.10.20.30')
    await page.fill('[data-testid="local-dns-secondary"]', '10.10.20.31')
    await page.click('[data-testid="save-local-dns"]')
    await expect(page.getByText('Settings saved')).toBeVisible()

    // Add custom public DNS server
    await page.click('[data-testid="add-public-dns"]')
    await page.fill('[data-testid="public-dns-ip"]', '9.9.9.9')
    await page.fill('[data-testid="public-dns-name"]', 'Quad9')
    await page.click('[data-testid="save-public-dns"]')

    // Verify new server appears in list
    await expect(page.getByText('Quad9')).toBeVisible()
    await expect(page.getByText('9.9.9.9')).toBeVisible()

    // Toggle server enabled/disabled
    await page.click('[data-testid="toggle-quad9"]')
    await expect(page.getByTestId('quad9-status')).toHaveText('Disabled')

    // Configure CORS
    await page.fill('[data-testid="cors-custom-origin"]', 'http://10.10.20.2:3000')
    await page.click('[data-testid="add-cors-origin"]')
    await page.click('[data-testid="save-cors-settings"]')
    await expect(page.getByText('CORS updated')).toBeVisible()
  })

  test('should validate DNS server input', async ({ page }) => {
    await page.goto('/settings')

    // Try invalid IP address
    await page.click('[data-testid="add-public-dns"]')
    await page.fill('[data-testid="public-dns-ip"]', 'not-an-ip')
    await page.fill('[data-testid="public-dns-name"]', 'Invalid')
    await page.click('[data-testid="save-public-dns"]')

    // Should show validation error
    await expect(page.getByText(/invalid ip address/i)).toBeVisible()

    // Should not save invalid server
    await expect(page.getByText('Invalid')).not.toBeVisible()
  })
})
```

### Phase 5: Performance Tests

#### Task 5.1: Load Testing Configuration

**DNS Load Test** (`tests/performance/dns-load.yml`):
```yaml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 5
    - duration: 120
      arrivalRate: 10
    - duration: 60
      arrivalRate: 5
  processor: "./load-test-processor.js"

scenarios:
  - name: "Concurrent DNS Benchmarks"
    flow:
      - post:
          url: "/api/benchmark"
          json:
            testType: "quick"
            dnsServers:
              - { ip: "1.1.1.1", name: "Cloudflare" }
              - { ip: "8.8.8.8", name: "Google" }
            domains: ["google.com", "github.com", "stackoverflow.com"]
          capture:
            - json: "$.benchmarkId"
              as: "benchmarkId"
      - think: 2
      - get:
          url: "/api/benchmark/{{ benchmarkId }}/status"
          capture:
            - json: "$.status"
              as: "status"
      - loop:
          - get:
              url: "/api/benchmark/{{ benchmarkId }}/status"
          - think: 1
        while: "{{ status !== 'completed' && status !== 'failed' }}"
        maxIterations: 30

  - name: "Settings API Load"
    flow:
      - get:
          url: "/api/settings/public-dns"
      - get:
          url: "/api/settings/local-dns"
      - post:
          url: "/api/settings/public-dns"
          json:
            servers:
              - { ip: "1.1.1.1", name: "Test", enabled: true }
```

#### Task 5.2: Performance Validation

**Performance Test Processor** (`tests/performance/load-test-processor.js`):
```javascript
module.exports = {
  // Validate DNS benchmark response times
  validateResponseTime: function(context, events, done) {
    if (context.vars.responseTime > 100) {
      events.emit('counter', 'dns.slow_response', 1)
    }
    if (context.vars.responseTime > 500) {
      events.emit('counter', 'dns.very_slow_response', 1)
    }
    return done()
  },

  // Track concurrent user performance
  trackConcurrency: function(context, events, done) {
    events.emit('histogram', 'benchmark.duration', Date.now() - context.vars.startTime)
    return done()
  }
}
```

### Phase 6: CI/CD Pipeline

#### Task 6.1: GitHub Actions Workflow

**Main CI Pipeline** (`.github/workflows/ci.yml`):
```yaml
name: DNS Benchmark CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
        cache-dependency-path: '**/package-lock.json'

    - name: Install dependencies
      run: |
        cd web-app/server && npm ci
        cd ../client && npm ci
        npm ci # Root level test dependencies

    - name: Lint and type check
      run: |
        cd web-app/server && npm run lint && npm run type-check
        cd ../client && npm run lint && npm run type-check

    - name: Run unit tests (with real DNS)
      run: npm run test:unit
      env:
        NODE_ENV: test
        # Tests use real DNS via Node.js dns.Resolver against 8.8.8.8/8.8.4.4

    - name: Build applications
      run: |
        cd web-app/server && npm run build
        cd ../client && npm run build

    - name: Start test servers
      run: |
        cd web-app/server && npm start &
        cd ../client && npm run preview &
        sleep 10
      env:
        NODE_ENV: test
        PORT: 3001
        FRONTEND_PORT: 3000

    - name: Run integration tests
      run: npm run test:integration
      env:
        NODE_ENV: test
        TEST_API_URL: http://localhost:3001

    - name: Install Playwright
      run: npx playwright install --with-deps

    - name: Run E2E tests
      run: npm run test:e2e
      env:
        NODE_ENV: test

    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results
        path: |
          coverage/
          test-results/
          playwright-report/

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella

  performance:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: test

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}

    - name: Install Artillery
      run: npm install -g artillery@latest

    - name: Start application
      run: |
        docker-compose up -d
        sleep 30 # Wait for services to be ready

    - name: Run performance tests
      run: |
        artillery run tests/performance/dns-load.yml --output performance-report.json
        artillery report performance-report.json

    - name: Upload performance report
      uses: actions/upload-artifact@v3
      with:
        name: performance-report
        path: performance-report.html

  docker:
    runs-on: ubuntu-latest
    needs: test

    steps:
    - uses: actions/checkout@v4

    - name: Build Docker images
      run: docker-compose build

    - name: Test Docker deployment
      run: |
        docker-compose up -d
        sleep 30
        curl -f http://localhost:3000 || exit 1
        curl -f http://localhost:3001/api/health || exit 1
        docker-compose down
```

#### Task 6.2: Test Scripts in package.json

Add to root `package.json`:
```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:unit": "jest --coverage --testPathPattern=tests/unit",
    "test:integration": "jest --testPathPattern=tests/integration --runInBand",
    "test:e2e": "playwright test",
    "test:performance": "artillery run tests/performance/dns-load.yml",
    "test:watch": "jest --watch --testPathPattern=tests/unit",
    "test:debug": "node --inspect-brk ./node_modules/.bin/jest --runInBand --no-cache",
    "coverage:report": "jest --coverage && open coverage/lcov-report/index.html"
  }
}
```

## 🔧 Implementation Guidelines

### Test Data Management
1. **Use realistic DNS servers**: 1.1.1.1, 8.8.8.8, 9.9.9.9 for integration tests
2. **Mock external dependencies**: DNS resolution, file system operations
3. **Isolated test environments**: In-memory databases, temporary files
4. **Deterministic test data**: Fixed timestamps, predictable response times

### Performance Considerations
1. **Parallel test execution**: Use Jest's `--maxWorkers` for unit tests
2. **Test isolation**: Each test should be independent and repeatable
3. **Timeout management**: Set appropriate timeouts for DNS operations (30s max)
4. **Resource cleanup**: Properly close database connections, WebSocket connections

### Error Handling Tests
1. **Network failures**: Simulate DNS timeouts, unreachable servers
2. **Invalid input**: Malformed IP addresses, empty configurations
3. **Concurrent operations**: Race conditions, resource contention
4. **Edge cases**: Maximum domain lists, slowest response times

### Documentation Requirements
1. **Test execution guide**: How to run different test suites
2. **Mock data explanation**: Purpose and structure of test fixtures
3. **Performance benchmarks**: Expected response times and thresholds
4. **Troubleshooting guide**: Common test failures and solutions

## 📊 Success Metrics

### Coverage Targets
- **Unit Test Coverage**: ≥85% line coverage, ≥80% branch coverage
- **API Coverage**: 100% of endpoints tested
- **Component Coverage**: All React components have basic render tests
- **Error Path Coverage**: All error scenarios tested

### Performance Benchmarks
- **DNS Resolution**: <100ms average for major DNS providers
- **API Response Times**: <200ms for all endpoints
- **Database Operations**: <50ms for typical queries
- **WebSocket Latency**: <100ms for real-time updates

### Quality Gates
- **All tests pass**: Zero failing tests in CI
- **No flaky tests**: Tests must be deterministic and stable
- **Code quality**: ESLint and TypeScript strict mode passing
- **Security**: No high/critical vulnerabilities in dependencies

## 🚀 Delivery Checklist

### Phase 1 Complete
- [ ] Jest and Playwright configurations working
- [ ] Test project structure created
- [ ] Basic unit tests for DNS service running
- [ ] CI pipeline skeleton functional

### Phase 2 Complete
- [ ] Full unit test coverage for backend services
- [ ] React component testing implemented
- [ ] Mock strategies documented and working
- [ ] Test coverage reports generated

### Phase 3 Complete
- [ ] API integration tests with real DNS queries
- [ ] Database integration tests with all operations
- [ ] WebSocket testing implemented
- [ ] Docker test environment configured

### Phase 4 Complete
- [ ] Critical user journeys automated in Playwright
- [ ] Error scenarios tested end-to-end
- [ ] Cross-browser testing configured
- [ ] Screenshot/video capture on failures

### Phase 5 Complete
- [ ] Performance baselines established
- [ ] Load testing scenarios implemented
- [ ] Performance regression detection
- [ ] Metrics collection and reporting

### Phase 6 Complete
- [ ] GitHub Actions CI pipeline fully functional
- [ ] Test results published and accessible
- [ ] Performance monitoring integrated
- [ ] Documentation complete and accessible

## 📚 Additional Resources

### Useful Testing Patterns
- **AAA Pattern**: Arrange, Act, Assert for clear test structure
- **Page Object Model**: For Playwright E2E tests organization
- **Test Factories**: Generate realistic test data programmatically
- **Custom Matchers**: Domain-specific Jest matchers for DNS operations

### External Tools Integration
- **SonarQube**: Code quality and security analysis
- **Lighthouse CI**: Performance testing for frontend
- **Dependabot**: Automated dependency updates
- **CodeQL**: Security vulnerability scanning

### Monitoring and Alerting
- **Test Results Dashboard**: Visual representation of test health
- **Performance Trending**: Track DNS performance over time
- **Flaky Test Detection**: Identify and fix unreliable tests
- **Coverage Trending**: Monitor test coverage improvements

---

**Next Steps**: Begin with Phase 1 infrastructure setup, then proceed sequentially through each phase. Each phase should be fully complete and validated before moving to the next phase.

**Support**: For questions or blockers, refer to the existing codebase documentation in `/docs/` and the comprehensive CLAUDE.md project guide.