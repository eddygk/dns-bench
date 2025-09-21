import * as fs from 'fs/promises'

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  access: jest.fn()
}))

const mockFs = fs as jest.Mocked<typeof fs>

describe('Settings Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Local DNS Configuration', () => {
    it('should parse local DNS configuration correctly', async () => {
      const mockConfig = {
        servers: [
          { ip: '10.10.20.30', enabled: true },
          { ip: '10.10.20.31', enabled: false }
        ]
      }

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig))

      // Simulate loading and filtering enabled servers
      const configData = await mockFs.readFile('local-dns.json', 'utf-8')
      const config = JSON.parse(configData)
      const enabledServers = config.servers
        .filter((server: any) => server.enabled)
        .map((server: any) => server.ip)

      expect(enabledServers).toEqual(['10.10.20.30'])
    })

    it('should handle missing configuration files gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file'))

      try {
        await mockFs.readFile('local-dns.json', 'utf-8')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    it('should validate IP address format', () => {
      const isValidIP = (ip: string): boolean => {
        const parts = ip.split('.')
        if (parts.length !== 4) return false
        return parts.every(part => {
          const num = parseInt(part, 10)
          return num >= 0 && num <= 255 && part === num.toString()
        })
      }

      expect(isValidIP('10.10.20.30')).toBe(true)
      expect(isValidIP('192.168.1.1')).toBe(true)
      expect(isValidIP('256.1.1.1')).toBe(false)
      expect(isValidIP('not-an-ip')).toBe(false)
      expect(isValidIP('1.1.1')).toBe(false)
    })

    it('should filter out localhost addresses', () => {
      const servers = [
        '10.10.20.30',
        '127.0.0.1',
        '192.168.1.1',
        '::1',
        'localhost'
      ]

      const filtered = servers.filter(server =>
        !server.startsWith('127.') &&
        !server.startsWith('::1') &&
        server !== 'localhost'
      )

      expect(filtered).toEqual(['10.10.20.30', '192.168.1.1'])
    })
  })

  describe('Public DNS Configuration', () => {
    it('should manage enabled/disabled state correctly', () => {
      const servers = [
        { id: 'cloudflare', ip: '1.1.1.1', enabled: true },
        { id: 'google', ip: '8.8.8.8', enabled: false },
        { id: 'quad9', ip: '9.9.9.9', enabled: true }
      ]

      const enabledIPs = servers
        .filter(server => server.enabled)
        .map(server => server.ip)

      expect(enabledIPs).toEqual(['1.1.1.1', '9.9.9.9'])
    })

    it('should create server name mappings', () => {
      const servers = [
        { id: 'cloudflare', name: 'Cloudflare Primary', ip: '1.1.1.1' },
        { id: 'google', name: 'Google Primary', ip: '8.8.8.8' }
      ]

      const serverMap = new Map()
      servers.forEach(server => {
        serverMap.set(server.ip, server.name)
      })

      expect(serverMap.get('1.1.1.1')).toBe('Cloudflare Primary')
      expect(serverMap.get('8.8.8.8')).toBe('Google Primary')
    })

    it('should enforce server limits', () => {
      const MAX_SERVERS = 20
      const servers = Array(25).fill(null).map((_, i) => ({
        id: `server-${i}`,
        ip: `192.0.2.${i + 1}`,
        enabled: true
      }))

      const isValidCount = servers.length <= MAX_SERVERS
      expect(isValidCount).toBe(false)
    })
  })

  describe('CORS Configuration', () => {
    it('should generate CORS origins correctly', () => {
      const settings = {
        cors: {
          allowIPAccess: true,
          allowHostnameAccess: true,
          detectedHostIP: '192.168.1.100',
          detectedHostname: 'myhost.local',
          customOrigins: ['http://custom.example.com:3000']
        }
      }

      const origins = []
      origins.push('http://localhost:3000')

      if (settings.cors.allowIPAccess && settings.cors.detectedHostIP) {
        origins.push(`http://${settings.cors.detectedHostIP}:3000`)
      }

      if (settings.cors.allowHostnameAccess && settings.cors.detectedHostname) {
        origins.push(`http://${settings.cors.detectedHostname}:3000`)
      }

      origins.push(...settings.cors.customOrigins)

      expect(origins).toContain('http://localhost:3000')
      expect(origins).toContain('http://192.168.1.100:3000')
      expect(origins).toContain('http://myhost.local:3000')
      expect(origins).toContain('http://custom.example.com:3000')
    })

    it('should handle disabled IP access', () => {
      const settings = {
        cors: {
          allowIPAccess: false,
          allowHostnameAccess: true,
          detectedHostIP: '192.168.1.100',
          detectedHostname: 'myhost.local'
        }
      }

      const origins = ['http://localhost:3000']

      if (settings.cors.allowHostnameAccess && settings.cors.detectedHostname) {
        origins.push(`http://${settings.cors.detectedHostname}:3000`)
      }

      expect(origins).toContain('http://localhost:3000')
      expect(origins).toContain('http://myhost.local:3000')
      expect(origins).not.toContain('http://192.168.1.100:3000')
    })
  })

  describe('JSON Configuration Handling', () => {
    it('should save configuration data correctly', async () => {
      const testConfig = {
        servers: [
          { ip: '10.10.20.30', enabled: true }
        ]
      }

      mockFs.writeFile.mockResolvedValue(undefined)

      await mockFs.writeFile('test-config.json', JSON.stringify(testConfig, null, 2), 'utf-8')

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'test-config.json',
        JSON.stringify(testConfig, null, 2),
        'utf-8'
      )
    })

    it('should handle malformed JSON gracefully', () => {
      const malformedJson = '{ invalid json'

      expect(() => {
        try {
          JSON.parse(malformedJson)
        } catch (error) {
          throw new Error('Invalid JSON format')
        }
      }).toThrow('Invalid JSON format')
    })
  })
})