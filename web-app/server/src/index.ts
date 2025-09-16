import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import pino from 'pino'
import { z } from 'zod'
import { DNSBenchmarkService } from './services/dns-benchmark.js'
import { DatabaseService } from './services/database.js'
import { WebSocketService } from './services/websocket.js'
import { SettingsService } from './services/settings.js'
import type { BenchmarkOptions, DNSServer, UpdateCORSSettingsRequest, LocalDNSConfig } from '@dns-bench/shared'

// Load environment variables
dotenv.config()

// Configure logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard'
    }
  }
})

// Initialize services
const dbService = new DatabaseService()
const settingsService = new SettingsService(logger)
const dnsService = new DNSBenchmarkService(logger, settingsService, dbService)

// Create Express app
const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: async (origin, callback) => {
      try {
        const settings = await settingsService.loadSettings()
        const isAllowed = settingsService.checkOrigin(origin, settings.cors)
        callback(null, isAllowed)
      } catch (error) {
        logger.error({ error, origin }, 'CORS check failed for WebSocket')
        callback(null, false)
      }
    },
    methods: ['GET', 'POST']
  }
})

// Initialize WebSocket service
const wsService = new WebSocketService(io, dnsService, logger)

// Middleware
app.use(helmet())
app.use(compression())
app.use(cors({
  origin: async (origin, callback) => {
    try {
      const settings = await settingsService.loadSettings()
      const isAllowed = settingsService.checkOrigin(origin, settings.cors)

      if (isAllowed) {
        callback(null, true)
      } else {
        logger.warn({ origin, corsSettings: settings.cors }, 'CORS blocked origin')
        callback(new Error('Not allowed by CORS'))
      }
    } catch (error) {
      logger.error({ error, origin }, 'CORS check failed')
      callback(new Error('CORS check failed'))
    }
  },
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})
app.use('/api/', limiter)

// Request schemas
const startBenchmarkSchema = z.object({
  servers: z.array(z.string().ip()).min(1).max(20),
  testType: z.enum(['quick', 'full', 'custom']),
  domains: z.array(z.string().url()).optional(),
  options: z.object({
    timeout: z.number().min(1000).max(10000).optional(),
    retries: z.number().min(0).max(3).optional(),
    concurrent: z.number().min(1).max(10).optional()
  }).optional()
})

const corsSettingsSchema = z.object({
  allowIPAccess: z.boolean(),
  allowHostnameAccess: z.boolean(),
  customOrigins: z.array(z.string())
})

const localDNSSchema = z.object({
  servers: z.array(z.object({
    ip: z.string().ip(),
    enabled: z.boolean()
  })).min(1).max(10)
})

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/dns/current', async (req, res) => {
  try {
    const servers = await dnsService.getCurrentDNSServers()
    res.json({ servers })
  } catch (error) {
    logger.error({ error }, 'Failed to get current DNS servers')
    res.status(500).json({ error: 'Failed to detect DNS servers' })
  }
})

app.post('/api/benchmark/start', async (req, res) => {
  try {
    const { servers, testType, domains, options } = startBenchmarkSchema.parse(req.body)
    
    const testId = await dnsService.startBenchmark({
      servers,
      testType,
      domains,
      options
    })
    
    logger.info({ testId, servers: servers.length }, 'Benchmark started')
    res.json({ testId, status: 'started' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors })
    } else {
      logger.error({ error }, 'Failed to start benchmark')
      res.status(500).json({ error: 'Failed to start benchmark' })
    }
  }
})

app.get('/api/benchmark/:testId/status', async (req, res) => {
  try {
    const { testId } = req.params
    const status = await dnsService.getBenchmarkStatus(testId)
    
    if (!status) {
      return res.status(404).json({ error: 'Test not found' })
    }
    
    res.json(status)
  } catch (error) {
    logger.error({ error, testId: req.params.testId }, 'Failed to get benchmark status')
    res.status(500).json({ error: 'Failed to get test status' })
  }
})

app.get('/api/results', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10
    const offset = parseInt(req.query.offset as string) || 0
    
    const results = await dbService.getTestResults(limit, offset)
    res.json(results)
  } catch (error) {
    logger.error({ error }, 'Failed to get test results')
    res.status(500).json({ error: 'Failed to get results' })
  }
})

app.get('/api/results/:testId/export', async (req, res) => {
  try {
    const { testId } = req.params
    const format = req.query.format as string || 'json'

    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Use json or csv' })
    }

    const result = await dbService.getTestResult(testId)
    if (!result) {
      return res.status(404).json({ error: 'Test result not found' })
    }

    if (format === 'csv') {
      const csv = dnsService.exportToCSV(result)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="dns-benchmark-${testId}.csv"`)
      res.send(csv)
    } else {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="dns-benchmark-${testId}.json"`)
      res.json(result)
    }
  } catch (error) {
    logger.error({ error, testId: req.params.testId }, 'Failed to export result')
    res.status(500).json({ error: 'Failed to export result' })
  }
})

app.delete('/api/results/:testId', async (req, res) => {
  try {
    const { testId } = req.params

    const success = await dbService.deleteTestResult(testId)
    if (!success) {
      return res.status(404).json({ error: 'Test result not found' })
    }

    logger.info({ testId }, 'Test result deleted')
    res.json({ success: true, message: 'Test result deleted successfully' })
  } catch (error) {
    logger.error({ error, testId: req.params.testId }, 'Failed to delete result')
    res.status(500).json({ error: 'Failed to delete result' })
  }
})

// Detailed domain results endpoints
app.get('/api/results/:testId/domains', async (req, res) => {
  try {
    const { testId } = req.params

    // Check if test exists
    const testResult = await dbService.getTestResult(testId)
    if (!testResult) {
      return res.status(404).json({ error: 'Test result not found' })
    }

    const domainResults = await dbService.getDomainResults(testId)
    res.json({ domainResults })
  } catch (error) {
    logger.error({ error, testId: req.params.testId }, 'Failed to get domain results')
    res.status(500).json({ error: 'Failed to get domain results' })
  }
})

app.get('/api/results/:testId/failures', async (req, res) => {
  try {
    const { testId } = req.params

    // Check if test exists
    const testResult = await dbService.getTestResult(testId)
    if (!testResult) {
      return res.status(404).json({ error: 'Test result not found' })
    }

    const failureAnalysis = await dbService.getFailureAnalysis(testId)
    res.json({ failureAnalysis })
  } catch (error) {
    logger.error({ error, testId: req.params.testId }, 'Failed to get failure analysis')
    res.status(500).json({ error: 'Failed to get failure analysis' })
  }
})

app.get('/api/results/:testId/domains/:domain', async (req, res) => {
  try {
    const { testId, domain } = req.params

    // Check if test exists
    const testResult = await dbService.getTestResult(testId)
    if (!testResult) {
      return res.status(404).json({ error: 'Test result not found' })
    }

    const domainResults = await dbService.getDomainResultsByDomain(testId, domain)
    if (domainResults.length === 0) {
      return res.status(404).json({ error: 'Domain results not found' })
    }

    res.json({ domain, results: domainResults })
  } catch (error) {
    logger.error({ error, testId: req.params.testId, domain: req.params.domain }, 'Failed to get domain-specific results')
    res.status(500).json({ error: 'Failed to get domain-specific results' })
  }
})

// Settings endpoints
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await settingsService.loadSettings()
    res.json({ settings })
  } catch (error) {
    logger.error({ error }, 'Failed to get settings')
    res.status(500).json({ error: 'Failed to get settings' })
  }
})

app.put('/api/settings/cors', async (req, res) => {
  try {
    const corsSettings = corsSettingsSchema.parse(req.body)
    const updatedSettings = await settingsService.updateCORSSettings(corsSettings)
    res.json({ settings: updatedSettings })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid CORS settings', details: error.errors })
    } else {
      logger.error({ error }, 'Failed to update CORS settings')
      res.status(500).json({ error: 'Failed to update CORS settings' })
    }
  }
})

app.post('/api/settings/detect-hostname', async (req, res) => {
  try {
    const hostname = await settingsService.detectHostname()
    res.json({ hostname })
  } catch (error) {
    logger.error({ error }, 'Failed to detect hostname')
    res.status(500).json({ error: 'Failed to detect hostname' })
  }
})

app.get('/api/server-info', async (req, res) => {
  try {
    const hostname = await settingsService.detectHostname()
    const hostIP = await settingsService.getDockerHostIP()
    logger.info({ hostIP, env: { HOST_IP: process.env.HOST_IP, DOCKER_HOST_IP: process.env.DOCKER_HOST_IP }}, 'Server info - Host IP detection')
    const settings = await settingsService.loadSettings()

    res.json({
      hostname,
      hostIP,
      detectedHostname: settings.cors.detectedHostname,
      detectedHostIP: settings.cors.detectedHostIP,
      port: settings.port,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error({ error }, 'Failed to get server info')
    res.status(500).json({ error: 'Failed to get server info' })
  }
})

// Local DNS configuration endpoints
app.get('/api/settings/local-dns', async (req, res) => {
  try {
    const config = await settingsService.loadLocalDNSConfig()
    res.json({ config })
  } catch (error) {
    logger.error({ error }, 'Failed to get local DNS configuration')
    res.status(500).json({ error: 'Failed to get local DNS configuration' })
  }
})

app.put('/api/settings/local-dns', async (req, res) => {
  try {
    const config = localDNSSchema.parse(req.body)
    const savedConfig = await settingsService.saveLocalDNSConfig(config)
    res.json({ config: savedConfig })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid local DNS configuration', details: error.errors })
    } else {
      logger.error({ error }, 'Failed to save local DNS configuration')
      res.status(500).json({ error: 'Failed to save local DNS configuration' })
    }
  }
})

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ error, url: req.url, method: req.method }, 'Unhandled error')
  res.status(500).json({ error: 'Internal server error' })
})

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Start server
const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, 'DNS Bench server started')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully')
  httpServer.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully')
  httpServer.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})
