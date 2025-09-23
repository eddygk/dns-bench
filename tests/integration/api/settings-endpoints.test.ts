import request from 'supertest';

describe('Settings Endpoints Integration', () => {
  const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';

  describe('Local DNS Settings', () => {
    describe('GET /api/settings/local-dns', () => {
      it('should return local DNS configuration', async () => {
        const response = await request(API_BASE_URL)
          .get('/api/settings/local-dns')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);

        response.body.forEach((server: any) => {
          expect(server).toHaveProperty('ip');
          expect(server).toHaveProperty('enabled');
          expect(typeof server.ip).toBe('string');
          expect(typeof server.enabled).toBe('boolean');
          expect(server.ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
        });
      });

      it('should handle empty local DNS configuration', async () => {
        const response = await request(API_BASE_URL)
          .get('/api/settings/local-dns')
          .expect(200);

        // Should return empty array if no local DNS configured
        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    describe('PUT /api/settings/local-dns', () => {
      it('should validate IP address format in request', async () => {
        const invalidConfig = {
          servers: [
            { ip: '256.1.1.1', enabled: true }, // Invalid IP
            { ip: 'not-an-ip', enabled: true }  // Invalid IP
          ]
        };

        await request(API_BASE_URL)
          .put('/api/settings/local-dns')
          .send(invalidConfig)
          .expect(400);
      });

      it('should accept valid local DNS configuration', async () => {
        const validConfig = {
          servers: [
            { ip: '192.168.1.1', enabled: true },
            { ip: '192.168.1.2', enabled: false }
          ]
        };

        const response = await request(API_BASE_URL)
          .put('/api/settings/local-dns')
          .send(validConfig)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });

      it('should handle empty configuration', async () => {
        const emptyConfig = { servers: [] };

        const response = await request(API_BASE_URL)
          .put('/api/settings/local-dns')
          .send(emptyConfig)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });

      it('should validate request body structure', async () => {
        // Missing servers property
        await request(API_BASE_URL)
          .put('/api/settings/local-dns')
          .send({})
          .expect(400);

        // Invalid servers type
        await request(API_BASE_URL)
          .put('/api/settings/local-dns')
          .send({ servers: 'not-an-array' })
          .expect(400);
      });

      it('should validate individual server objects', async () => {
        const invalidServerConfig = {
          servers: [
            { ip: '192.168.1.1' }, // Missing enabled property
            { enabled: true },      // Missing ip property
            { ip: '192.168.1.3', enabled: 'yes' } // Invalid enabled type
          ]
        };

        await request(API_BASE_URL)
          .put('/api/settings/local-dns')
          .send(invalidServerConfig)
          .expect(400);
      });
    });
  });

  describe('Public DNS Settings', () => {
    describe('GET /api/settings/public-dns', () => {
      it('should return public DNS server configuration', async () => {
        const response = await request(API_BASE_URL)
          .get('/api/settings/public-dns')
          .expect(200);

        expect(response.body).toHaveProperty('servers');
        expect(Array.isArray(response.body.servers)).toBe(true);

        response.body.servers.forEach((server: any) => {
          expect(server).toHaveProperty('id');
          expect(server).toHaveProperty('ip');
          expect(server).toHaveProperty('name');
          expect(server).toHaveProperty('enabled');

          expect(typeof server.id).toBe('string');
          expect(typeof server.ip).toBe('string');
          expect(typeof server.name).toBe('string');
          expect(typeof server.enabled).toBe('boolean');

          expect(server.ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
          expect(server.name.trim().length).toBeGreaterThan(0);
        });
      });

      it('should include default public DNS providers', async () => {
        const response = await request(API_BASE_URL)
          .get('/api/settings/public-dns')
          .expect(200);

        const serverIPs = response.body.servers.map((s: any) => s.ip);

        // Should include common public DNS providers
        const expectedProviders = ['1.1.1.1', '8.8.8.8', '9.9.9.9'];
        const foundProviders = expectedProviders.filter(ip => serverIPs.includes(ip));

        expect(foundProviders.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('PUT /api/settings/public-dns', () => {
      it('should validate public DNS server configuration', async () => {
        const invalidConfig = {
          servers: [
            {
              id: '1',
              ip: '256.1.1.1', // Invalid IP
              name: 'Invalid Server',
              enabled: true
            }
          ]
        };

        await request(API_BASE_URL)
          .put('/api/settings/public-dns')
          .send(invalidConfig)
          .expect(400);
      });

      it('should accept valid public DNS configuration', async () => {
        const validConfig = {
          servers: [
            {
              id: '1',
              ip: '1.1.1.1',
              name: 'Cloudflare',
              provider: 'Cloudflare',
              enabled: true
            },
            {
              id: '2',
              ip: '8.8.8.8',
              name: 'Google Primary',
              provider: 'Google',
              enabled: false
            }
          ]
        };

        const response = await request(API_BASE_URL)
          .put('/api/settings/public-dns')
          .send(validConfig)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });

      it('should validate server limits', async () => {
        // Test with too many servers (>20)
        const tooManyServers = {
          servers: Array(25).fill(null).map((_, i) => ({
            id: i.toString(),
            ip: `8.8.8.${i + 1}`,
            name: `Server ${i + 1}`,
            enabled: true
          }))
        };

        await request(API_BASE_URL)
          .put('/api/settings/public-dns')
          .send(tooManyServers)
          .expect(400);
      });

      it('should validate required server properties', async () => {
        const incompleteConfig = {
          servers: [
            {
              id: '1',
              ip: '1.1.1.1'
              // Missing name and enabled
            }
          ]
        };

        await request(API_BASE_URL)
          .put('/api/settings/public-dns')
          .send(incompleteConfig)
          .expect(400);
      });

      it('should validate unique server IDs', async () => {
        const duplicateIdConfig = {
          servers: [
            {
              id: '1',
              ip: '1.1.1.1',
              name: 'Cloudflare',
              enabled: true
            },
            {
              id: '1', // Duplicate ID
              ip: '8.8.8.8',
              name: 'Google',
              enabled: true
            }
          ]
        };

        await request(API_BASE_URL)
          .put('/api/settings/public-dns')
          .send(duplicateIdConfig)
          .expect(400);
      });
    });
  });

  describe('CORS Settings', () => {
    describe('GET /api/settings/cors', () => {
      it('should return CORS configuration', async () => {
        const response = await request(API_BASE_URL)
          .get('/api/settings/cors')
          .expect(200);

        expect(response.body).toHaveProperty('allowedOrigins');
        expect(Array.isArray(response.body.allowedOrigins)).toBe(true);

        if (response.body.customOrigins) {
          expect(Array.isArray(response.body.customOrigins)).toBe(true);
        }
      });

      it('should include localhost in allowed origins', async () => {
        const response = await request(API_BASE_URL)
          .get('/api/settings/cors')
          .expect(200);

        const origins = response.body.allowedOrigins;
        const hasLocalhost = origins.some((origin: string) =>
          origin.includes('localhost')
        );

        expect(hasLocalhost).toBe(true);
      });
    });

    describe('PUT /api/settings/cors', () => {
      it('should validate CORS origin URLs', async () => {
        const invalidConfig = {
          allowedOrigins: ['http://localhost:3000'],
          customOrigins: ['not-a-valid-url', 'ftp://invalid-protocol.com']
        };

        await request(API_BASE_URL)
          .put('/api/settings/cors')
          .send(invalidConfig)
          .expect(400);
      });

      it('should accept valid CORS configuration', async () => {
        const validConfig = {
          allowedOrigins: ['http://localhost:3000'],
          customOrigins: ['http://192.168.1.100:3000', 'https://mydomain.com']
        };

        const response = await request(API_BASE_URL)
          .put('/api/settings/cors')
          .send(validConfig)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });

      it('should handle empty custom origins', async () => {
        const config = {
          allowedOrigins: ['http://localhost:3000'],
          customOrigins: []
        };

        const response = await request(API_BASE_URL)
          .put('/api/settings/cors')
          .send(config)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });
    });
  });

  describe('Settings Persistence', () => {
    it('should persist local DNS settings across requests', async () => {
      const testConfig = {
        servers: [
          { ip: '192.168.100.1', enabled: true },
          { ip: '192.168.100.2', enabled: false }
        ]
      };

      // Save configuration
      await request(API_BASE_URL)
        .put('/api/settings/local-dns')
        .send(testConfig)
        .expect(200);

      // Retrieve and verify
      const response = await request(API_BASE_URL)
        .get('/api/settings/local-dns')
        .expect(200);

      expect(response.body).toEqual(testConfig.servers);
    });

    it('should maintain configuration consistency', async () => {
      // Get current public DNS config
      const initialResponse = await request(API_BASE_URL)
        .get('/api/settings/public-dns')
        .expect(200);

      // Add a custom server
      const updatedConfig = {
        servers: [
          ...initialResponse.body.servers,
          {
            id: '999',
            ip: '4.2.2.1',
            name: 'Level3 Test',
            provider: 'Level3',
            enabled: true
          }
        ]
      };

      // Save updated config
      await request(API_BASE_URL)
        .put('/api/settings/public-dns')
        .send(updatedConfig)
        .expect(200);

      // Verify the change persisted
      const finalResponse = await request(API_BASE_URL)
        .get('/api/settings/public-dns')
        .expect(200);

      const addedServer = finalResponse.body.servers.find(
        (s: any) => s.id === '999'
      );

      expect(addedServer).toBeDefined();
      expect(addedServer.ip).toBe('4.2.2.1');
      expect(addedServer.name).toBe('Level3 Test');
    });
  });
});