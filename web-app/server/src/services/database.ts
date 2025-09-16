import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { BenchmarkResult, TestStatus } from '@dns-bench/shared'

export interface TestRun {
  id: string
  startedAt: Date
  completedAt?: Date
  testType: string
  status: string
  options?: any
  results?: BenchmarkResult[]
}

export class DatabaseService {
  private db: Database.Database

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath)
    this.initializeTables()
  }

  private initializeTables(): void {
    // Create test_runs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS test_runs (
        id TEXT PRIMARY KEY,
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        test_type TEXT NOT NULL,
        status TEXT NOT NULL,
        options TEXT,
        results TEXT
      )
    `)

    // Create test_results table for detailed per-server results
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS test_results (
        id TEXT PRIMARY KEY,
        test_run_id TEXT NOT NULL,
        server_name TEXT NOT NULL,
        server_ip TEXT NOT NULL,
        avg_time REAL,
        min_time REAL,
        max_time REAL,
        median_time REAL,
        success_rate REAL,
        total_queries INTEGER,
        successful_queries INTEGER,
        failed_queries INTEGER,
        FOREIGN KEY (test_run_id) REFERENCES test_runs (id)
      )
    `)

    // Create table for detailed per-domain test results
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS domain_test_results (
        id TEXT PRIMARY KEY,
        test_run_id TEXT NOT NULL,
        server_ip TEXT NOT NULL,
        domain TEXT NOT NULL,
        success BOOLEAN NOT NULL,
        response_time REAL,
        response_code TEXT,
        error_type TEXT,
        authoritative BOOLEAN,
        query_time REAL,
        ip_result TEXT,
        error_message TEXT,
        raw_output TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (test_run_id) REFERENCES test_runs (id)
      )
    `)

    // Create failure analysis table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS failure_analysis (
        id TEXT PRIMARY KEY,
        test_run_id TEXT NOT NULL,
        domain TEXT NOT NULL,
        consistent_failure BOOLEAN NOT NULL,
        upstream_should_resolve BOOLEAN,
        failure_pattern TEXT,
        analysis_timestamp INTEGER NOT NULL,
        FOREIGN KEY (test_run_id) REFERENCES test_runs (id)
      )
    `)

    // Create indexes for faster queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_test_runs_started_at ON test_runs (started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_domain_results_test_run ON domain_test_results (test_run_id);
      CREATE INDEX IF NOT EXISTS idx_domain_results_domain ON domain_test_results (domain);
      CREATE INDEX IF NOT EXISTS idx_domain_results_server ON domain_test_results (server_ip);
      CREATE INDEX IF NOT EXISTS idx_failure_analysis_test_run ON failure_analysis (test_run_id);
    `)
  }

  async saveTestRun(testStatus: TestStatus): Promise<void> {
    const insertTestRun = this.db.prepare(`
      INSERT OR REPLACE INTO test_runs (
        id, started_at, completed_at, test_type, status, options, results
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const testRun = {
      id: testStatus.testId,
      started_at: testStatus.startedAt.getTime(),
      completed_at: testStatus.completedAt?.getTime() || null,
      test_type: 'benchmark', // Could be derived from options
      status: testStatus.status,
      options: JSON.stringify({
        servers: testStatus.servers,
        domains: testStatus.domains,
        totalTests: testStatus.totalTests
      }),
      results: testStatus.results ? JSON.stringify(testStatus.results) : null
    }

    insertTestRun.run(
      testRun.id,
      testRun.started_at,
      testRun.completed_at,
      testRun.test_type,
      testRun.status,
      testRun.options,
      testRun.results
    )

    // Save detailed results if available
    if (testStatus.results && testStatus.results.length > 0) {
      const insertResult = this.db.prepare(`
        INSERT OR REPLACE INTO test_results (
          id, test_run_id, server_name, server_ip, avg_time, min_time, max_time,
          median_time, success_rate, total_queries, successful_queries, failed_queries
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const result of testStatus.results) {
        insertResult.run(
          randomUUID(),
          testStatus.testId,
          result.serverName,
          result.server,
          result.avgResponseTime,
          result.minResponseTime,
          result.maxResponseTime,
          result.medianResponseTime,
          result.successRate,
          result.totalQueries,
          result.successfulQueries,
          result.failedQueries
        )
      }
    }
  }

  async getTestResults(limit: number = 10, offset: number = 0): Promise<{
    results: TestRun[]
    total: number
  }> {
    const countQuery = this.db.prepare('SELECT COUNT(*) as count FROM test_runs')
    const total = (countQuery.get() as { count: number }).count

    const query = this.db.prepare(`
      SELECT id, started_at, completed_at, test_type, status, options, results
      FROM test_runs
      ORDER BY started_at DESC
      LIMIT ? OFFSET ?
    `)

    const rows = query.all(limit, offset) as any[]
    
    const results: TestRun[] = rows.map(row => ({
      id: row.id,
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      testType: row.test_type,
      status: row.status,
      options: row.options ? JSON.parse(row.options) : undefined,
      results: row.results ? JSON.parse(row.results) : undefined
    }))

    return { results, total }
  }

  async getTestResult(testId: string): Promise<TestRun | null> {
    const query = this.db.prepare(`
      SELECT id, started_at, completed_at, test_type, status, options, results
      FROM test_runs
      WHERE id = ?
    `)

    const row = query.get(testId) as any
    
    if (!row) {
      return null
    }

    return {
      id: row.id,
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      testType: row.test_type,
      status: row.status,
      options: row.options ? JSON.parse(row.options) : undefined,
      results: row.results ? JSON.parse(row.results) : undefined
    }
  }

  async getDetailedTestResults(testId: string): Promise<BenchmarkResult[]> {
    const query = this.db.prepare(`
      SELECT server_name, server_ip, avg_time, min_time, max_time, median_time,
             success_rate, total_queries, successful_queries, failed_queries
      FROM test_results
      WHERE test_run_id = ?
      ORDER BY avg_time ASC
    `)

    const rows = query.all(testId) as any[]
    
    return rows.map(row => ({
      server: row.server_ip,
      serverName: row.server_name,
      avgResponseTime: row.avg_time,
      minResponseTime: row.min_time,
      maxResponseTime: row.max_time,
      medianResponseTime: row.median_time,
      successRate: row.success_rate,
      totalQueries: row.total_queries,
      successfulQueries: row.successful_queries,
      failedQueries: row.failed_queries
    }))
  }

  async deleteTestResult(testId: string): Promise<boolean> {
    const deleteResults = this.db.prepare('DELETE FROM test_results WHERE test_run_id = ?')
    const deleteRun = this.db.prepare('DELETE FROM test_runs WHERE id = ?')
    
    const transaction = this.db.transaction(() => {
      deleteResults.run(testId)
      deleteRun.run(testId)
    })
    
    try {
      transaction()
      return true
    } catch (error) {
      return false
    }
  }

  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)
    
    const deleteResults = this.db.prepare(`
      DELETE FROM test_results 
      WHERE test_run_id IN (
        SELECT id FROM test_runs WHERE started_at < ?
      )
    `)
    
    const deleteRuns = this.db.prepare('DELETE FROM test_runs WHERE started_at < ?')
    
    const transaction = this.db.transaction(() => {
      deleteResults.run(cutoffTime)
      const info = deleteRuns.run(cutoffTime)
      return info.changes
    })
    
    return transaction() as number
  }

  async saveDomainResults(testRunId: string, domainResults: Array<{
    serverIp: string;
    domain: string;
    success: boolean;
    responseTime?: number;
    responseCode?: string;
    errorType?: string;
    authoritative?: boolean;
    queryTime?: number;
    ipResult?: string;
    errorMessage?: string;
    rawOutput?: string;
  }>): Promise<void> {
    const insertDomainResult = this.db.prepare(`
      INSERT INTO domain_test_results (
        id, test_run_id, server_ip, domain, success, response_time,
        response_code, error_type, authoritative, query_time,
        ip_result, error_message, raw_output, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const transaction = this.db.transaction(() => {
      for (const result of domainResults) {
        insertDomainResult.run(
          randomUUID(),
          testRunId,
          result.serverIp,
          result.domain,
          result.success,
          result.responseTime || null,
          result.responseCode || null,
          result.errorType || null,
          result.authoritative || null,
          result.queryTime || null,
          result.ipResult || null,
          result.errorMessage || null,
          result.rawOutput || null,
          Date.now()
        )
      }
    })

    transaction()
  }

  async saveFailureAnalysis(testRunId: string, failureAnalysis: Array<{
    domain: string;
    consistentFailure: boolean;
    upstreamShouldResolve?: boolean;
    failurePattern: string;
  }>): Promise<void> {
    const insertFailureAnalysis = this.db.prepare(`
      INSERT INTO failure_analysis (
        id, test_run_id, domain, consistent_failure,
        upstream_should_resolve, failure_pattern, analysis_timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const transaction = this.db.transaction(() => {
      for (const analysis of failureAnalysis) {
        insertFailureAnalysis.run(
          randomUUID(),
          testRunId,
          analysis.domain,
          analysis.consistentFailure,
          analysis.upstreamShouldResolve || null,
          analysis.failurePattern,
          Date.now()
        )
      }
    })

    transaction()
  }

  async getDomainResults(testRunId: string): Promise<Array<{
    id: string;
    serverIp: string;
    domain: string;
    success: boolean;
    responseTime?: number;
    responseCode?: string;
    errorType?: string;
    authoritative?: boolean;
    queryTime?: number;
    ipResult?: string;
    errorMessage?: string;
    rawOutput?: string;
    timestamp: Date;
  }>> {
    const query = this.db.prepare(`
      SELECT id, server_ip, domain, success, response_time, response_code,
             error_type, authoritative, query_time, ip_result, error_message,
             raw_output, timestamp
      FROM domain_test_results
      WHERE test_run_id = ?
      ORDER BY domain, server_ip
    `)

    const rows = query.all(testRunId) as any[]

    return rows.map(row => ({
      id: row.id,
      serverIp: row.server_ip,
      domain: row.domain,
      success: Boolean(row.success),
      responseTime: row.response_time,
      responseCode: row.response_code,
      errorType: row.error_type,
      authoritative: row.authoritative ? Boolean(row.authoritative) : undefined,
      queryTime: row.query_time,
      ipResult: row.ip_result,
      errorMessage: row.error_message,
      rawOutput: row.raw_output,
      timestamp: new Date(row.timestamp)
    }))
  }

  async getFailureAnalysis(testRunId: string): Promise<Array<{
    id: string;
    domain: string;
    consistentFailure: boolean;
    upstreamShouldResolve?: boolean;
    failurePattern: string;
    analysisTimestamp: Date;
  }>> {
    const query = this.db.prepare(`
      SELECT id, domain, consistent_failure, upstream_should_resolve,
             failure_pattern, analysis_timestamp
      FROM failure_analysis
      WHERE test_run_id = ?
      ORDER BY domain
    `)

    const rows = query.all(testRunId) as any[]

    return rows.map(row => ({
      id: row.id,
      domain: row.domain,
      consistentFailure: Boolean(row.consistent_failure),
      upstreamShouldResolve: row.upstream_should_resolve ? Boolean(row.upstream_should_resolve) : undefined,
      failurePattern: row.failure_pattern,
      analysisTimestamp: new Date(row.analysis_timestamp)
    }))
  }

  async getDomainResultsByDomain(testRunId: string, domain: string): Promise<Array<{
    serverIp: string;
    success: boolean;
    responseTime?: number;
    responseCode?: string;
    errorType?: string;
    errorMessage?: string;
  }>> {
    const query = this.db.prepare(`
      SELECT server_ip, success, response_time, response_code, error_type, error_message
      FROM domain_test_results
      WHERE test_run_id = ? AND domain = ?
      ORDER BY server_ip
    `)

    const rows = query.all(testRunId, domain) as any[]

    return rows.map(row => ({
      serverIp: row.server_ip,
      success: Boolean(row.success),
      responseTime: row.response_time,
      responseCode: row.response_code,
      errorType: row.error_type,
      errorMessage: row.error_message
    }))
  }

  close(): void {
    this.db.close()
  }
}
