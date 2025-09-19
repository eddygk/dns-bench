import { promisify } from 'util'
import { spawn } from 'child_process'
import dns from 'dns'
import fs from 'fs/promises'
import path from 'path'
import type { Logger } from 'pino'
import type { CORSSettings, ServerSettings, LocalDNSConfig, PublicDNSConfig, PublicDNSServer, TestConfiguration, DomainListConfig } from '@dns-bench/shared'

const reverseLookup = promisify(dns.reverse)

export class SettingsService {
  private settingsFile = path.join(process.cwd(), 'settings.json')
  private localDNSFile = path.join(process.cwd(), 'local-dns.json')
  private publicDNSFile = path.join(process.cwd(), 'public-dns.json')
  private testConfigFile = path.join(process.cwd(), 'test-config.json')
  private defaultSettings: ServerSettings = {
    cors: {
      allowIPAccess: true,
      allowHostnameAccess: true,
      customOrigins: []
    },
    port: 3001,
    logLevel: 'info'
  }

  private defaultLocalDNS: LocalDNSConfig = {
    servers: [
      { ip: '', enabled: true }
    ]
  }

  private defaultPublicDNS: PublicDNSConfig = {
    servers: [
      { id: 'cloudflare-primary', name: 'Cloudflare Primary', ip: '1.1.1.1', provider: 'Cloudflare', enabled: true, isPrimary: true },
      { id: 'cloudflare-secondary', name: 'Cloudflare Secondary', ip: '1.0.0.1', provider: 'Cloudflare', enabled: true, isPrimary: false },
      { id: 'google-primary', name: 'Google Primary', ip: '8.8.8.8', provider: 'Google', enabled: true, isPrimary: true },
      { id: 'google-secondary', name: 'Google Secondary', ip: '8.8.4.4', provider: 'Google', enabled: true, isPrimary: false },
      { id: 'quad9-primary', name: 'Quad9 Primary', ip: '9.9.9.9', provider: 'Quad9', enabled: true, isPrimary: true },
      { id: 'quad9-secondary', name: 'Quad9 Secondary', ip: '149.112.112.112', provider: 'Quad9', enabled: true, isPrimary: false },
      { id: 'opendns-primary', name: 'OpenDNS Primary', ip: '208.67.222.222', provider: 'OpenDNS', enabled: false, isPrimary: true },
      { id: 'opendns-secondary', name: 'OpenDNS Secondary', ip: '208.67.220.220', provider: 'OpenDNS', enabled: false, isPrimary: false },
      { id: 'level3-primary', name: 'Level3 Primary', ip: '4.2.2.1', provider: 'Level3', enabled: false, isPrimary: true },
      { id: 'level3-secondary', name: 'Level3 Secondary', ip: '4.2.2.2', provider: 'Level3', enabled: false, isPrimary: false }
    ]
  }

  private defaultTestConfig: TestConfiguration = {
    domainCounts: {
      quick: 10,
      full: 20,
      custom: 30
    },
    queryTypes: {
      cached: true,
      uncached: true,
      dotcom: false
    },
    performance: {
      maxConcurrentServers: 3,
      queryTimeout: 2000,
      maxRetries: 1,
      rateLimitMs: 100
    },
    analysis: {
      detectRedirection: true,
      detectMalwareBlocking: false,
      testDNSSEC: false,
      minReliabilityThreshold: 95
    }
  }

  constructor(private logger: Logger) {
    this.initializeSettings()
  }

  private async initializeSettings(): Promise<void> {
    try {
      // Try to load existing settings
      await this.loadSettings()
    } catch (error) {
      // If no settings file exists, create one with defaults
      this.logger.info('Creating default settings file')
      await this.saveSettings(this.defaultSettings)
    }

    // Auto-detect hostname if enabled (host IP auto-detection removed)
    const settings = await this.loadSettings()
    if (settings.cors.autoDetectHostname) {
      const hostname = await this.detectHostname()

      let updated = false
      if (hostname && hostname !== settings.cors.detectedHostname) {
        settings.cors.detectedHostname = hostname
        updated = true
        this.logger.info({ hostname }, 'Auto-detected hostname')
      }

      if (updated) {
        await this.saveSettings(settings)
      }
    }
  }

  async loadSettings(): Promise<ServerSettings> {
    try {
      const data = await fs.readFile(this.settingsFile, 'utf-8')
      const settings = JSON.parse(data)
      return { ...this.defaultSettings, ...settings }
    } catch (error) {
      return this.defaultSettings
    }
  }

  async saveSettings(settings: ServerSettings): Promise<void> {
    try {
      await fs.writeFile(this.settingsFile, JSON.stringify(settings, null, 2))
      this.logger.debug('Settings saved successfully')
    } catch (error) {
      this.logger.error({ error }, 'Failed to save settings')
      throw new Error('Failed to save settings')
    }
  }

  async updateCORSSettings(corsSettings: CORSSettings): Promise<ServerSettings> {
    const currentSettings = await this.loadSettings()
    const updatedSettings = {
      ...currentSettings,
      cors: { ...corsSettings }
    }

    // Auto-detect hostname and host IP if enabled
    if (corsSettings.autoDetectHostname) {
      const hostname = await this.detectHostname()
      const hostIP = await this.getDockerHostIP()

      if (hostname) {
        updatedSettings.cors.detectedHostname = hostname
      }

      if (hostIP) {
        updatedSettings.cors.detectedHostIP = hostIP
      }
    }

    await this.saveSettings(updatedSettings)
    this.logger.info({ corsSettings }, 'CORS settings updated')
    return updatedSettings
  }

  async detectHostname(): Promise<string | null> {
    try {
      // Method 1: Try to get hostname from system
      const systemHostname = await this.getSystemHostname()
      if (systemHostname && systemHostname !== 'localhost') {
        // Try reverse DNS lookup to get FQDN
        const fqdn = await this.getHostnameFQDN(systemHostname)
        return fqdn || systemHostname
      }

      // Method 2: Host IP detection removed (unreliable in Docker)

      // Method 3: Try container IP as fallback
      const containerIP = await this.getLocalIP()
      if (containerIP) {
        const hostname = await this.reverseResolveIP(containerIP)
        if (hostname && hostname !== containerIP) {
          return hostname
        }
      }

      return null
    } catch (error) {
      this.logger.debug({ error }, 'Failed to detect hostname')
      return null
    }
  }


  private isValidIP(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    return ipRegex.test(ip)
  }








  private hexToIP(hex: string): string | null {
    try {
      // Convert little-endian hex to IP
      if (hex.length !== 8) return null

      const bytes = []
      for (let i = 6; i >= 0; i -= 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16))
      }

      return bytes.join('.')
    } catch (error) {
      return null
    }
  }

  private async getSystemHostname(): Promise<string | null> {
    return new Promise((resolve) => {
      const child = spawn('hostname', ['-f'], { stdio: 'pipe' })
      let output = ''

      child.stdout.on('data', (data) => {
        output += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0 && output.trim()) {
          resolve(output.trim())
        } else {
          // Fallback to simple hostname
          const simpleChild = spawn('hostname', [], { stdio: 'pipe' })
          let simpleOutput = ''

          simpleChild.stdout.on('data', (data) => {
            simpleOutput += data.toString()
          })

          simpleChild.on('close', (simpleCode) => {
            resolve(simpleCode === 0 && simpleOutput.trim() ? simpleOutput.trim() : null)
          })
        }
      })

      child.on('error', () => {
        resolve(null)
      })
    })
  }

  private async getHostnameFQDN(hostname: string): Promise<string | null> {
    return new Promise((resolve) => {
      const child = spawn('nslookup', [hostname], { stdio: 'pipe' })
      let output = ''

      child.stdout.on('data', (data) => {
        output += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          // Parse nslookup output for canonical name
          const lines = output.split('\n')
          for (const line of lines) {
            if (line.includes('canonical name') || line.includes('Name:')) {
              const match = line.match(/(?:canonical name = |Name:\s*)([^\s]+)/)
              if (match && match[1] !== hostname) {
                resolve(match[1])
                return
              }
            }
          }
        }
        resolve(null)
      })

      child.on('error', () => {
        resolve(null)
      })
    })
  }

  private async getLocalIP(): Promise<string | null> {
    // Method 1: Try ip addr show (most reliable on modern Linux)
    const ipFromAddr = await this.getIPFromCommand('ip', ['addr', 'show'])
    if (ipFromAddr) return ipFromAddr

    // Method 2: Try ip route get (fallback)
    const ipFromRoute = await this.getIPFromRoute()
    if (ipFromRoute) return ipFromRoute

    // Method 3: Try ifconfig (legacy systems)
    const ipFromIfconfig = await this.getIPFromCommand('ifconfig', [])
    if (ipFromIfconfig) return ipFromIfconfig

    return null
  }

  private async getIPFromCommand(command: string, args: string[]): Promise<string | null> {
    return new Promise((resolve) => {
      const child = spawn(command, args, { stdio: 'pipe' })
      let output = ''

      child.stdout.on('data', (data) => {
        output += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          // Extract non-loopback IP addresses
          const ipRegex = /inet (\d+\.\d+\.\d+\.\d+)/g
          const matches = Array.from(output.matchAll(ipRegex))

          for (const match of matches) {
            const ip = match[1]
            // Skip loopback and docker interfaces
            if (!ip.startsWith('127.') && !ip.startsWith('172.17.') && !ip.startsWith('172.18.')) {
              resolve(ip)
              return
            }
          }
        }
        resolve(null)
      })

      child.on('error', () => {
        resolve(null)
      })
    })
  }

  private async getIPFromRoute(): Promise<string | null> {
    return new Promise((resolve) => {
      const child = spawn('ip', ['route', 'get', '8.8.8.8'], { stdio: 'pipe' })
      let output = ''

      child.stdout.on('data', (data) => {
        output += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          const match = output.match(/src\s+(\d+\.\d+\.\d+\.\d+)/)
          resolve(match ? match[1] : null)
        } else {
          resolve(null)
        }
      })

      child.on('error', () => {
        resolve(null)
      })
    })
  }

  private async reverseResolveIP(ip: string): Promise<string | null> {
    try {
      const hostnames = await reverseLookup(ip)
      return hostnames && hostnames.length > 0 ? hostnames[0] : null
    } catch (error) {
      return null
    }
  }

  generateCORSOrigins(settings: CORSSettings): (string | RegExp)[] {
    const origins: (string | RegExp)[] = []

    // Always allow localhost access
    origins.push(
      /^http:\/\/localhost:3000$/,
      /^http:\/\/127\.0\.0\.1:3000$/
    )

    if (settings.allowIPAccess) {
      origins.push(/^http:\/\/[\d\.]+:3000$/)
    }

    if (settings.allowHostnameAccess) {
      origins.push(/^http:\/\/[^:]+:3000$/)
    }

    // Add custom hostname if specified
    if (settings.customHostname) {
      origins.push(`http://${settings.customHostname}:3000`)
    }

    // Add detected hostname if available
    if (settings.detectedHostname) {
      origins.push(`http://${settings.detectedHostname}:3000`)
    }

    // Add custom origins
    settings.customOrigins.forEach(origin => {
      if (origin.trim()) {
        origins.push(origin.trim())
      }
    })

    return origins
  }

  checkOrigin(origin: string, settings: CORSSettings): boolean {
    if (!origin) return true // Allow requests with no origin

    const allowedOrigins = this.generateCORSOrigins(settings)

    return allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin)
      }
      return false
    })
  }

  // Local DNS Configuration methods
  async loadLocalDNSConfig(): Promise<LocalDNSConfig> {
    try {
      const content = await fs.readFile(this.localDNSFile, 'utf-8')
      const config = JSON.parse(content)

      // Check if this is the old format and migrate
      if (config.primary || config.secondary || config.tertiary) {
        this.logger.info('Migrating local DNS config from old format to new format')
        const migratedConfig = this.migrateLocalDNSConfig(config)
        // Save the migrated config
        await this.saveLocalDNSConfig(migratedConfig)
        return migratedConfig
      }

      this.logger.debug(config, 'Loaded local DNS configuration')
      return config as LocalDNSConfig
    } catch (error) {
      this.logger.debug('No local DNS config found, using defaults')
      return { ...this.defaultLocalDNS }
    }
  }

  private migrateLocalDNSConfig(oldConfig: any): LocalDNSConfig {
    const servers: LocalDNSServer[] = []

    // Migrate primary
    if (oldConfig.primary && oldConfig.primary.ip) {
      servers.push({
        ip: oldConfig.primary.ip,
        enabled: oldConfig.primary.enabled !== false
      })
    }

    // Migrate secondary
    if (oldConfig.secondary && oldConfig.secondary.ip) {
      servers.push({
        ip: oldConfig.secondary.ip,
        enabled: oldConfig.secondary.enabled !== false
      })
    }

    // Migrate tertiary
    if (oldConfig.tertiary && oldConfig.tertiary.ip) {
      servers.push({
        ip: oldConfig.tertiary.ip,
        enabled: oldConfig.tertiary.enabled !== false
      })
    }

    // Ensure at least one server exists
    if (servers.length === 0) {
      servers.push({ ip: '', enabled: true })
    }

    return { servers }
  }

  async saveLocalDNSConfig(config: LocalDNSConfig): Promise<LocalDNSConfig> {
    try {
      // Validate the configuration
      this.validateLocalDNSConfig(config)

      await fs.writeFile(this.localDNSFile, JSON.stringify(config, null, 2))
      this.logger.info(config, 'Saved local DNS configuration')
      return config
    } catch (error) {
      this.logger.error({ error }, 'Failed to save local DNS configuration')
      throw error
    }
  }

  private validateLocalDNSConfig(config: LocalDNSConfig): void {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/

    if (!config.servers || config.servers.length === 0) {
      throw new Error('At least one DNS server is required')
    }

    if (config.servers.length > 10) {
      throw new Error('Maximum of 10 DNS servers allowed')
    }

    // Validate each server
    for (let i = 0; i < config.servers.length; i++) {
      const server = config.servers[i]

      if (server.enabled && !server.ip) {
        throw new Error(`DNS server ${i + 1} IP is required when enabled`)
      }

      if (server.enabled && !ipRegex.test(server.ip)) {
        throw new Error(`DNS server ${i + 1} must have a valid IP address`)
      }
    }

    // Check for duplicate IPs
    const enabledIPs = config.servers.filter(s => s.enabled && s.ip).map(s => s.ip)
    const uniqueIPs = new Set(enabledIPs)
    if (enabledIPs.length !== uniqueIPs.size) {
      throw new Error('Duplicate DNS server IP addresses are not allowed')
    }
  }

  getConfiguredLocalDNSServers(): string[] {
    // This method will be called by the DNS benchmark service
    return this.loadLocalDNSConfig().then(config => {
      return config.servers
        .filter(server => server.enabled && server.ip)
        .map(server => server.ip)
    })
  }

  // Public DNS Configuration Management
  async loadPublicDNSConfig(): Promise<PublicDNSConfig> {
    try {
      const data = await fs.readFile(this.publicDNSFile, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      // If no config file exists, create one with defaults
      this.logger.info('Creating default public DNS configuration file')
      await this.savePublicDNSConfig(this.defaultPublicDNS)
      return this.defaultPublicDNS
    }
  }

  async savePublicDNSConfig(config: PublicDNSConfig): Promise<PublicDNSConfig> {
    try {
      this.validatePublicDNSConfig(config)
      await fs.writeFile(this.publicDNSFile, JSON.stringify(config, null, 2))
      this.logger.info({ serversCount: config.servers.length }, 'Public DNS configuration saved')
      return config
    } catch (error) {
      this.logger.error({ error }, 'Failed to save public DNS configuration')
      throw error
    }
  }

  private validatePublicDNSConfig(config: PublicDNSConfig): void {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/

    if (!config.servers || config.servers.length === 0) {
      throw new Error('At least one DNS server is required')
    }

    if (config.servers.length > 20) {
      throw new Error('Maximum of 20 DNS servers allowed')
    }

    // Validate each server
    for (let i = 0; i < config.servers.length; i++) {
      const server = config.servers[i]

      if (!server.id || !server.name || !server.ip || !server.provider) {
        throw new Error(`DNS server ${i + 1} is missing required fields`)
      }

      if (!ipRegex.test(server.ip)) {
        throw new Error(`DNS server ${i + 1} must have a valid IP address`)
      }
    }

    // Check for duplicate IDs
    const ids = config.servers.map(s => s.id)
    const uniqueIds = new Set(ids)
    if (ids.length !== uniqueIds.size) {
      throw new Error('Duplicate DNS server IDs are not allowed')
    }

    // Check for duplicate IPs
    const ips = config.servers.map(s => s.ip)
    const uniqueIPs = new Set(ips)
    if (ips.length !== uniqueIPs.size) {
      throw new Error('Duplicate DNS server IP addresses are not allowed')
    }
  }

  async getEnabledPublicDNSServers(): Promise<string[]> {
    const config = await this.loadPublicDNSConfig()
    return config.servers
      .filter(server => server.enabled)
      .map(server => server.ip)
  }

  async getPublicDNSServerMap(): Promise<Map<string, string>> {
    const config = await this.loadPublicDNSConfig()
    const map = new Map<string, string>()
    config.servers
      .filter(server => server.enabled)
      .forEach(server => {
        map.set(server.ip, server.name)
      })
    return map
  }

  // Test Configuration Management
  async loadTestConfig(): Promise<TestConfiguration> {
    try {
      const data = await fs.readFile(this.testConfigFile, 'utf-8')
      const config = JSON.parse(data)
      return { ...this.defaultTestConfig, ...config }
    } catch (error) {
      this.logger.debug('No test config found, using defaults')
      return { ...this.defaultTestConfig }
    }
  }

  async saveTestConfig(config: TestConfiguration): Promise<TestConfiguration> {
    try {
      this.validateTestConfig(config)
      await fs.writeFile(this.testConfigFile, JSON.stringify(config, null, 2))
      this.logger.info(config, 'Test configuration saved')
      return config
    } catch (error) {
      this.logger.error({ error }, 'Failed to save test configuration')
      throw error
    }
  }

  private validateTestConfig(config: TestConfiguration): void {
    // Validate domain counts
    if (!config.domainCounts) {
      throw new Error('Domain counts configuration is required')
    }

    if (config.domainCounts.quick < 5 || config.domainCounts.quick > 50) {
      throw new Error('Quick test domain count must be between 5 and 50')
    }

    if (config.domainCounts.full < 10 || config.domainCounts.full > 200) {
      throw new Error('Full test domain count must be between 10 and 200')
    }

    if (config.domainCounts.custom < 1 || config.domainCounts.custom > 500) {
      throw new Error('Custom test domain count must be between 1 and 500')
    }

    // Validate query types (at least one must be enabled)
    if (!config.queryTypes || (!config.queryTypes.cached && !config.queryTypes.uncached && !config.queryTypes.dotcom)) {
      throw new Error('At least one query type must be enabled')
    }

    // Validate performance settings
    if (!config.performance) {
      throw new Error('Performance configuration is required')
    }

    if (config.performance.maxConcurrentServers < 1 || config.performance.maxConcurrentServers > 10) {
      throw new Error('Max concurrent servers must be between 1 and 10')
    }

    if (config.performance.queryTimeout < 1000 || config.performance.queryTimeout > 10000) {
      throw new Error('Query timeout must be between 1000ms and 10000ms')
    }

    if (config.performance.maxRetries < 0 || config.performance.maxRetries > 5) {
      throw new Error('Max retries must be between 0 and 5')
    }

    if (config.performance.rateLimitMs < 0 || config.performance.rateLimitMs > 1000) {
      throw new Error('Rate limit must be between 0ms and 1000ms')
    }

    // Validate analysis settings
    if (!config.analysis) {
      throw new Error('Analysis configuration is required')
    }

    if (config.analysis.minReliabilityThreshold < 50 || config.analysis.minReliabilityThreshold > 100) {
      throw new Error('Minimum reliability threshold must be between 50% and 100%')
    }
  }

  // Domain List Management
  private domainListFile = path.join(process.cwd(), 'domain-list.json')
  private defaultDomainList = [
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

  async loadDomainList(): Promise<DomainListConfig> {
    try {
      const fileContents = await fs.readFile(this.domainListFile, 'utf-8')
      const data = JSON.parse(fileContents)
      return {
        domains: data.domains || this.defaultDomainList,
        lastModified: new Date(data.lastModified || Date.now())
      }
    } catch (error) {
      this.logger.debug({ error }, 'Domain list file not found, using defaults')
      return {
        domains: [...this.defaultDomainList],
        lastModified: new Date()
      }
    }
  }

  async saveDomainList(config: DomainListConfig): Promise<DomainListConfig> {
    try {
      this.validateDomainList(config)

      const dataToSave = {
        domains: config.domains,
        lastModified: new Date().toISOString()
      }

      await fs.writeFile(this.domainListFile, JSON.stringify(dataToSave, null, 2))

      return {
        domains: config.domains,
        lastModified: new Date(dataToSave.lastModified)
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to save domain list configuration')
      throw error
    }
  }

  async resetDomainListToDefaults(): Promise<DomainListConfig> {
    const defaultConfig: DomainListConfig = {
      domains: [...this.defaultDomainList],
      lastModified: new Date()
    }

    return await this.saveDomainList(defaultConfig)
  }

  private validateDomainList(config: DomainListConfig): void {
    if (!config.domains || !Array.isArray(config.domains)) {
      throw new Error('Domain list must be an array')
    }

    if (config.domains.length < 1) {
      throw new Error('Domain list must contain at least 1 domain')
    }

    if (config.domains.length > 1000) {
      throw new Error('Domain list cannot contain more than 1000 domains')
    }

    // Validate each domain
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/
    const invalidDomains: string[] = []
    const duplicates: string[] = []
    const seen = new Set<string>()

    for (const domain of config.domains) {
      if (typeof domain !== 'string') {
        invalidDomains.push(`Invalid type: ${typeof domain}`)
        continue
      }

      const trimmedDomain = domain.trim().toLowerCase()

      if (trimmedDomain.length === 0) {
        invalidDomains.push('Empty domain')
        continue
      }

      if (trimmedDomain.length > 253) {
        invalidDomains.push(`${domain} (too long)`)
        continue
      }

      if (!domainRegex.test(trimmedDomain)) {
        invalidDomains.push(domain)
        continue
      }

      if (seen.has(trimmedDomain)) {
        duplicates.push(domain)
      } else {
        seen.add(trimmedDomain)
      }
    }

    if (invalidDomains.length > 0) {
      throw new Error(`Invalid domains: ${invalidDomains.slice(0, 5).join(', ')}${invalidDomains.length > 5 ? ` and ${invalidDomains.length - 5} more` : ''}`)
    }

    if (duplicates.length > 0) {
      throw new Error(`Duplicate domains found: ${duplicates.slice(0, 5).join(', ')}${duplicates.length > 5 ? ` and ${duplicates.length - 5} more` : ''}`)
    }
  }
}