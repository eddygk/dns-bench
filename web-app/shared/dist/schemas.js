import { z } from 'zod';
// DNS Server Schema
export const DNSServerSchema = z.object({
    id: z.string(),
    name: z.string(),
    ipAddress: z.string().ip(),
    type: z.enum(['current', 'public', 'custom']),
    isActive: z.boolean(),
    provider: z.string().optional()
});
// Benchmark Configuration Schema
export const BenchmarkConfigSchema = z.object({
    servers: z.array(DNSServerSchema),
    domains: z.array(z.string()),
    testType: z.enum(['quick', 'full', 'custom']),
    timeout: z.number().min(500).max(10000).default(2000),
    retries: z.number().min(0).max(5).default(1)
});
// Start Benchmark Request Schema
export const StartBenchmarkRequestSchema = z.object({
    config: BenchmarkConfigSchema.omit({ servers: true }).extend({
        serverIds: z.array(z.string()).optional(),
        customServers: z.array(DNSServerSchema.omit({ id: true })).optional()
    })
});
// Domain Test Result Schema
export const DomainTestResultSchema = z.object({
    id: z.string(),
    domain: z.string(),
    dnsServer: z.string(),
    responseTime: z.number().nullable(),
    success: z.boolean(),
    error: z.string().optional(),
    timestamp: z.date()
});
// Benchmark Progress Schema
export const BenchmarkProgressSchema = z.object({
    testId: z.string(),
    status: z.enum(['pending', 'running', 'completed', 'cancelled', 'failed']),
    currentDomain: z.string().optional(),
    currentServer: z.string().optional(),
    progress: z.number().min(0).max(100),
    completedTests: z.number(),
    totalTests: z.number(),
    estimatedTimeRemaining: z.number().optional()
});
// Server Performance Schema
export const ServerPerformanceSchema = z.object({
    server: DNSServerSchema,
    avgResponseTime: z.number(),
    minResponseTime: z.number(),
    maxResponseTime: z.number(),
    medianResponseTime: z.number(),
    successRate: z.number().min(0).max(100),
    totalTests: z.number(),
    successfulTests: z.number(),
    failedTests: z.number()
});
// Benchmark Result Schema
export const BenchmarkResultSchema = z.object({
    id: z.string(),
    config: BenchmarkConfigSchema,
    startTime: z.date(),
    endTime: z.date().optional(),
    status: BenchmarkProgressSchema.shape.status,
    serverResults: z.array(ServerPerformanceSchema),
    rawResults: z.array(DomainTestResultSchema),
    summary: z.object({
        bestServer: DNSServerSchema,
        totalDuration: z.number(),
        averageResponseTime: z.number(),
        overallSuccessRate: z.number()
    })
});
// Export Response Schema
export const ExportParamsSchema = z.object({
    format: z.enum(['csv', 'json', 'pdf']).default('json')
});
// Validation helpers
export const validateIPAddress = (ip) => {
    try {
        z.string().ip().parse(ip);
        return true;
    }
    catch {
        return false;
    }
};
export const validateDNSServer = (server) => {
    return DNSServerSchema.safeParse(server);
};
export const validateBenchmarkConfig = (config) => {
    return BenchmarkConfigSchema.safeParse(config);
};
