import { promisify } from 'util'
import { spawn } from 'child_process'
import dns from 'dns'
import { randomUUID } from 'crypto'
import { performance } from 'perf_hooks'
import type { Logger } from 'pino'
import type { BenchmarkOptions, BenchmarkResult, TestStatus, DNSTestResult } from '@dns-bench/shared'
import type { SettingsService } from './settings.js'
import type { DatabaseService } from './database.js'

export class DNSBenchmarkService {
  private activeTests = new Map<string, TestStatus>()
  private readonly defaultDomains = [
    'google.com',
    'cloudflare.com',
    'github.com',
    'stackoverflow.com',
    'reddit.com',
    'netflix.com',
    'amazon.com',
    'microsoft.com',
    'apple.com',
    'facebook.com',
    'twitter.com',
    'linkedin.com',
    'wikipedia.org',
    'youtube.com',
    'instagram.com',
    'tiktok.com',
    'discord.com',
    'twitch.tv',
    'baidu.com',
    'yandex.ru'
  ]

  private readonly publicDNS = {
    'Cloudflare Primary': '1.1.1.1',
    'Cloudflare Secondary': '1.0.0.1',
    'Google Primary': '8.8.8.8',
    'Google Secondary': '8.8.4.4',
    'Quad9 Primary': '9.9.9.9',
    'Quad9 Secondary': '149.112.112.112',
    'OpenDNS Primary': '208.67.222.222',
    'OpenDNS Secondary': '208.67.220.220',
    'Level3 Primary': '4.2.2.1',
    'Level3 Secondary': '4.2.2.2'
  }

  constructor(private logger: Logger, private settingsService?: SettingsService, private dbService?: DatabaseService) {}

  // Upstream validation using reliable DNS servers
  private readonly validationServers = ['1.1.1.1', '8.8.8.8', '9.9.9.9']

  async getCurrentDNSServers(): Promise<string[]> {
    try {
      // First, try to get user-configured local DNS servers
      if (this.settingsService) {
        try {
          const configuredServers = await this.settingsService.getConfiguredLocalDNSServers()
          if (configuredServers.length > 0) {
            this.logger.debug({ servers: configuredServers }, 'Using user-configured local DNS servers')
            return configuredServers
          }
        } catch (error) {
          this.logger.debug({ error }, 'Failed to get configured local DNS servers, falling back to auto-detection')
        }
      }

      // Fallback to auto-detection methods
      const methods = [
        this.getResolvConfServers.bind(this),
        this.getSystemdResolveServers.bind(this),
        this.getNetworkManagerServers.bind(this)
      ]

      for (const method of methods) {
        try {
          const servers = await method()
          if (servers.length > 0) {
            // Filter out localhost addresses
            const filtered = servers.filter(server =>
              !server.startsWith('127.') &&
              !server.startsWith('::1') &&
              server !== 'localhost'
            )
            if (filtered.length > 0) {
              this.logger.debug({ servers: filtered, method: method.name }, 'DNS servers detected via auto-detection')
              return filtered
            }
          }
        } catch (error) {
          this.logger.debug({ error, method: method.name }, 'DNS detection method failed')
          continue
        }
      }

      // Final fallback to public DNS
      this.logger.warn('No local DNS servers found, using fallback')
      return ['8.8.8.8']
    } catch (error) {
      this.logger.error({ error }, 'Failed to detect DNS servers')
      throw new Error('Unable to detect current DNS servers')
    }
  }

  private async getResolvConfServers(): Promise<string[]> {
    const fs = await import('fs/promises')
    try {
      const content = await fs.readFile('/etc/resolv.conf', 'utf-8')
      const servers: string[] = []
      
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (trimmed.startsWith('nameserver ')) {
          const server = trimmed.substring(11).trim()
          if (this.isValidIP(server)) {
            servers.push(server)
          }
        }
      }
      
      return servers
    } catch (error) {
      throw new Error('Cannot read /etc/resolv.conf')
    }
  }

  private async getSystemdResolveServers(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const child = spawn('systemd-resolve', ['--status'], { stdio: 'pipe' })
      let output = ''
      
      child.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      child.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error('systemd-resolve failed'))
        }
        
        const servers: string[] = []
        const lines = output.split('\n')
        
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('DNS Servers:') || trimmed.startsWith('Current DNS Server:')) {
            const serverPart = trimmed.split(':')[1]
            if (serverPart) {
              const server = serverPart.trim()
              if (this.isValidIP(server)) {
                servers.push(server)
              }
            }
          }
        }
        
        resolve(servers)
      })
      
      child.on('error', () => {
        reject(new Error('systemd-resolve command not found'))
      })
    })
  }

  private async getNetworkManagerServers(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const child = spawn('nmcli', ['dev', 'show'], { stdio: 'pipe' })
      let output = ''
      
      child.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      child.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error('nmcli failed'))
        }
        
        const servers: string[] = []
        const lines = output.split('\n')
        
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('IP4.DNS[') || trimmed.startsWith('IP6.DNS[')) {
            const parts = trimmed.split(':')
            if (parts.length > 1) {
              const server = parts[1].trim()
              if (this.isValidIP(server)) {
                servers.push(server)
              }
            }
          }
        }
        
        resolve(servers)
      })
      
      child.on('error', () => {
        reject(new Error('nmcli command not found'))
      })
    })
  }


  async startBenchmark(options: {
    servers: string[]
    testType: 'quick' | 'full' | 'custom'
    domains?: string[]
    options?: BenchmarkOptions
  }): Promise<string> {
    const testId = randomUUID()
    const { servers, testType, domains, options: benchmarkOptions } = options
    
    // Determine servers to test
    let serversToTest: string[] = []
    
    if (testType === 'quick') {
      // Top 3 public DNS + current
      const currentServers = await this.getCurrentDNSServers()
      serversToTest = [
        ...currentServers.slice(0, 2),
        '1.1.1.1', // Cloudflare
        '8.8.8.8', // Google
        '9.9.9.9'  // Quad9
      ]
    } else if (testType === 'full') {
      // All public DNS servers
      serversToTest = Object.values(this.publicDNS)
    } else {
      // Custom servers
      serversToTest = servers
    }

    // Remove duplicates
    serversToTest = [...new Set(serversToTest)]
    
    // Determine domains to test
    const domainsToTest = domains || this.defaultDomains.slice(0, testType === 'quick' ? 10 : 20)
    
    // Initialize test status
    const testStatus: TestStatus = {
      testId,
      status: 'running',
      progress: 0,
      startedAt: new Date(),
      servers: serversToTest,
      domains: domainsToTest,
      results: [],
      totalTests: serversToTest.length * domainsToTest.length
    }
    
    this.activeTests.set(testId, testStatus)
    
    // Start benchmark asynchronously
    this.runBenchmark(testId, serversToTest, domainsToTest, benchmarkOptions).catch(error => {
      this.logger.error({ error, testId }, 'Benchmark failed')
      const status = this.activeTests.get(testId)
      if (status) {
        status.status = 'failed'
        status.error = error.message
        status.completedAt = new Date()
      }
    })
    
    return testId
  }

  private async runBenchmark(
    testId: string,
    servers: string[],
    domains: string[],
    options?: BenchmarkOptions
  ): Promise<void> {
    const status = this.activeTests.get(testId)!
    const timeout = options?.timeout || 2000
    const retries = options?.retries || 1
    const concurrent = options?.concurrent || 3
    
    try {
      const allTests: Array<() => Promise<DNSTestResult>> = []
      
      // Create test functions for all server/domain combinations
      for (const server of servers) {
        for (const domain of domains) {
          allTests.push(() => this.testDNSQuery(server, domain, timeout, retries))
        }
      }
      
      // Run tests with concurrency control
      const results: DNSTestResult[] = []
      let completedTests = 0
      
      for (let i = 0; i < allTests.length; i += concurrent) {
        const batch = allTests.slice(i, i + concurrent)
        const batchResults = await Promise.allSettled(batch.map(test => test()))
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value)
          } else {
            // Create error result
            results.push({
              server: 'unknown',
              domain: 'unknown',
              responseTime: -1,
              success: false,
              error: result.reason?.message || 'Test failed'
            })
          }
          
          completedTests++
          status.progress = Math.round((completedTests / status.totalTests) * 100)
        }
      }
      
      // Calculate final statistics
      const serverStats = this.calculateServerStats(results)

      status.status = 'completed'
      status.completedAt = new Date()
      status.results = serverStats
      status.progress = 100

      // Save results to database
      if (this.dbService) {
        try {
          // Save basic test run
          await this.dbService.saveTestRun(status)

          // Save detailed domain results
          const domainResults = results.map(result => ({
            serverIp: result.server,
            domain: result.domain,
            success: result.success,
            responseTime: result.responseTime,
            responseCode: result.responseCode,
            errorType: result.errorType,
            authoritative: result.authoritative,
            queryTime: result.queryTime,
            ipResult: result.ipResult,
            errorMessage: result.error,
            rawOutput: result.rawOutput
          }))
          await this.dbService.saveDomainResults(testId, domainResults)

          // Analyze failures and save analysis
          const failureAnalysisResults = await this.analyzeFailurePatterns(results, domains)
          const failureAnalysis = failureAnalysisResults.consistentFailures.map(failure => ({
            domain: failure.domain,
            consistentFailure: true,
            upstreamShouldResolve: failure.upstreamValidation?.shouldResolve,
            failurePattern: failure.upstreamValidation?.shouldResolve === false ? 'UPSTREAM_BLOCKED' : 'CONSISTENT_FAILURE'
          }))

          // Add server-specific failures to analysis
          for (const serverFailure of failureAnalysisResults.serverSpecificFailures) {
            for (const domain of serverFailure.domains) {
              failureAnalysis.push({
                domain,
                consistentFailure: false,
                failurePattern: `SERVER_SPECIFIC_${serverFailure.pattern}`
              })
            }
          }

          if (failureAnalysis.length > 0) {
            await this.dbService.saveFailureAnalysis(testId, failureAnalysis)
          }

          this.logger.debug({ testId, domainResults: domainResults.length, failureAnalysis: failureAnalysis.length }, 'Detailed test results saved to database')
        } catch (error) {
          this.logger.error({ error, testId }, 'Failed to save test results to database')
        }
      }

      this.logger.info({ testId, duration: status.completedAt.getTime() - status.startedAt.getTime() }, 'Benchmark completed')
    } catch (error) {
      status.status = 'failed'
      status.error = error instanceof Error ? error.message : 'Unknown error'
      status.completedAt = new Date()
      throw error
    }
  }

  private async testDNSQuery(
    server: string,
    domain: string,
    timeout: number,
    retries: number
  ): Promise<DNSTestResult & {
    responseCode?: string;
    authoritative?: boolean;
    queryTime?: number;
    errorType?: string;
    rawOutput?: string;
  }> {
    const result: DNSTestResult & {
      responseCode?: string;
      authoritative?: boolean;
      queryTime?: number;
      errorType?: string;
      rawOutput?: string;
    } = {
      server,
      domain,
      responseTime: -1,
      success: false
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      const startTime = Date.now()

      // Use Node.js DNS for robust DNS resolution
      const dnsResult = await this.runDnsQuery(server, domain, timeout)

      if (dnsResult.success) {
        result.responseTime = dnsResult.queryTime || (Date.now() - startTime)
        result.success = true
        result.ip = dnsResult.ip
        result.responseCode = dnsResult.responseCode
        result.authoritative = dnsResult.authoritative
        result.queryTime = dnsResult.queryTime
        result.rawOutput = dnsResult.rawOutput
        result.ipResult = dnsResult.ip
        break
      } else {
        // Store failure details for analysis
        result.errorType = dnsResult.errorType
        result.responseCode = dnsResult.responseCode
        result.rawOutput = dnsResult.rawOutput

        // If this is the last attempt, set the error message
        if (attempt === retries) {
          result.error = `DNS query failed: ${dnsResult.errorType || 'Unknown error'}`
        }
      }
    }

    return result
  }

  // Validate if a domain should resolve by testing against reliable upstream DNS servers
  async validateDomainUpstream(domain: string): Promise<{
    shouldResolve: boolean;
    upstreamResults: Array<{
      server: string;
      success: boolean;
      responseCode?: string;
      errorType?: string;
    }>;
  }> {
    const upstreamResults = []
    let successCount = 0

    for (const server of this.validationServers) {
      try {
        const result = await this.runDnsQuery(server, domain, 5000) // 5 second timeout for validation
        upstreamResults.push({
          server,
          success: result.success,
          responseCode: result.responseCode,
          errorType: result.errorType
        })
        if (result.success) {
          successCount++
        }
      } catch (error) {
        upstreamResults.push({
          server,
          success: false,
          errorType: error instanceof Error ? error.message : 'VALIDATION_FAILED'
        })
      }
    }

    // Domain should resolve if at least 2 out of 3 reliable servers can resolve it
    const shouldResolve = successCount >= 2

    return {
      shouldResolve,
      upstreamResults
    }
  }

  // Enhanced method to analyze failure patterns
  async analyzeFailurePatterns(
    testResults: Array<DNSTestResult & { responseCode?: string; errorType?: string }>,
    domains: string[]
  ): Promise<{
    consistentFailures: string[]; // Domains that consistently fail across servers
    serverSpecificFailures: Array<{ server: string; domains: string[]; pattern: string }>;
    upstreamValidation: Record<string, boolean>; // Which domains should resolve upstream
  }> {
    // Group results by domain
    const domainResults: Record<string, Array<typeof testResults[0]>> = {}
    for (const result of testResults) {
      if (!domainResults[result.domain]) {
        domainResults[result.domain] = []
      }
      domainResults[result.domain].push(result)
    }

    // Find consistently failing domains (fail on all or most servers)
    const consistentFailures: string[] = []
    const upstreamValidation: Record<string, boolean> = {}

    for (const domain of domains) {
      const results = domainResults[domain] || []
      const failureRate = results.filter(r => !r.success).length / results.length

      if (failureRate >= 0.8) { // 80% or more failures
        consistentFailures.push(domain)

        // Validate upstream to determine if this is expected
        try {
          const validation = await this.validateDomainUpstream(domain)
          upstreamValidation[domain] = validation.shouldResolve

          if (!validation.shouldResolve) {
            this.logger.info({ domain, upstreamResults: validation.upstreamResults },
              'Domain consistently fails - confirmed as non-resolvable upstream')
          } else {
            this.logger.warn({ domain, upstreamResults: validation.upstreamResults },
              'Domain consistently fails but should resolve upstream - possible blocking')
          }
        } catch (error) {
          this.logger.error({ domain, error }, 'Failed to validate domain upstream')
        }
      }
    }

    // Analyze server-specific failure patterns
    const serverSpecificFailures: Array<{ server: string; domains: string[]; pattern: string }> = []
    const serverResults: Record<string, Array<typeof testResults[0]>> = {}

    for (const result of testResults) {
      if (!serverResults[result.server]) {
        serverResults[result.server] = []
      }
      serverResults[result.server].push(result)
    }

    for (const [server, results] of Object.entries(serverResults)) {
      const failedDomains = results.filter(r => !r.success).map(r => r.domain)
      if (failedDomains.length > 0) {
        // Determine failure pattern
        let pattern = 'MIXED_FAILURES'
        const errorTypes = results.filter(r => !r.success).map(r => r.errorType).filter(Boolean)
        const uniqueErrorTypes = [...new Set(errorTypes)]

        if (uniqueErrorTypes.length === 1) {
          pattern = uniqueErrorTypes[0] || 'UNKNOWN'
        } else if (errorTypes.filter(e => e === 'DOMAIN_NOT_FOUND').length > errorTypes.length * 0.7) {
          pattern = 'MOSTLY_NXDOMAIN'
        } else if (errorTypes.filter(e => e === 'SERVER_FAILURE').length > errorTypes.length * 0.7) {
          pattern = 'MOSTLY_SERVFAIL'
        }

        serverSpecificFailures.push({
          server,
          domains: failedDomains,
          pattern
        })
      }
    }

    return {
      consistentFailures,
      serverSpecificFailures,
      upstreamValidation
    }
  }

  private async runDnsQuery(
    server: string,
    domain: string,
    timeout: number
  ): Promise<{
    success: boolean;
    ip?: string;
    responseCode?: string;
    authoritative?: boolean;
    queryTime?: number;
    errorType?: string;
    rawOutput?: string;
  }> {
    const startTime = performance.now()

    try {
      // Create a custom resolver with the specified DNS server
      const resolver = new dns.Resolver()
      resolver.setServers([server])

      // Promisify the resolve4 method for A records
      const resolve4 = promisify(resolver.resolve4.bind(resolver))

      // Set timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('DNS_TIMEOUT')), timeout)
      })

      // Race between DNS resolution and timeout
      const addresses = await Promise.race([
        resolve4(domain),
        timeoutPromise
      ])

      const queryTime = performance.now() - startTime

      if (addresses && addresses.length > 0) {
        return {
          success: true,
          ip: addresses[0], // Return first IP address
          responseCode: 'NOERROR',
          authoritative: false, // Node.js DNS doesn't provide this info easily
          queryTime: Math.round(queryTime),
          rawOutput: `Resolved ${domain} to ${addresses.join(', ')}`
        }
      } else {
        return {
          success: false,
          responseCode: 'NODATA',
          errorType: 'NO_ADDRESSES',
          queryTime: Math.round(queryTime),
          rawOutput: `No addresses found for ${domain}`
        }
      }
    } catch (error) {
      const queryTime = performance.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Map Node.js DNS errors to standard DNS response codes
      let responseCode = 'SERVFAIL'
      let errorType = 'SERVER_FAILURE'

      if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('queryA ENOTFOUND')) {
        responseCode = 'NXDOMAIN'
        errorType = 'DOMAIN_NOT_FOUND'
      } else if (errorMessage.includes('ECONNREFUSED')) {
        responseCode = 'REFUSED'
        errorType = 'SERVER_REFUSED'
      } else if (errorMessage.includes('ETIMEOUT') || errorMessage.includes('DNS_TIMEOUT')) {
        responseCode = 'TIMEOUT'
        errorType = 'QUERY_TIMEOUT'
      } else if (errorMessage.includes('ENETUNREACH') || errorMessage.includes('EHOSTUNREACH')) {
        errorType = 'SERVER_UNREACHABLE'
      }

      return {
        success: false,
        responseCode,
        errorType,
        queryTime: Math.round(queryTime),
        rawOutput: `Error: ${errorMessage}`
      }
    }
  }

  private calculateServerStats(results: DNSTestResult[]): BenchmarkResult[] {
    const serverResults = new Map<string, DNSTestResult[]>()
    
    // Group results by server
    for (const result of results) {
      if (!serverResults.has(result.server)) {
        serverResults.set(result.server, [])
      }
      serverResults.get(result.server)!.push(result)
    }
    
    // Calculate statistics for each server
    const stats: BenchmarkResult[] = []
    
    for (const [server, serverTests] of serverResults.entries()) {
      const successfulTests = serverTests.filter(t => t.success && t.responseTime > 0)
      const successRate = (successfulTests.length / serverTests.length) * 100
      
      if (successfulTests.length > 0) {
        const responseTimes = successfulTests.map(t => t.responseTime)
        responseTimes.sort((a, b) => a - b)
        
        const avg = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        const min = responseTimes[0]
        const max = responseTimes[responseTimes.length - 1]
        const median = responseTimes[Math.floor(responseTimes.length / 2)]
        
        stats.push({
          server,
          serverName: this.getServerName(server),
          avgResponseTime: Math.round(avg * 100) / 100,
          minResponseTime: min,
          maxResponseTime: max,
          medianResponseTime: median,
          successRate: Math.round(successRate * 100) / 100,
          totalQueries: serverTests.length,
          successfulQueries: successfulTests.length,
          failedQueries: serverTests.length - successfulTests.length
        })
      } else {
        stats.push({
          server,
          serverName: this.getServerName(server),
          avgResponseTime: -1,
          minResponseTime: -1,
          maxResponseTime: -1,
          medianResponseTime: -1,
          successRate: 0,
          totalQueries: serverTests.length,
          successfulQueries: 0,
          failedQueries: serverTests.length
        })
      }
    }
    
    // Sort by average response time (fastest first)
    stats.sort((a, b) => {
      if (a.successRate === 0 && b.successRate === 0) return 0
      if (a.successRate === 0) return 1
      if (b.successRate === 0) return -1
      return a.avgResponseTime - b.avgResponseTime
    })
    
    return stats
  }

  private getServerName(ip: string): string {
    for (const [name, serverIP] of Object.entries(this.publicDNS)) {
      if (serverIP === ip) {
        return name
      }
    }
    // For local/custom DNS servers, use consistent naming with frontend
    if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.')) {
      return `Current-${ip}`
    }
    return `Custom-${ip}`
  }

  getBenchmarkStatus(testId: string): TestStatus | null {
    return this.activeTests.get(testId) || null
  }

  exportToCSV(result: any): string {
    const headers = [
      'Rank',
      'Server Name',
      'Server IP',
      'Avg Response Time (ms)',
      'Min Response Time (ms)',
      'Max Response Time (ms)',
      'Median Response Time (ms)',
      'Success Rate (%)',
      'Total Queries',
      'Successful Queries',
      'Failed Queries'
    ]
    
    const rows = result.results.map((r: BenchmarkResult, index: number) => [
      index + 1,
      r.serverName,
      r.server,
      r.avgResponseTime,
      r.minResponseTime,
      r.maxResponseTime,
      r.medianResponseTime,
      r.successRate,
      r.totalQueries,
      r.successfulQueries,
      r.failedQueries
    ])
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
  }
}
