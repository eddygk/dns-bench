export interface DNSServer {
  id: string
  name: string
  ipAddress: string
  type: 'current' | 'public' | 'custom'
  isActive: boolean
  provider?: string
}

export interface DomainTestResult {
  id: string
  domain: string
  dnsServer: string
  responseTime: number | null
  success: boolean
  error?: string
  timestamp: Date
}

export interface BenchmarkConfig {
  servers: DNSServer[]
  domains: string[]
  testType: 'quick' | 'full' | 'custom'
  timeout: number
  retries: number
}

export interface BenchmarkProgress {
  testId: string
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed'
  currentDomain?: string
  currentServer?: string
  progress: number // 0-100
  completedTests: number
  totalTests: number
  estimatedTimeRemaining?: number
}

export interface ServerPerformance {
  server: DNSServer
  avgResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  medianResponseTime: number
  successRate: number
  totalTests: number
  successfulTests: number
  failedTests: number
}

export interface BenchmarkResult {
  id: string
  config: BenchmarkConfig
  startTime: Date
  endTime?: Date
  status: BenchmarkProgress['status']
  serverResults: ServerPerformance[]
  rawResults: DomainTestResult[]
  summary: {
    bestServer: DNSServer
    totalDuration: number
    averageResponseTime: number
    overallSuccessRate: number
  }
}

export interface BenchmarkSession {
  id: string
  config: BenchmarkConfig
  progress: BenchmarkProgress
  results?: BenchmarkResult
  createdAt: Date
  updatedAt: Date
}

// WebSocket Events
export interface WSBenchmarkStarted {
  type: 'benchmark-started'
  data: {
    testId: string
    config: BenchmarkConfig
  }
}

export interface WSBenchmarkProgress {
  type: 'benchmark-progress'
  data: BenchmarkProgress
}

export interface WSBenchmarkResult {
  type: 'benchmark-result'
  data: {
    testId: string
    result: DomainTestResult
  }
}

export interface WSBenchmarkComplete {
  type: 'benchmark-complete'
  data: BenchmarkResult
}

export interface WSBenchmarkError {
  type: 'benchmark-error'
  data: {
    testId: string
    error: string
  }
}

export type WSMessage =
  | WSBenchmarkStarted
  | WSBenchmarkProgress
  | WSBenchmarkResult
  | WSBenchmarkComplete
  | WSBenchmarkError

// API Request/Response Types
export interface StartBenchmarkRequest {
  config: Omit<BenchmarkConfig, 'servers'> & {
    serverIds?: string[]
    customServers?: Omit<DNSServer, 'id'>[]
  }
}

export interface StartBenchmarkResponse {
  testId: string
  message: string
}

export interface GetBenchmarkStatusResponse {
  session: BenchmarkSession
}

export interface GetBenchmarkHistoryResponse {
  results: BenchmarkResult[]
  total: number
  page: number
  pageSize: number
}

export interface DetectDNSServersResponse {
  servers: DNSServer[]
}

// Additional types for backend compatibility
export interface BenchmarkOptions {
  timeout?: number
  retries?: number
  concurrent?: number
}

export interface DNSTestResult {
  server: string
  domain: string
  responseTime: number
  success: boolean
  error?: string
  ip?: string
}

export interface TestStatus {
  testId: string
  status: 'running' | 'completed' | 'failed'
  progress: number
  startedAt: Date
  completedAt?: Date
  servers: string[]
  domains: string[]
  results: BenchmarkResult[]
  totalTests: number
  error?: string
}

export interface BenchmarkResult {
  server: string
  serverName: string
  avgResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  medianResponseTime: number
  successRate: number
  totalQueries: number
  successfulQueries: number
  failedQueries: number
}

// CORS Configuration types
export interface CORSSettings {
  allowIPAccess: boolean
  allowHostnameAccess: boolean
  detectedHostname?: string
  detectedHostIP?: string
  customOrigins: string[]
}

export interface ServerSettings {
  cors: CORSSettings
  port: number
  logLevel: string
}

export interface UpdateCORSSettingsRequest {
  settings: CORSSettings
}

export interface GetServerSettingsResponse {
  settings: ServerSettings
}

// Local DNS Configuration types
export interface LocalDNSServer {
  ip: string
  enabled: boolean
}

export interface LocalDNSConfig {
  servers: LocalDNSServer[]
}

export interface UpdateLocalDNSRequest {
  config: LocalDNSConfig
}

export interface GetLocalDNSResponse {
  config: LocalDNSConfig
}

// Public DNS Server Configuration types
export interface PublicDNSServer {
  id: string
  name: string
  ip: string
  provider: string
  enabled: boolean
  isPrimary?: boolean
}

export interface PublicDNSConfig {
  servers: PublicDNSServer[]
}

export interface UpdatePublicDNSRequest {
  config: PublicDNSConfig
}

export interface GetPublicDNSResponse {
  config: PublicDNSConfig
}

// Test Configuration types
export interface TestConfiguration {
  domainCounts: {
    quick: number
    full: number
    custom: number
  }
  queryTypes: {
    cached: boolean
    uncached: boolean
    dotcom: boolean
  }
  performance: {
    maxConcurrentServers: number
    queryTimeout: number
    maxRetries: number
    rateLimitMs: number
  }
  analysis: {
    detectRedirection: boolean
    detectMalwareBlocking: boolean
    testDNSSEC: boolean
    minReliabilityThreshold: number
  }
}

export interface UpdateTestConfigRequest {
  config: TestConfiguration
}

export interface GetTestConfigResponse {
  config: TestConfiguration
}

// Domain List Configuration types
export interface DomainListConfig {
  domains: string[]
  lastModified: Date
}

export interface UpdateDomainListRequest {
  config: DomainListConfig
}

export interface GetDomainListResponse {
  config: DomainListConfig
}