import * as dns from 'dns';
import { promisify } from 'util';

const dnsResolve4 = promisify(dns.resolve4);

describe('DNS Core Functionality', () => {
  describe('DNS Resolution with Node.js dns module', () => {
    it('should resolve google.com via Google DNS (8.8.8.8)', async () => {
      const resolver = new dns.Resolver();
      resolver.setServers(['8.8.8.8']);

      const resolve4 = promisify(resolver.resolve4).bind(resolver);
      const addresses = await resolve4('google.com');

      expect(addresses).toBeDefined();
      expect(addresses.length).toBeGreaterThan(0);
      expect(addresses[0]).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
    }, 30000);

    it('should resolve github.com via Cloudflare DNS (1.1.1.1)', async () => {
      const resolver = new dns.Resolver();
      resolver.setServers(['1.1.1.1']);

      const resolve4 = promisify(resolver.resolve4).bind(resolver);
      const addresses = await resolve4('github.com');

      expect(addresses).toBeDefined();
      expect(addresses.length).toBeGreaterThan(0);
      expect(addresses[0]).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
    }, 30000);

    it('should handle DNS timeout properly', async () => {
      const resolver = new dns.Resolver();
      resolver.setServers(['192.0.2.1']); // TEST-NET-1, should timeout

      const resolve4 = promisify(resolver.resolve4).bind(resolver);

      await expect(resolve4('google.com')).rejects.toThrow();
    }, 30000);

    it('should handle non-existent domains', async () => {
      const resolver = new dns.Resolver();
      resolver.setServers(['8.8.8.8']);

      const resolve4 = promisify(resolver.resolve4).bind(resolver);

      await expect(
        resolve4('this-domain-definitely-does-not-exist-12345.com')
      ).rejects.toThrow(/ENOTFOUND|NXDOMAIN/);
    }, 30000);

    it('should compare response times between DNS servers', async () => {
      const servers = ['8.8.8.8', '1.1.1.1', '9.9.9.9'];
      const results = [];

      for (const server of servers) {
        const resolver = new dns.Resolver();
        resolver.setServers([server]);

        const resolve4 = promisify(resolver.resolve4).bind(resolver);
        const start = Date.now();

        try {
          await resolve4('cloudflare.com');
          const responseTime = Date.now() - start;
          results.push({ server, responseTime, success: true });
        } catch (error) {
          results.push({ server, responseTime: -1, success: false });
        }
      }

      expect(results.filter(r => r.success).length).toBeGreaterThanOrEqual(2);
      results.filter(r => r.success).forEach(result => {
        expect(result.responseTime).toBeGreaterThan(0);
        expect(result.responseTime).toBeLessThan(5000);
      });
    }, 30000);
  });

  describe('Utility Functions', () => {
    it('should validate IP addresses correctly', () => {
      const isValidIP = (ip: string) => {
        const parts = ip.split('.');
        if (parts.length !== 4) return false;
        return parts.every(part => {
          const num = parseInt(part, 10);
          return num >= 0 && num <= 255 && part === num.toString();
        });
      };

      expect(isValidIP('8.8.8.8')).toBe(true);
      expect(isValidIP('1.1.1.1')).toBe(true);
      expect(isValidIP('192.168.1.1')).toBe(true);
      expect(isValidIP('256.1.1.1')).toBe(false);
      expect(isValidIP('not.an.ip.address')).toBe(false);
      expect(isValidIP('1.1.1')).toBe(false);
    });

    it('should measure DNS query performance', async () => {
      const measureDNS = async (server: string, domain: string) => {
        const resolver = new dns.Resolver();
        resolver.setServers([server]);

        const resolve4 = promisify(resolver.resolve4).bind(resolver);
        const start = process.hrtime.bigint();

        try {
          const addresses = await resolve4(domain);
          const end = process.hrtime.bigint();
          const durationMs = Number(end - start) / 1000000;

          return {
            server,
            domain,
            success: true,
            addresses,
            responseTime: durationMs
          };
        } catch (error) {
          const end = process.hrtime.bigint();
          const durationMs = Number(end - start) / 1000000;

          return {
            server,
            domain,
            success: false,
            error: (error as Error).message,
            responseTime: durationMs
          };
        }
      };

      const result = await measureDNS('8.8.8.8', 'example.com');

      expect(result).toHaveProperty('server', '8.8.8.8');
      expect(result).toHaveProperty('domain', 'example.com');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('responseTime');

      if (result.success) {
        expect(result.addresses).toBeDefined();
        expect(result.addresses?.length).toBeGreaterThan(0);
      }

      expect(result.responseTime).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Multiple Domain Testing', () => {
    it('should test multiple domains against a DNS server', async () => {
      const domains = ['google.com', 'github.com', 'stackoverflow.com', 'cloudflare.com'];
      const resolver = new dns.Resolver();
      resolver.setServers(['1.1.1.1']);

      const resolve4 = promisify(resolver.resolve4).bind(resolver);
      const results = [];

      for (const domain of domains) {
        try {
          const addresses = await resolve4(domain);
          results.push({ domain, success: true, addresses });
        } catch (error) {
          results.push({ domain, success: false, error: (error as Error).message });
        }
      }

      const successfulResults = results.filter(r => r.success);
      expect(successfulResults.length).toBeGreaterThanOrEqual(3);

      successfulResults.forEach(result => {
        expect(result.addresses).toBeDefined();
        expect(result.addresses?.length).toBeGreaterThan(0);
      });
    }, 30000);
  });
});