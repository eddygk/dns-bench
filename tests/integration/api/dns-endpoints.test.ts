import request from 'supertest';

describe('DNS Endpoints Integration', () => {
  const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';

  describe('GET /api/dns/current', () => {
    it('should return current DNS servers configuration', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/dns/current')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);

      if (response.body.length > 0) {
        response.body.forEach((server: any) => {
          expect(server).toHaveProperty('ip');
          expect(server).toHaveProperty('name');
          expect(server.ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
          expect(typeof server.name).toBe('string');
        });
      }
    });

    it('should validate IP address format in response', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/dns/current')
        .expect(200);

      response.body.forEach((server: any) => {
        const { ip } = server;
        const parts = ip.split('.');

        expect(parts).toHaveLength(4);
        parts.forEach((part: string) => {
          const num = parseInt(part, 10);
          expect(num).toBeGreaterThanOrEqual(0);
          expect(num).toBeLessThanOrEqual(255);
        });
      });
    });

    it('should respond within reasonable time', async () => {
      const start = Date.now();

      await request(API_BASE_URL)
        .get('/api/dns/current')
        .expect(200);

      const responseTime = Date.now() - start;
      expect(responseTime).toBeLessThan(2000);
    });

    it('should have correct content type', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/dns/current')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should filter out localhost/loopback addresses', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/dns/current')
        .expect(200);

      response.body.forEach((server: any) => {
        const { ip } = server;
        expect(ip).not.toMatch(/^127\./); // No 127.x.x.x addresses
        expect(ip).not.toBe('::1'); // No IPv6 localhost
      });
    });
  });

  describe('DNS Configuration Validation', () => {
    it('should return valid DNS server structures', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/dns/current')
        .expect(200);

      response.body.forEach((server: any) => {
        // Required properties
        expect(server).toHaveProperty('ip');
        expect(server).toHaveProperty('name');

        // Type validation
        expect(typeof server.ip).toBe('string');
        expect(typeof server.name).toBe('string');

        // IP format validation
        expect(server.ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);

        // Name should not be empty
        expect(server.name.trim().length).toBeGreaterThan(0);
      });
    });

    it('should handle empty DNS configuration gracefully', async () => {
      // This test validates that the API can handle cases where no DNS servers are configured
      const response = await request(API_BASE_URL)
        .get('/api/dns/current')
        .expect(200);

      // Should always return an array, even if empty
      expect(Array.isArray(response.body)).toBe(true);

      // If empty, that's valid (auto-detection might fail in some environments)
      if (response.body.length === 0) {
        expect(response.body).toEqual([]);
      }
    });

    it('should return consistent results across multiple calls', async () => {
      const response1 = await request(API_BASE_URL)
        .get('/api/dns/current')
        .expect(200);

      const response2 = await request(API_BASE_URL)
        .get('/api/dns/current')
        .expect(200);

      // Results should be consistent (DNS configuration shouldn't change between calls)
      expect(response1.body).toEqual(response2.body);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      // Test with invalid query parameters
      const response = await request(API_BASE_URL)
        .get('/api/dns/current?invalid=param')
        .expect(200); // Should still return 200, ignoring invalid params

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should maintain consistent response format under load', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(API_BASE_URL)
          .get('/api/dns/current')
          .expect(200)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(Array.isArray(response.body)).toBe(true);
        response.body.forEach((server: any) => {
          expect(server).toHaveProperty('ip');
          expect(server).toHaveProperty('name');
        });
      });
    });
  });

  describe('Public DNS Server Testing', () => {
    it('should validate common public DNS servers format', async () => {
      const knownPublicDNS = [
        '1.1.1.1',    // Cloudflare
        '8.8.8.8',    // Google
        '9.9.9.9',    // Quad9
        '208.67.222.222' // OpenDNS
      ];

      const response = await request(API_BASE_URL)
        .get('/api/dns/current')
        .expect(200);

      // If any known public DNS servers are returned, validate their format
      response.body.forEach((server: any) => {
        if (knownPublicDNS.includes(server.ip)) {
          expect(server.name).toBeTruthy();
          expect(server.name.length).toBeGreaterThan(0);
        }
      });
    });

    it('should handle mix of local and public DNS servers', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/dns/current')
        .expect(200);

      // Categorize servers
      const localServers = response.body.filter((server: any) => {
        const ip = server.ip;
        return ip.startsWith('192.168.') ||
               ip.startsWith('10.') ||
               ip.startsWith('172.');
      });

      const publicServers = response.body.filter((server: any) => {
        const ip = server.ip;
        return !ip.startsWith('192.168.') &&
               !ip.startsWith('10.') &&
               !ip.startsWith('172.') &&
               !ip.startsWith('127.');
      });

      // Both types should have proper structure if present
      [...localServers, ...publicServers].forEach(server => {
        expect(server).toHaveProperty('ip');
        expect(server).toHaveProperty('name');
        expect(server.ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
      });
    });
  });
});