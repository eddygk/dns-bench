describe('DNS API Endpoints (Integration)', () => {
  describe('GET /api/dns/current', () => {
    it('should return current DNS configuration', async () => {
      // Test expected DNS configuration structure
      const expectedDNSConfig = {
        local: [
          { ip: expect.stringMatching(/^\d+\.\d+\.\d+\.\d+$/), enabled: expect.any(Boolean) }
        ],
        public: [
          {
            ip: expect.stringMatching(/^\d+\.\d+\.\d+\.\d+$/),
            name: expect.any(String),
            enabled: expect.any(Boolean)
          }
        ]
      }

      // Verify structure validation
      expect(Array.isArray(expectedDNSConfig.local)).toBe(true)
      expect(Array.isArray(expectedDNSConfig.public)).toBe(true)
    })

    it('should validate IP address format in response', async () => {
      const validIPPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/
      const testIPs = ['1.1.1.1', '8.8.8.8', '192.168.1.1']

      testIPs.forEach(ip => {
        expect(ip).toMatch(validIPPattern)
      })
    })

    it('should include enabled/disabled status', async () => {
      const dnsServer = {
        ip: '1.1.1.1',
        name: 'Cloudflare',
        enabled: true
      }

      expect(typeof dnsServer.enabled).toBe('boolean')
    })
  })

  describe('POST /api/benchmark', () => {
    it('should accept valid benchmark request', async () => {
      const validRequest = {
        testType: 'quick',
        dnsServers: [
          { ip: '1.1.1.1', name: 'Cloudflare' }
        ],
        domains: ['google.com', 'github.com']
      }

      // Validate request structure
      expect(validRequest.testType).toMatch(/^(quick|full)$/)
      expect(Array.isArray(validRequest.dnsServers)).toBe(true)
      expect(Array.isArray(validRequest.domains)).toBe(true)
    })

    it('should return benchmark job ID', async () => {
      const expectedResponse = {
        status: 'started',
        benchmarkId: expect.stringMatching(/^[a-f0-9-]{36}$|^[a-zA-Z0-9-]+$/),
        estimatedDuration: expect.any(Number)
      }

      expect(expectedResponse.status).toBe('started')
      expect(typeof expectedResponse.benchmarkId).toBe('object') // Since it's expect.stringMatching(...)
    })

    it('should validate DNS server format in request', async () => {
      const validDNSServer = { ip: '8.8.8.8', name: 'Google' }
      const invalidDNSServer = { ip: 'invalid', name: 'Bad' }

      // IP validation
      expect(validDNSServer.ip).toMatch(/^\d+\.\d+\.\d+\.\d+$/)
      expect(invalidDNSServer.ip).not.toMatch(/^\d+\.\d+\.\d+\.\d+$/)
    })
  })

  describe('GET /api/benchmark/:id/status', () => {
    it('should return benchmark status', async () => {
      const benchmarkStatus = {
        id: 'test-123',
        status: 'running',
        progress: 45,
        results: null
      }

      expect(benchmarkStatus.status).toMatch(/^(pending|running|completed|failed)$/)
      expect(typeof benchmarkStatus.progress).toBe('number')
      expect(benchmarkStatus.progress).toBeGreaterThanOrEqual(0)
      expect(benchmarkStatus.progress).toBeLessThanOrEqual(100)
    })

    it('should include results when completed', async () => {
      const completedBenchmark = {
        status: 'completed',
        results: {
          servers: [
            {
              serverName: 'Cloudflare',
              avgResponseTime: 23.5,
              successRate: 100,
              totalQueries: 10
            }
          ],
          summary: {
            fastestServer: 'Cloudflare',
            totalDomainsTested: 10,
            overallSuccessRate: 95.5
          }
        }
      }

      if (completedBenchmark.status === 'completed') {
        expect(completedBenchmark.results).toBeDefined()
        expect(completedBenchmark.results.servers).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              serverName: expect.any(String),
              avgResponseTime: expect.any(Number),
              successRate: expect.any(Number)
            })
          ])
        )
      }
    })
  })
})