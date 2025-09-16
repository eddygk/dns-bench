import { promisify } from 'util'
import { spawn } from 'child_process'
import dns from 'dns'
import fs from 'fs/promises'
import path from 'path'
import type { Logger } from 'pino'
import type { CORSSettings, ServerSettings, LocalDNSConfig } from '@dns-bench/shared'

const reverseLookup = promisify(dns.reverse)

export class SettingsService {
  private settingsFile = path.join(process.cwd(), 'settings.json')
  private localDNSFile = path.join(process.cwd(), 'local-dns.json')
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

    // Auto-detect hostname and host IP if enabled
    const settings = await this.loadSettings()
    if (settings.cors.autoDetectHostname) {
      const hostname = await this.detectHostname()
      const hostIP = await this.getDockerHostIP()

      let updated = false
      if (hostname && hostname !== settings.cors.detectedHostname) {
        settings.cors.detectedHostname = hostname
        updated = true
        this.logger.info({ hostname }, 'Auto-detected hostname')
      }

      if (hostIP && hostIP !== settings.cors.detectedHostIP) {
        settings.cors.detectedHostIP = hostIP
        updated = true
        this.logger.info({ hostIP }, 'Auto-detected host IP')
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

      // Method 2: Try to detect host IP and do reverse lookup
      const hostIP = await this.getDockerHostIP()
      if (hostIP) {
        const hostname = await this.reverseResolveIP(hostIP)
        if (hostname && hostname !== hostIP) {
          return hostname
        }
      }

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

  async getDockerHostIP(): Promise<string | null> {
    // Simple approach: Use environment variable set by Docker Compose
    // This follows Docker best practices instead of trying to auto-detect
    const hostIP = process.env.HOST_IP || process.env.DOCKER_HOST_IP

    if (hostIP && this.isValidIP(hostIP)) {
      this.logger.debug({ hostIP }, 'Using configured host IP from environment')
      return hostIP
    }

    this.logger.debug('No valid host IP configured in environment variables')
    return null
  }

  private isValidIP(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    return ipRegex.test(ip)
  }

  private async getHostNetworkIP(): Promise<string | null> {
    return new Promise((resolve) => {
      // Try to find non-Docker, non-loopback interfaces
      const child = spawn('ip', ['addr', 'show'], { stdio: 'pipe' })
      let output = ''

      child.stdout.on('data', (data) => {
        output += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          // Look for interfaces that are not Docker-related
          const lines = output.split('\n')
          const ips: string[] = []

          for (const line of lines) {
            // Skip Docker interfaces
            if (line.includes('docker') || line.includes('br-')) {
              continue
            }

            // Look for inet addresses
            const match = line.match(/inet (\d+\.\d+\.\d+\.\d+)\/\d+/)
            if (match) {
              const ip = match[1]
              // Skip loopback and Docker subnets
              if (!ip.startsWith('127.') &&
                  !ip.startsWith('172.17.') &&
                  !ip.startsWith('172.18.') &&
                  !ip.startsWith('172.19.') &&
                  !ip.startsWith('172.20.')) {
                ips.push(ip)
              }
            }
          }

          // Prefer 10.x.x.x or 192.168.x.x addresses (common LAN ranges)
          for (const ip of ips) {
            if (ip.startsWith('10.') || ip.startsWith('192.168.')) {
              resolve(ip)
              return
            }
          }

          // Return any non-loopback IP
          resolve(ips.length > 0 ? ips[0] : null)
        } else {
          resolve(null)
        }
      })

      child.on('error', () => {
        resolve(null)
      })
    })
  }

  private async getContainerHostIP(): Promise<string | null> {
    // Try to examine /proc/net/route to find the host's IP
    try {
      const fs = await import('fs/promises')

      // Method 1: Check if we can access host's network info via /proc/1/net/route
      try {
        const hostRouteContent = await fs.readFile('/proc/1/net/route', 'utf-8')
        const ip = this.parseRouteForHostIP(hostRouteContent)
        if (ip) return ip
      } catch (error) {
        // /proc/1/net/route might not be accessible in container
      }

      // Method 2: Try to resolve via DNS the hostname from container perspective
      const hostname = await this.getSystemHostname()
      if (hostname && hostname !== 'localhost') {
        try {
          const addresses = await this.resolveHostname(hostname)
          for (const addr of addresses) {
            if (this.isValidIP(addr) && !addr.startsWith('127.') && !addr.startsWith('172.17.')) {
              return addr
            }
          }
        } catch (error) {
          // DNS resolution failed
        }
      }

      return null
    } catch (error) {
      return null
    }
  }

  private parseRouteForHostIP(routeContent: string): string | null {
    const lines = routeContent.split('\n')

    for (const line of lines) {
      const parts = line.split('\t')
      if (parts.length >= 3) {
        const destination = parts[1]
        const gateway = parts[2]

        // Look for default route (destination 00000000)
        if (destination === '00000000' && gateway !== '00000000') {
          const ip = this.hexToIP(gateway)
          if (ip && this.isValidIP(ip) && !ip.startsWith('172.17.') && !ip.startsWith('127.')) {
            return ip
          }
        }
      }
    }

    return null
  }

  private async resolveHostname(hostname: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const child = spawn('nslookup', [hostname], { stdio: 'pipe' })
      let output = ''

      child.stdout.on('data', (data) => {
        output += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          const addresses: string[] = []
          const lines = output.split('\n')

          for (const line of lines) {
            const match = line.match(/Address:\s*(\d+\.\d+\.\d+\.\d+)/)
            if (match) {
              addresses.push(match[1])
            }
          }

          resolve(addresses)
        } else {
          reject(new Error('nslookup failed'))
        }
      })

      child.on('error', (error) => {
        reject(error)
      })
    })
  }

  private async getDockerGatewayIP(): Promise<string | null> {
    return new Promise((resolve) => {
      const child = spawn('ip', ['route', 'show', 'default'], { stdio: 'pipe' })
      let output = ''

      child.stdout.on('data', (data) => {
        output += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          // Parse default route: "default via 172.17.0.1 dev eth0"
          const match = output.match(/default via (\d+\.\d+\.\d+\.\d+)/)
          if (match) {
            const gatewayIP = match[1]
            // For Docker, the gateway is often the host's IP on the docker network
            // But we need the actual host IP that external clients use
            resolve(gatewayIP)
            return
          }
        }
        resolve(null)
      })

      child.on('error', () => {
        resolve(null)
      })
    })
  }

  private async getHostIPViaRoute(): Promise<string | null> {
    return new Promise((resolve) => {
      // Try to find the route to a well-known external IP
      const child = spawn('ip', ['route', 'get', '8.8.8.8'], { stdio: 'pipe' })
      let output = ''

      child.stdout.on('data', (data) => {
        output += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          // Look for the source IP in the route output
          const srcMatch = output.match(/src\s+(\d+\.\d+\.\d+\.\d+)/)
          if (srcMatch) {
            const sourceIP = srcMatch[1]
            // If this is not a Docker internal IP, it might be the host IP
            if (!sourceIP.startsWith('172.17.') && !sourceIP.startsWith('172.18.')) {
              resolve(sourceIP)
              return
            }
          }

          // Look for the gateway IP which might be the host
          const viaMatch = output.match(/via\s+(\d+\.\d+\.\d+\.\d+)/)
          if (viaMatch) {
            resolve(viaMatch[1])
            return
          }
        }
        resolve(null)
      })

      child.on('error', () => {
        resolve(null)
      })
    })
  }

  private async getHostIPFromEnvironment(): Promise<string | null> {
    // Check if Docker provided host information via environment variables
    const hostIP = process.env.DOCKER_HOST_IP || process.env.HOST_IP
    if (hostIP && this.isValidIP(hostIP)) {
      return hostIP
    }

    // Try to detect from /proc/net/route (Linux specific)
    try {
      const fs = await import('fs/promises')
      const routeContent = await fs.readFile('/proc/net/route', 'utf-8')
      const lines = routeContent.split('\n')

      for (const line of lines) {
        const parts = line.split('\t')
        if (parts.length >= 3 && parts[1] === '00000000') { // Default route
          const gatewayHex = parts[2]
          if (gatewayHex && gatewayHex !== '00000000') {
            // Convert hex to IP
            const ip = this.hexToIP(gatewayHex)
            if (ip && this.isValidIP(ip)) {
              return ip
            }
          }
        }
      }
    } catch (error) {
      // Ignore errors reading /proc/net/route
    }

    return null
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
}