import { promisify } from 'util'
import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import CacheableLookup from 'cacheable-lookup'
import QuickLRU from 'quick-lru'
import type { Logger } from 'pino'
import type { BenchmarkOptions, BenchmarkResult, TestStatus, DNSTestResult } from '@dns-bench/shared'
import type { SettingsService } from './settings.js'
import type { DatabaseService } from './database.js'

class HighPrecisionDNSService {
  private lookupCache: CacheableLookup

  constructor() {
    // Create cacheable-lookup without custom cache to avoid type conflicts
    this.lookupCache = new CacheableLookup()
  }

  async timedLookup(hostname: string, servers: string[]): Promise<{
    success: boolean
    responseTime: number
    timingMethod: 'high-precision' | 'fallback'
    ip?: string
    error?: string
  }> {
    // Set custom DNS servers for this query
    this.lookupCache.servers = servers

    const start = process.hrtime.bigint()

    try {
      const result = await this.lookupCache.lookupAsync(hostname)
      const end = process.hrtime.bigint()

      const durationNs = end - start
      const durationMs = Number(durationNs) / 1000000 // Convert nanoseconds to milliseconds with decimal precision

      return {
        success: true,
        responseTime: durationMs,
        timingMethod: 'high-precision',
        ip: Array.isArray(result) ? result[0].address : result.address
      }
    } catch (error) {
      const end = process.hrtime.bigint()
      const durationNs = end - start
      const durationMs = Number(durationNs) / 1000000 // Convert nanoseconds to milliseconds with decimal precision

      return {
        success: false,
        responseTime: durationMs,
        timingMethod: 'high-precision',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export class DNSBenchmarkService {
  private activeTests = new Map<string, TestStatus>()
  private readonly defaultDomains = [
    // Top Global Sites (Most likely to be cached)
    'google.com',
    'youtube.com',
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'linkedin.com',
    'tiktok.com',
    'amazon.com',
    'microsoft.com',
    'apple.com',
    'netflix.com',
    'wikipedia.org',
    'reddit.com',
    'github.com',
    'stackoverflow.com',

    // Major Search Engines & Services
    'bing.com',
    'yahoo.com',
    'duckduckgo.com',
    'gmail.com',
    'outlook.com',
    'dropbox.com',
    'zoom.us',
    'slack.com',
    'discord.com',
    'whatsapp.com',

    // Major News & Media
    'cnn.com',
    'bbc.com',
    'nytimes.com',
    'theguardian.com',
    'reuters.com',
    'espn.com',
    'twitch.tv',
    'spotify.com',
    'hulu.com',
    'disney.com',

    // E-commerce & Shopping
    'ebay.com',
    'etsy.com',
    'walmart.com',
    'target.com',
    'shopify.com',
    'paypal.com',
    'stripe.com',

    // Technology & Cloud Services
    'cloudflare.com',
    'aws.amazon.com',
    'azure.microsoft.com',
    'heroku.com',
    'digitalocean.com',
    'vercel.com',
    'netlify.com',
    'firebase.google.com',

    // International & Regional
    'baidu.com',
    'yandex.ru',
    'alibaba.com',
    'tencent.com',
    'vk.com',
    'naver.com',
    'yahoo.co.jp',
    'rakuten.com',

    // Educational & Government
    'mit.edu',
    'stanford.edu',
    'harvard.edu',
    'berkeley.edu',
    'gov.uk',
    'canada.ca',

    // Financial Services
    'chase.com',
    'bankofamerica.com',
    'wells.com',
    'americanexpress.com',
    'visa.com',
    'mastercard.com',
    'coinbase.com',

    // Additional Popular Services
    'wordpress.com',
    'medium.com',
    'tumblr.com',
    'pinterest.com',
    'snapchat.com'
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

  private isValidIP(ip: string): boolean {
    const ipv4Regex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
    return ipv4Regex.test(ip) || ipv6Regex.test(ip)
  }

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

    // High-precision DNS timing will be handled per query
    
    // Determine servers to test
    let serversToTest: string[] = []
    
    if (testType === 'quick') {
      // Quick test: Top 3 public DNS (always) + enabled local DNS servers
      const currentServers = await this.getCurrentDNSServers()

      // For quick test, always use top 3 public DNS regardless of user configuration
      const quickTestPublicServers = [
        '1.1.1.1',  // Cloudflare
        '8.8.8.8',  // Google
        '9.9.9.9'   // Quad9
      ]

      serversToTest = [
        ...currentServers,  // Include only enabled local DNS servers
        ...quickTestPublicServers
      ]
    } else if (testType === 'full') {
      // Full test: All enabled local DNS + all enabled public DNS servers
      const localServers = await this.getCurrentDNSServers()
      let publicServers: string[] = []

      if (this.settingsService) {
        // Always use only the enabled servers from user configuration
        publicServers = await this.settingsService.getEnabledPublicDNSServers()
        this.logger.info({ count: publicServers.length, servers: publicServers }, 'Using enabled public DNS servers from settings')
      } else {
        // Only use fallback if no settings service is available
        this.logger.warn('No settings service available, using all default public DNS servers')
        publicServers = Object.values(this.publicDNS)
      }

      serversToTest = [
        ...localServers,  // Include enabled local DNS servers
        ...publicServers  // Include all enabled public DNS servers
      ]
    } else {
      // Custom servers
      serversToTest = servers
    }

    // Remove duplicates
    serversToTest = [...new Set(serversToTest)]
    
    // Determine domains to test using configurable parameters
    let domainCount = 10 // default fallback
    let availableDomains = this.defaultDomains // fallback to hardcoded list

    if (this.settingsService) {
      try {
        // Load custom domain list
        const domainListConfig = await this.settingsService.loadDomainList()
        availableDomains = domainListConfig.domains

        // Load test configuration for domain counts
        const testConfig = await this.settingsService.loadTestConfig()
        switch (testType) {
          case 'quick':
            domainCount = testConfig.domainCounts.quick
            break
          case 'full':
            domainCount = testConfig.domainCounts.full
            break
          case 'custom':
            domainCount = testConfig.domainCounts.custom
            break
        }
      } catch (error) {
        this.logger.debug({ error }, 'Failed to load domain list or test configuration, using defaults')
        domainCount = testType === 'quick' ? 10 : 20
      }
    } else {
      domainCount = testType === 'quick' ? 10 : 20
    }

    const domainsToTest = domains || availableDomains.slice(0, domainCount)
    
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

    // Load configurable performance parameters
    let timeout = 2000
    let retries = 1
    let concurrent = 3
    let rateLimitMs = 0

    if (this.settingsService) {
      try {
        const testConfig = await this.settingsService.loadTestConfig()
        timeout = options?.timeout || testConfig.performance.queryTimeout
        retries = options?.retries || testConfig.performance.maxRetries
        concurrent = options?.concurrent || testConfig.performance.maxConcurrentServers
        rateLimitMs = testConfig.performance.rateLimitMs
      } catch (error) {
        this.logger.debug({ error }, 'Failed to load test configuration for performance settings, using defaults')
        timeout = options?.timeout || 2000
        retries = options?.retries || 1
        concurrent = options?.concurrent || 3
        rateLimitMs = 0
      }
    } else {
      timeout = options?.timeout || 2000
      retries = options?.retries || 1
      concurrent = options?.concurrent || 3
      rateLimitMs = 0
    }
    
    try {
      const allTests: Array<() => Promise<DNSTestResult>> = []
      
      // Create test functions for all server/domain combinations
      for (const server of servers) {
        for (const domain of domains) {
          allTests.push(() => this.testDNSQuery(server, domain, timeout, retries))
        }
      }
      
      // Run tests with concurrency control and rate limiting
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

        // Apply rate limiting between batches (except for the last batch)
        if (rateLimitMs > 0 && i + concurrent < allTests.length) {
          await new Promise(resolve => setTimeout(resolve, rateLimitMs))
        }
      }
      
      // Calculate final statistics
      const serverStats = await this.calculateServerStats(results)

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
            responseCode: result.responseCode || undefined,
            errorType: result.errorType || undefined,
            authoritative: result.authoritative || undefined,
            queryTime: result.queryTime || undefined,
            ipResult: result.ipResult || undefined,
            errorMessage: result.error || undefined,
            rawOutput: result.rawOutput || undefined
          }))
          await this.dbService.saveDomainResults(testId, domainResults)

          // Analyze failures and save analysis
          const failureAnalysisResults = await this.analyzeFailurePatterns(results, domains)
          const failureAnalysis = failureAnalysisResults.consistentFailures.map(failure => ({
            domain: failure,
            consistentFailure: true,
            upstreamShouldResolve: failureAnalysisResults.upstreamValidation[failure] ?? false,
            failurePattern: failureAnalysisResults.upstreamValidation[failure] === false ? 'UPSTREAM_BLOCKED' : 'CONSISTENT_FAILURE'
          }))

          // Add server-specific failures to analysis
          for (const serverFailure of failureAnalysisResults.serverSpecificFailures) {
            for (const domain of serverFailure.domains) {
              failureAnalysis.push({
                domain,
                consistentFailure: false,
                upstreamShouldResolve: failureAnalysisResults.upstreamValidation[domain] ?? false,
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
    timingMethod?: 'high-precision' | 'fallback';
  }> {
    const result: DNSTestResult & {
      responseCode?: string;
      authoritative?: boolean;
      queryTime?: number;
      errorType?: string;
      rawOutput?: string;
      timingMethod?: 'high-precision' | 'fallback';
    } = {
      server,
      domain,
      responseTime: -1,
      success: false
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      const startTime = Date.now()

      // Use high-precision DNS service for robust DNS resolution
      const dnsResult = await this.runDnsQuery(server, domain, timeout)

      if (dnsResult.success) {
        result.responseTime = dnsResult.queryTime || (Date.now() - startTime)
        result.timingMethod = dnsResult.timingMethod || 'fallback'
        result.success = true
        if (dnsResult.ip) result.ip = dnsResult.ip
        if (dnsResult.responseCode) result.responseCode = dnsResult.responseCode
        if (dnsResult.authoritative !== undefined) result.authoritative = dnsResult.authoritative
        if (dnsResult.queryTime !== undefined) result.queryTime = dnsResult.queryTime
        if (dnsResult.rawOutput) result.rawOutput = dnsResult.rawOutput
        break
      } else {
        // Store failure details for analysis
        if (dnsResult.errorType) result.errorType = dnsResult.errorType
        if (dnsResult.responseCode) result.responseCode = dnsResult.responseCode
        if (dnsResult.rawOutput) result.rawOutput = dnsResult.rawOutput
        result.timingMethod = dnsResult.timingMethod || 'fallback'
        result.responseTime = dnsResult.queryTime || (Date.now() - startTime)

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
          ...(result.responseCode && { responseCode: result.responseCode }),
          ...(result.errorType && { errorType: result.errorType })
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
    timingMethod?: 'high-precision' | 'fallback';
  }> {
    const dnsService = new HighPrecisionDNSService()

    try {
      const result = await Promise.race([
        dnsService.timedLookup(domain, [server]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('DNS_TIMEOUT')), timeout)
        )
      ])

      return {
        success: result.success,
        ip: result.ip,
        responseCode: result.success ? 'NOERROR' : 'SERVFAIL',
        queryTime: result.responseTime, // Preserve full precision for statistics calculation
        timingMethod: result.timingMethod,
        rawOutput: result.success
          ? `Resolved ${domain} to ${result.ip}`
          : `Error: ${result.error}`
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Map errors to DNS response codes
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
        queryTime: timeout,
        timingMethod: 'fallback',
        rawOutput: `Error: ${errorMessage}`
      }
    }
  }

  private async calculateServerStats(results: DNSTestResult[]): Promise<BenchmarkResult[]> {
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
        
        // Determine primary timing method used for this server
        const timingMethods = serverTests.map(t => t.timingMethod).filter(Boolean)
        const highPrecisionCount = timingMethods.filter(m => m === 'high-precision').length
        const primaryTimingMethod = highPrecisionCount > timingMethods.length / 2 ? 'high-precision' : 'fallback'

        stats.push({
          server,
          serverName: await this.getServerName(server),
          avgResponseTime: primaryTimingMethod === 'high-precision' ? Math.round(avg * 1000) / 1000 : Math.round(avg * 100) / 100,
          minResponseTime: primaryTimingMethod === 'high-precision' ? Math.round(min * 1000) / 1000 : Math.round(min * 100) / 100,
          maxResponseTime: primaryTimingMethod === 'high-precision' ? Math.round(max * 1000) / 1000 : Math.round(max * 100) / 100,
          medianResponseTime: primaryTimingMethod === 'high-precision' ? Math.round(median * 1000) / 1000 : Math.round(median * 100) / 100,
          successRate: Math.round(successRate * 100) / 100,
          totalQueries: serverTests.length,
          successfulQueries: successfulTests.length,
          failedQueries: serverTests.length - successfulTests.length,
          timingPrecision: primaryTimingMethod
        } as BenchmarkResult)
      } else {
        // Even for failed tests, determine timing method used
        const timingMethods = serverTests.map(t => t.timingMethod).filter(Boolean)
        const highPrecisionCount = timingMethods.filter(m => m === 'high-precision').length
        const primaryTimingMethod = highPrecisionCount > timingMethods.length / 2 ? 'high-precision' : 'fallback'

        stats.push({
          server,
          serverName: await this.getServerName(server),
          avgResponseTime: -1,
          minResponseTime: -1,
          maxResponseTime: -1,
          medianResponseTime: -1,
          successRate: 0,
          totalQueries: serverTests.length,
          successfulQueries: 0,
          failedQueries: serverTests.length,
          timingPrecision: primaryTimingMethod
        } as BenchmarkResult)
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

  private async getServerName(ip: string): Promise<string> {
    // First check if it's a configured public DNS server
    if (this.settingsService) {
      try {
        const serverMap = await this.settingsService.getPublicDNSServerMap()
        const name = serverMap.get(ip)
        if (name) {
          return name
        }
      } catch (error) {
        this.logger.debug({ error, ip }, 'Failed to get server name from configuration')
      }
    }

    // Fallback to hardcoded mapping for backwards compatibility
    for (const [name, serverIP] of Object.entries(this.publicDNS)) {
      if (serverIP === ip) {
        return name
      }
    }

    // For local/custom DNS servers, just use the IP address
    return ip
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
      .map(row => row.map((cell: any) => `"${cell}"`).join(','))
      .join('\n')
  }
}
