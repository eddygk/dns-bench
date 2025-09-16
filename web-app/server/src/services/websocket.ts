import { Server as SocketIOServer, Socket } from 'socket.io'
import type { Logger } from 'pino'
import { DNSBenchmarkService } from './dns-benchmark.js'
import type { BenchmarkOptions, TestStatus, WebSocketEvent } from '@dns-bench/shared'

export class WebSocketService {
  private connectedClients = new Map<string, Socket>()
  private testSubscriptions = new Map<string, Set<string>>() // testId -> Set of socketIds

  constructor(
    private io: SocketIOServer,
    private dnsService: DNSBenchmarkService,
    private logger: Logger
  ) {
    this.initializeSocketHandlers()
    this.startProgressMonitoring()
  }

  private initializeSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.logger.info({ socketId: socket.id }, 'Client connected')
      this.connectedClients.set(socket.id, socket)

      // Handle benchmark start
      socket.on('start-benchmark', async (data: {
        servers: string[]
        testType: 'quick' | 'full' | 'custom'
        domains?: string[]
        options?: BenchmarkOptions
      }) => {
        try {
          this.logger.info({ socketId: socket.id, data }, 'Starting benchmark via WebSocket')
          
          const testId = await this.dnsService.startBenchmark(data)
          
          // Subscribe this socket to test updates
          if (!this.testSubscriptions.has(testId)) {
            this.testSubscriptions.set(testId, new Set())
          }
          this.testSubscriptions.get(testId)!.add(socket.id)
          
          // Send confirmation
          socket.emit('benchmark-started', { testId })
          
        } catch (error) {
          this.logger.error({ error, socketId: socket.id }, 'Failed to start benchmark')
          socket.emit('benchmark-error', {
            error: error instanceof Error ? error.message : 'Failed to start benchmark'
          })
        }
      })

      // Handle benchmark cancellation
      socket.on('cancel-benchmark', (data: { testId: string }) => {
        try {
          // TODO: Implement benchmark cancellation in DNSBenchmarkService
          this.logger.info({ socketId: socket.id, testId: data.testId }, 'Benchmark cancellation requested')
          
          // Unsubscribe from updates
          const subscribers = this.testSubscriptions.get(data.testId)
          if (subscribers) {
            subscribers.delete(socket.id)
            if (subscribers.size === 0) {
              this.testSubscriptions.delete(data.testId)
            }
          }
          
          socket.emit('benchmark-cancelled', { testId: data.testId })
          
        } catch (error) {
          this.logger.error({ error, socketId: socket.id }, 'Failed to cancel benchmark')
          socket.emit('benchmark-error', {
            testId: data.testId,
            error: 'Failed to cancel benchmark'
          })
        }
      })

      // Handle test status subscription
      socket.on('subscribe-test', (data: { testId: string }) => {
        if (!this.testSubscriptions.has(data.testId)) {
          this.testSubscriptions.set(data.testId, new Set())
        }
        this.testSubscriptions.get(data.testId)!.add(socket.id)
        
        // Send current status immediately
        const status = this.dnsService.getBenchmarkStatus(data.testId)
        if (status) {
          socket.emit('benchmark-progress', this.formatProgressEvent(status))
          
          if (status.status === 'completed') {
            socket.emit('benchmark-complete', this.formatCompleteEvent(status))
          } else if (status.status === 'failed') {
            socket.emit('benchmark-error', {
              testId: data.testId,
              error: status.error || 'Test failed'
            })
          }
        }
      })

      // Handle test status unsubscription
      socket.on('unsubscribe-test', (data: { testId: string }) => {
        const subscribers = this.testSubscriptions.get(data.testId)
        if (subscribers) {
          subscribers.delete(socket.id)
          if (subscribers.size === 0) {
            this.testSubscriptions.delete(data.testId)
          }
        }
      })

      // Handle client disconnection
      socket.on('disconnect', () => {
        this.logger.info({ socketId: socket.id }, 'Client disconnected')
        this.connectedClients.delete(socket.id)
        
        // Remove from all test subscriptions
        for (const [testId, subscribers] of this.testSubscriptions.entries()) {
          subscribers.delete(socket.id)
          if (subscribers.size === 0) {
            this.testSubscriptions.delete(testId)
          }
        }
      })
    })
  }

  private startProgressMonitoring(): void {
    // Monitor active tests and broadcast progress updates
    setInterval(() => {
      for (const [testId, subscribers] of this.testSubscriptions.entries()) {
        if (subscribers.size === 0) continue
        
        const status = this.dnsService.getBenchmarkStatus(testId)
        if (!status) {
          // Test not found, clean up subscriptions
          this.testSubscriptions.delete(testId)
          continue
        }
        
        // Broadcast progress update to all subscribers
        const progressEvent = this.formatProgressEvent(status)
        this.broadcastToSubscribers(testId, 'benchmark-progress', progressEvent)
        
        // Handle completion or failure
        if (status.status === 'completed') {
          const completeEvent = this.formatCompleteEvent(status)
          this.broadcastToSubscribers(testId, 'benchmark-complete', completeEvent)
          
          // Clean up subscriptions after completion
          setTimeout(() => {
            this.testSubscriptions.delete(testId)
          }, 5000) // Keep for 5 seconds to allow final updates
          
        } else if (status.status === 'failed') {
          this.broadcastToSubscribers(testId, 'benchmark-error', {
            testId,
            error: status.error || 'Test failed'
          })
          
          // Clean up failed test subscriptions
          this.testSubscriptions.delete(testId)
        }
      }
    }, 1000) // Check every second
  }

  private broadcastToSubscribers(testId: string, event: string, data: any): void {
    const subscribers = this.testSubscriptions.get(testId)
    if (!subscribers) return
    
    for (const socketId of subscribers) {
      const socket = this.connectedClients.get(socketId)
      if (socket) {
        socket.emit(event, data)
      } else {
        // Socket no longer exists, remove from subscribers
        subscribers.delete(socketId)
      }
    }
  }

  private formatProgressEvent(status: TestStatus): WebSocketEvent['benchmark-progress'] {
    return {
      testId: status.testId,
      progress: status.progress,
      status: status.status,
      completedTests: Math.floor((status.progress / 100) * status.totalTests),
      totalTests: status.totalTests,
      currentServer: this.getCurrentServer(status),
      currentDomain: this.getCurrentDomain(status),
      estimatedTimeRemaining: this.calculateEstimatedTime(status),
      partialResults: status.results || []
    }
  }

  private formatCompleteEvent(status: TestStatus): WebSocketEvent['benchmark-complete'] {
    return {
      testId: status.testId,
      duration: status.completedAt && status.startedAt 
        ? status.completedAt.getTime() - status.startedAt.getTime()
        : 0,
      results: status.results || [],
      summary: {
        totalServers: status.servers.length,
        totalDomains: status.domains.length,
        totalTests: status.totalTests,
        successfulTests: this.countSuccessfulTests(status.results || []),
        fastestServer: this.getFastestServer(status.results || []),
        slowestServer: this.getSlowestServer(status.results || [])
      }
    }
  }

  private getCurrentServer(status: TestStatus): string | undefined {
    // Simple estimation based on progress
    const completedTests = Math.floor((status.progress / 100) * status.totalTests)
    const serverIndex = Math.floor(completedTests / status.domains.length)
    return status.servers[serverIndex]
  }

  private getCurrentDomain(status: TestStatus): string | undefined {
    // Simple estimation based on progress  
    const completedTests = Math.floor((status.progress / 100) * status.totalTests)
    const domainIndex = completedTests % status.domains.length
    return status.domains[domainIndex]
  }

  private calculateEstimatedTime(status: TestStatus): number {
    if (status.progress === 0) return 0
    
    const elapsed = Date.now() - status.startedAt.getTime()
    const estimatedTotal = (elapsed / status.progress) * 100
    const remaining = estimatedTotal - elapsed
    
    return Math.max(0, Math.floor(remaining / 1000)) // Return in seconds
  }

  private countSuccessfulTests(results: any[]): number {
    return results.reduce((count, result) => {
      return count + (result.successfulQueries || 0)
    }, 0)
  }

  private getFastestServer(results: any[]): { server: string; time: number } | undefined {
    let fastest: { server: string; time: number } | undefined
    
    for (const result of results) {
      if (result.avgResponseTime > 0) {
        if (!fastest || result.avgResponseTime < fastest.time) {
          fastest = {
            server: result.serverName || result.server,
            time: result.avgResponseTime
          }
        }
      }
    }
    
    return fastest
  }

  private getSlowestServer(results: any[]): { server: string; time: number } | undefined {
    let slowest: { server: string; time: number } | undefined
    
    for (const result of results) {
      if (result.avgResponseTime > 0) {
        if (!slowest || result.avgResponseTime > slowest.time) {
          slowest = {
            server: result.serverName || result.server,
            time: result.avgResponseTime
          }
        }
      }
    }
    
    return slowest
  }

  // Public method to broadcast custom events
  broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data)
  }

  // Get connection statistics
  getStats(): {
    connectedClients: number
    activeSubscriptions: number
    totalTests: number
  } {
    return {
      connectedClients: this.connectedClients.size,
      activeSubscriptions: Array.from(this.testSubscriptions.values())
        .reduce((total, subs) => total + subs.size, 0),
      totalTests: this.testSubscriptions.size
    }
  }
}
