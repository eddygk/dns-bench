import request from 'supertest';

describe('Health Check API Integration', () => {
  const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/ok|healthy/)
      });

      // Should include timestamp
      expect(response.body).toHaveProperty('timestamp');

      // Timestamp should be recent (within last 5 seconds)
      const timestamp = new Date(response.body.timestamp);
      const now = new Date();
      const timeDiff = now.getTime() - timestamp.getTime();
      expect(timeDiff).toBeLessThan(5000);
    });

    it('should have correct response headers', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should respond quickly (under 1000ms)', async () => {
      const start = Date.now();

      await request(API_BASE_URL)
        .get('/api/health')
        .expect(200);

      const responseTime = Date.now() - start;
      expect(responseTime).toBeLessThan(1000);
    });

    it('should handle CORS headers correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should include server information in health check', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/health')
        .expect(200);

      // Should include some server metadata
      expect(response.body).toHaveProperty('status');
      expect(typeof response.body.status).toBe('string');

      // Response should be valid JSON
      expect(() => JSON.stringify(response.body)).not.toThrow();
    });
  });

  describe('Health Check Reliability', () => {
    it('should consistently return 200 across multiple requests', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(API_BASE_URL)
          .get('/api/health')
          .expect(200)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status');
      });
    });

    it('should handle concurrent health check requests', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        request(API_BASE_URL)
          .get('/api/health')
      );

      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(concurrentRequests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status');
      });
    });
  });
});