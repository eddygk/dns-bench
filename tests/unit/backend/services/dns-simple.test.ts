import * as dns from 'dns'
import { promisify } from 'util'

// Simple DNS functionality tests without complex imports
describe('DNS Core Functionality', () => {
  describe('Node.js DNS Resolution', () => {
    it('should resolve google.com using Node.js dns.resolve4', async () => {
      const resolve4 = promisify(dns.resolve4)

      const addresses = await resolve4('google.com')

      expect(addresses).toBeDefined()
      expect(Array.isArray(addresses)).toBe(true)
      expect(addresses.length).toBeGreaterThan(0)
      expect(addresses[0]).toMatch(/^\d+\.\d+\.\d+\.\d+$/)
    }, 10000)

    it('should handle invalid DNS servers', async () => {
      const resolver = new dns.Resolver()
      resolver.setServers(['192.0.2.1']) // Non-routable test IP

      const resolve4 = promisify(resolver.resolve4.bind(resolver))

      await expect(
        Promise.race([
          resolve4('google.com'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 3000))
        ])
      ).rejects.toThrow()
    })

    it('should handle non-existent domains', async () => {
      const resolve4 = promisify(dns.resolve4)

      await expect(
        resolve4('definitely-does-not-exist-12345.com')
      ).rejects.toThrow()
    })

    it('should work with different DNS servers', async () => {
      const resolver1 = new dns.Resolver()
      resolver1.setServers(['8.8.8.8'])

      const resolver2 = new dns.Resolver()
      resolver2.setServers(['1.1.1.1'])

      const resolve1 = promisify(resolver1.resolve4.bind(resolver1))
      const resolve2 = promisify(resolver2.resolve4.bind(resolver2))

      const [result1, result2] = await Promise.all([
        resolve1('github.com'),
        resolve2('github.com')
      ])

      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
      expect(Array.isArray(result1)).toBe(true)
      expect(Array.isArray(result2)).toBe(true)
    }, 15000)
  })

  describe('DNS Performance Measurement', () => {
    it('should measure DNS query time', async () => {
      const startTime = performance.now()
      const resolve4 = promisify(dns.resolve4)

      await resolve4('google.com')

      const queryTime = performance.now() - startTime
      expect(queryTime).toBeGreaterThanOrEqual(0) // Allow 0ms for very fast cached responses
      expect(queryTime).toBeLessThan(5000) // Should be reasonably fast
    })

    it('should validate IP address format', () => {
      const validIPs = ['1.1.1.1', '192.168.1.1', '10.0.0.1']
      const invalidIPs = ['256.1.1.1', 'not-an-ip', '1.1.1']

      const isValidIP = (ip: string): boolean => {
        const parts = ip.split('.')
        if (parts.length !== 4) return false
        return parts.every(part => {
          const num = parseInt(part, 10)
          return num >= 0 && num <= 255 && part === num.toString()
        })
      }

      validIPs.forEach(ip => {
        expect(isValidIP(ip)).toBe(true)
      })

      invalidIPs.forEach(ip => {
        expect(isValidIP(ip)).toBe(false)
      })
    })
  })

  describe('DNS Error Handling', () => {
    it('should categorize DNS errors correctly', () => {
      const categorizeError = (error: string): string => {
        if (error.includes('ENOTFOUND') || error.includes('queryA ENOTFOUND')) {
          return 'DOMAIN_NOT_FOUND'
        } else if (error.includes('ECONNREFUSED')) {
          return 'SERVER_REFUSED'
        } else if (error.includes('ETIMEOUT')) {
          return 'QUERY_TIMEOUT'
        } else {
          return 'SERVER_FAILURE'
        }
      }

      expect(categorizeError('queryA ENOTFOUND example.com')).toBe('DOMAIN_NOT_FOUND')
      expect(categorizeError('connect ECONNREFUSED')).toBe('SERVER_REFUSED')
      expect(categorizeError('timeout ETIMEOUT')).toBe('QUERY_TIMEOUT')
      expect(categorizeError('other error')).toBe('SERVER_FAILURE')
    })
  })
})