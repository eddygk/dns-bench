import { z } from 'zod';
export declare const DNSServerSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    ipAddress: z.ZodString;
    type: z.ZodEnum<["current", "public", "custom"]>;
    isActive: z.ZodBoolean;
    provider: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    ipAddress: string;
    type: "current" | "public" | "custom";
    isActive: boolean;
    provider?: string | undefined;
}, {
    id: string;
    name: string;
    ipAddress: string;
    type: "current" | "public" | "custom";
    isActive: boolean;
    provider?: string | undefined;
}>;
export declare const BenchmarkConfigSchema: z.ZodObject<{
    servers: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        ipAddress: z.ZodString;
        type: z.ZodEnum<["current", "public", "custom"]>;
        isActive: z.ZodBoolean;
        provider: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        ipAddress: string;
        type: "current" | "public" | "custom";
        isActive: boolean;
        provider?: string | undefined;
    }, {
        id: string;
        name: string;
        ipAddress: string;
        type: "current" | "public" | "custom";
        isActive: boolean;
        provider?: string | undefined;
    }>, "many">;
    domains: z.ZodArray<z.ZodString, "many">;
    testType: z.ZodEnum<["quick", "full", "custom"]>;
    timeout: z.ZodDefault<z.ZodNumber>;
    retries: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    servers: {
        id: string;
        name: string;
        ipAddress: string;
        type: "current" | "public" | "custom";
        isActive: boolean;
        provider?: string | undefined;
    }[];
    domains: string[];
    testType: "custom" | "quick" | "full";
    timeout: number;
    retries: number;
}, {
    servers: {
        id: string;
        name: string;
        ipAddress: string;
        type: "current" | "public" | "custom";
        isActive: boolean;
        provider?: string | undefined;
    }[];
    domains: string[];
    testType: "custom" | "quick" | "full";
    timeout?: number | undefined;
    retries?: number | undefined;
}>;
export declare const StartBenchmarkRequestSchema: z.ZodObject<{
    config: z.ZodObject<Omit<{
        servers: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            ipAddress: z.ZodString;
            type: z.ZodEnum<["current", "public", "custom"]>;
            isActive: z.ZodBoolean;
            provider: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        }, {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        }>, "many">;
        domains: z.ZodArray<z.ZodString, "many">;
        testType: z.ZodEnum<["quick", "full", "custom"]>;
        timeout: z.ZodDefault<z.ZodNumber>;
        retries: z.ZodDefault<z.ZodNumber>;
    }, "servers"> & {
        serverIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        customServers: z.ZodOptional<z.ZodArray<z.ZodObject<Omit<{
            id: z.ZodString;
            name: z.ZodString;
            ipAddress: z.ZodString;
            type: z.ZodEnum<["current", "public", "custom"]>;
            isActive: z.ZodBoolean;
            provider: z.ZodOptional<z.ZodString>;
        }, "id">, "strip", z.ZodTypeAny, {
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        }, {
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        domains: string[];
        testType: "custom" | "quick" | "full";
        timeout: number;
        retries: number;
        serverIds?: string[] | undefined;
        customServers?: {
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        }[] | undefined;
    }, {
        domains: string[];
        testType: "custom" | "quick" | "full";
        timeout?: number | undefined;
        retries?: number | undefined;
        serverIds?: string[] | undefined;
        customServers?: {
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        }[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    config: {
        domains: string[];
        testType: "custom" | "quick" | "full";
        timeout: number;
        retries: number;
        serverIds?: string[] | undefined;
        customServers?: {
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        }[] | undefined;
    };
}, {
    config: {
        domains: string[];
        testType: "custom" | "quick" | "full";
        timeout?: number | undefined;
        retries?: number | undefined;
        serverIds?: string[] | undefined;
        customServers?: {
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        }[] | undefined;
    };
}>;
export declare const DomainTestResultSchema: z.ZodObject<{
    id: z.ZodString;
    domain: z.ZodString;
    dnsServer: z.ZodString;
    responseTime: z.ZodNullable<z.ZodNumber>;
    success: z.ZodBoolean;
    error: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    domain: string;
    dnsServer: string;
    responseTime: number | null;
    success: boolean;
    timestamp: Date;
    error?: string | undefined;
}, {
    id: string;
    domain: string;
    dnsServer: string;
    responseTime: number | null;
    success: boolean;
    timestamp: Date;
    error?: string | undefined;
}>;
export declare const BenchmarkProgressSchema: z.ZodObject<{
    testId: z.ZodString;
    status: z.ZodEnum<["pending", "running", "completed", "cancelled", "failed"]>;
    currentDomain: z.ZodOptional<z.ZodString>;
    currentServer: z.ZodOptional<z.ZodString>;
    progress: z.ZodNumber;
    completedTests: z.ZodNumber;
    totalTests: z.ZodNumber;
    estimatedTimeRemaining: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "running" | "completed" | "cancelled" | "failed";
    testId: string;
    progress: number;
    completedTests: number;
    totalTests: number;
    currentDomain?: string | undefined;
    currentServer?: string | undefined;
    estimatedTimeRemaining?: number | undefined;
}, {
    status: "pending" | "running" | "completed" | "cancelled" | "failed";
    testId: string;
    progress: number;
    completedTests: number;
    totalTests: number;
    currentDomain?: string | undefined;
    currentServer?: string | undefined;
    estimatedTimeRemaining?: number | undefined;
}>;
export declare const ServerPerformanceSchema: z.ZodObject<{
    server: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        ipAddress: z.ZodString;
        type: z.ZodEnum<["current", "public", "custom"]>;
        isActive: z.ZodBoolean;
        provider: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        ipAddress: string;
        type: "current" | "public" | "custom";
        isActive: boolean;
        provider?: string | undefined;
    }, {
        id: string;
        name: string;
        ipAddress: string;
        type: "current" | "public" | "custom";
        isActive: boolean;
        provider?: string | undefined;
    }>;
    avgResponseTime: z.ZodNumber;
    minResponseTime: z.ZodNumber;
    maxResponseTime: z.ZodNumber;
    medianResponseTime: z.ZodNumber;
    successRate: z.ZodNumber;
    totalTests: z.ZodNumber;
    successfulTests: z.ZodNumber;
    failedTests: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    totalTests: number;
    server: {
        id: string;
        name: string;
        ipAddress: string;
        type: "current" | "public" | "custom";
        isActive: boolean;
        provider?: string | undefined;
    };
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    medianResponseTime: number;
    successRate: number;
    successfulTests: number;
    failedTests: number;
}, {
    totalTests: number;
    server: {
        id: string;
        name: string;
        ipAddress: string;
        type: "current" | "public" | "custom";
        isActive: boolean;
        provider?: string | undefined;
    };
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    medianResponseTime: number;
    successRate: number;
    successfulTests: number;
    failedTests: number;
}>;
export declare const BenchmarkResultSchema: z.ZodObject<{
    id: z.ZodString;
    config: z.ZodObject<{
        servers: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            ipAddress: z.ZodString;
            type: z.ZodEnum<["current", "public", "custom"]>;
            isActive: z.ZodBoolean;
            provider: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        }, {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        }>, "many">;
        domains: z.ZodArray<z.ZodString, "many">;
        testType: z.ZodEnum<["quick", "full", "custom"]>;
        timeout: z.ZodDefault<z.ZodNumber>;
        retries: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        servers: {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        }[];
        domains: string[];
        testType: "custom" | "quick" | "full";
        timeout: number;
        retries: number;
    }, {
        servers: {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        }[];
        domains: string[];
        testType: "custom" | "quick" | "full";
        timeout?: number | undefined;
        retries?: number | undefined;
    }>;
    startTime: z.ZodDate;
    endTime: z.ZodOptional<z.ZodDate>;
    status: z.ZodEnum<["pending", "running", "completed", "cancelled", "failed"]>;
    serverResults: z.ZodArray<z.ZodObject<{
        server: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            ipAddress: z.ZodString;
            type: z.ZodEnum<["current", "public", "custom"]>;
            isActive: z.ZodBoolean;
            provider: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        }, {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        }>;
        avgResponseTime: z.ZodNumber;
        minResponseTime: z.ZodNumber;
        maxResponseTime: z.ZodNumber;
        medianResponseTime: z.ZodNumber;
        successRate: z.ZodNumber;
        totalTests: z.ZodNumber;
        successfulTests: z.ZodNumber;
        failedTests: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalTests: number;
        server: {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        };
        avgResponseTime: number;
        minResponseTime: number;
        maxResponseTime: number;
        medianResponseTime: number;
        successRate: number;
        successfulTests: number;
        failedTests: number;
    }, {
        totalTests: number;
        server: {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        };
        avgResponseTime: number;
        minResponseTime: number;
        maxResponseTime: number;
        medianResponseTime: number;
        successRate: number;
        successfulTests: number;
        failedTests: number;
    }>, "many">;
    rawResults: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        domain: z.ZodString;
        dnsServer: z.ZodString;
        responseTime: z.ZodNullable<z.ZodNumber>;
        success: z.ZodBoolean;
        error: z.ZodOptional<z.ZodString>;
        timestamp: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        domain: string;
        dnsServer: string;
        responseTime: number | null;
        success: boolean;
        timestamp: Date;
        error?: string | undefined;
    }, {
        id: string;
        domain: string;
        dnsServer: string;
        responseTime: number | null;
        success: boolean;
        timestamp: Date;
        error?: string | undefined;
    }>, "many">;
    summary: z.ZodObject<{
        bestServer: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            ipAddress: z.ZodString;
            type: z.ZodEnum<["current", "public", "custom"]>;
            isActive: z.ZodBoolean;
            provider: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        }, {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        }>;
        totalDuration: z.ZodNumber;
        averageResponseTime: z.ZodNumber;
        overallSuccessRate: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        bestServer: {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        };
        totalDuration: number;
        averageResponseTime: number;
        overallSuccessRate: number;
    }, {
        bestServer: {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        };
        totalDuration: number;
        averageResponseTime: number;
        overallSuccessRate: number;
    }>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "running" | "completed" | "cancelled" | "failed";
    id: string;
    config: {
        servers: {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        }[];
        domains: string[];
        testType: "custom" | "quick" | "full";
        timeout: number;
        retries: number;
    };
    startTime: Date;
    serverResults: {
        totalTests: number;
        server: {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        };
        avgResponseTime: number;
        minResponseTime: number;
        maxResponseTime: number;
        medianResponseTime: number;
        successRate: number;
        successfulTests: number;
        failedTests: number;
    }[];
    rawResults: {
        id: string;
        domain: string;
        dnsServer: string;
        responseTime: number | null;
        success: boolean;
        timestamp: Date;
        error?: string | undefined;
    }[];
    summary: {
        bestServer: {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        };
        totalDuration: number;
        averageResponseTime: number;
        overallSuccessRate: number;
    };
    endTime?: Date | undefined;
}, {
    status: "pending" | "running" | "completed" | "cancelled" | "failed";
    id: string;
    config: {
        servers: {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        }[];
        domains: string[];
        testType: "custom" | "quick" | "full";
        timeout?: number | undefined;
        retries?: number | undefined;
    };
    startTime: Date;
    serverResults: {
        totalTests: number;
        server: {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        };
        avgResponseTime: number;
        minResponseTime: number;
        maxResponseTime: number;
        medianResponseTime: number;
        successRate: number;
        successfulTests: number;
        failedTests: number;
    }[];
    rawResults: {
        id: string;
        domain: string;
        dnsServer: string;
        responseTime: number | null;
        success: boolean;
        timestamp: Date;
        error?: string | undefined;
    }[];
    summary: {
        bestServer: {
            id: string;
            name: string;
            ipAddress: string;
            type: "current" | "public" | "custom";
            isActive: boolean;
            provider?: string | undefined;
        };
        totalDuration: number;
        averageResponseTime: number;
        overallSuccessRate: number;
    };
    endTime?: Date | undefined;
}>;
export declare const ExportParamsSchema: z.ZodObject<{
    format: z.ZodDefault<z.ZodEnum<["csv", "json", "pdf"]>>;
}, "strip", z.ZodTypeAny, {
    format: "csv" | "json" | "pdf";
}, {
    format?: "csv" | "json" | "pdf" | undefined;
}>;
export declare const validateIPAddress: (ip: string) => boolean;
export declare const validateDNSServer: (server: unknown) => z.SafeParseReturnType<{
    id: string;
    name: string;
    ipAddress: string;
    type: "current" | "public" | "custom";
    isActive: boolean;
    provider?: string | undefined;
}, {
    id: string;
    name: string;
    ipAddress: string;
    type: "current" | "public" | "custom";
    isActive: boolean;
    provider?: string | undefined;
}>;
export declare const validateBenchmarkConfig: (config: unknown) => z.SafeParseReturnType<{
    servers: {
        id: string;
        name: string;
        ipAddress: string;
        type: "current" | "public" | "custom";
        isActive: boolean;
        provider?: string | undefined;
    }[];
    domains: string[];
    testType: "custom" | "quick" | "full";
    timeout?: number | undefined;
    retries?: number | undefined;
}, {
    servers: {
        id: string;
        name: string;
        ipAddress: string;
        type: "current" | "public" | "custom";
        isActive: boolean;
        provider?: string | undefined;
    }[];
    domains: string[];
    testType: "custom" | "quick" | "full";
    timeout: number;
    retries: number;
}>;
//# sourceMappingURL=schemas.d.ts.map