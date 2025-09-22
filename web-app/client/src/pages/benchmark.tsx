import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import { apiRequest, getBackendURL } from '@/lib/api'
import { io, Socket } from 'socket.io-client'
import {
  Activity,
  Play,
  Square,
  Timer,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  Database
} from 'lucide-react'

interface RealTimeResult {
  name: string
  ip: string
  time: number
  status: 'success' | 'running' | 'pending' | 'failed'
  tests: string
  timingMethod?: 'performance-observer' | 'manual-fallback'
}

export function BenchmarkPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [testType, setTestType] = useState(searchParams.get('type') || 'quick')
  const autostart = searchParams.get('autostart') === 'true'
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTest, setCurrentTest] = useState<string>('')
  const [testId, setTestId] = useState<string | null>(null)
  const [realTimeResults, setRealTimeResults] = useState<RealTimeResult[]>([])
  const [activityLog, setActivityLog] = useState<Array<{domain: string, server: string, time: number | null, status: 'success' | 'timeout', timingMethod?: 'high-precision' | 'fallback' | 'performance-observer' | 'manual-fallback'}>>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const [hasAutostarted, setHasAutostarted] = useState(false)

  // Connect to Socket.IO for real-time updates
  useEffect(() => {
    if (!testId || !isRunning) return

    const backendURL = getBackendURL()
    const newSocket = io(backendURL)

    newSocket.on('connect', () => {
      console.log('Socket.IO connected')
      // Subscribe to the test updates
      newSocket.emit('subscribe-test', { testId })
    })

    newSocket.on('benchmark-progress', (data) => {
      console.log('Progress update:', data)
      if (data.testId === testId) {
        setProgress(data.progress)
        if (data.currentDomain && data.currentServer) {
          setCurrentTest(`Testing ${data.currentDomain} @ ${data.currentServer}`)

          // Add current test to activity log
          setActivityLog(prev => {
            const newEntry = {
              domain: data.currentDomain,
              server: data.currentServer,
              time: null,
              status: 'success' as const
            }

            // Avoid duplicates - only add if the last entry is different
            if (prev.length === 0 ||
                prev[0].domain !== data.currentDomain ||
                prev[0].server !== data.currentServer) {
              return [newEntry, ...prev].slice(0, 15) // Keep last 15 entries
            }
            return prev
          })
        }

        // Update real-time results with partial results
        if (data.partialResults) {
          setRealTimeResults(prev => {
            const newResults = [...prev]
            data.partialResults.forEach((result: any) => {
              const existingIndex = newResults.findIndex(r => r.ip === result.server)
              if (existingIndex >= 0) {
                newResults[existingIndex] = {
                  ...newResults[existingIndex],
                  time: result.avgResponseTime || newResults[existingIndex].time,
                  status: result.successfulQueries > 0 ? 'success' : result.failedQueries > 0 ? 'failed' : 'running',
                  tests: `${result.successfulQueries || 0}/${result.totalQueries || 20}`,
                  timingMethod: result.timingPrecision || 'manual-fallback'
                }
              }
            })
            return newResults
          })
        }
      }
    })

    newSocket.on('benchmark-complete', (data) => {
      console.log('Benchmark complete:', data)
      if (data.testId === testId) {
        setIsRunning(false)
        setProgress(100)
        setCurrentTest('Benchmark completed!')

        // Navigate to results page after a short delay
        setTimeout(() => {
          navigate(`/results/${testId}`)
        }, 2000)
      }
    })

    newSocket.on('benchmark-error', (data) => {
      console.error('Benchmark error:', data)
      if (data.testId === testId) {
        setIsRunning(false)
        setCurrentTest(`Error: ${data.error}`)
      }
    })

    newSocket.on('disconnect', () => {
      console.log('Socket.IO disconnected')
    })

    setSocket(newSocket)

    return () => {
      if (newSocket) {
        newSocket.emit('unsubscribe-test', { testId })
        newSocket.disconnect()
      }
    }
  }, [testId, isRunning, navigate])

  // Auto-start benchmark if requested
  useEffect(() => {
    if (autostart && !hasAutostarted && !isRunning) {
      setHasAutostarted(true)
      handleStartBenchmark()
    }
  }, [autostart, hasAutostarted, isRunning])

  const handleStartBenchmark = async () => {
    try {
      setIsRunning(true)
      setProgress(0)
      setCurrentTest('Detecting current DNS servers...')
      setRealTimeResults([])
      setActivityLog([])

      // Get current DNS servers first
      const dnsResponse = await apiRequest('/api/dns/current')
      const { servers: currentServers } = await dnsResponse.json()

      // Determine servers based on test type
      let serversToTest: string[] = []
      if (testType === 'quick') {
        serversToTest = [
          ...currentServers, // Include ALL local DNS servers
          '1.1.1.1', // Cloudflare
          '8.8.8.8', // Google
          '9.9.9.9'  // Quad9
        ]
      } else if (testType === 'full') {
        serversToTest = [
          ...currentServers,
          '1.1.1.1', '1.0.0.1',
          '8.8.8.8', '8.8.4.4',
          '9.9.9.9', '149.112.112.112',
          '208.67.222.222', '208.67.220.220',
          '4.2.2.1', '4.2.2.2'
        ]
      }

      // Initialize real-time results
      const initialResults: RealTimeResult[] = serversToTest.map(server => ({
        name: getServerName(server, currentServers),
        ip: server,
        time: 0,
        status: 'pending',
        tests: '0/20'
      }))
      setRealTimeResults(initialResults)

      // Start benchmark
      const response = await apiRequest('/api/benchmark/start', {
        method: 'POST',
        body: JSON.stringify({
          servers: serversToTest,
          testType,
          options: {
            timeout: 2000,
            retries: 1,
            concurrent: 3
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to start benchmark')
      }

      const { testId: newTestId } = await response.json()
      setTestId(newTestId)
      setCurrentTest('Benchmark started...')
    } catch (error) {
      console.error('Error starting benchmark:', error)
      setIsRunning(false)
      setCurrentTest('Failed to start benchmark')
    }
  }

  const handleStopBenchmark = async () => {
    if (testId && socket) {
      socket.emit('cancel-benchmark', { testId })
      console.log('Cancelling benchmark:', testId)
    }
    setIsRunning(false)
    setProgress(0)
    setCurrentTest('')
    setTestId(null)
  }

  const handleTestTypeChange = (newTestType: string) => {
    if (isRunning) return // Don't allow changes during a running test

    setTestType(newTestType)
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev)
      newParams.set('type', newTestType)
      return newParams
    })
  }

  const getServerName = (ip: string, currentServers: string[]): string => {
    if (currentServers.includes(ip)) {
      return ip
    }
    const serverNames: Record<string, string> = {
      '1.1.1.1': 'Cloudflare',
      '1.0.0.1': 'Cloudflare',
      '8.8.8.8': 'Google',
      '8.8.4.4': 'Google',
      '9.9.9.9': 'Quad9',
      '149.112.112.112': 'Quad9',
      '208.67.222.222': 'OpenDNS',
      '208.67.220.220': 'OpenDNS',
      '4.2.2.1': 'Level3',
      '4.2.2.2': 'Level3'
    }
    return serverNames[ip] || `Custom-${ip}`
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">DNS Benchmark</h1>

        {/* Test Type Toggle */}
        <div className="flex flex-col space-y-2">
          <ToggleGroup
            type="single"
            value={testType}
            onValueChange={(value) => value && handleTestTypeChange(value)}
            disabled={isRunning}
            className="justify-start"
          >
            <ToggleGroupItem value="quick" aria-label="Quick test">
              <Zap className="h-4 w-4 mr-2" />
              Quick Test
            </ToggleGroupItem>
            <ToggleGroupItem value="full" aria-label="Full test">
              <Database className="h-4 w-4 mr-2" />
              Full Test
            </ToggleGroupItem>
          </ToggleGroup>

          <p className="text-sm text-muted-foreground">
            {testType === 'quick' && 'Quick test: Top 3 public DNS + local DNS (~30 seconds)'}
            {testType === 'full' && 'Full benchmark against all enabled DNS servers (~2-3 minutes)'}
            {testType === 'custom' && 'Custom benchmark with selected servers'}
          </p>
        </div>
      </div>

      {/* Benchmark Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <CardTitle className="text-lg">
                {isRunning ? 'In Progress' : 'Ready'}
              </CardTitle>
            </div>
            <Badge variant={isRunning ? 'default' : 'secondary'} className="text-xs">
              {isRunning ? 'Running' : 'Idle'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          {/* Control Buttons */}
          <div className="flex space-x-4">
            {!isRunning ? (
              <Button onClick={handleStartBenchmark}>
                <Play className="h-4 w-4 mr-2" />
                Start Benchmark
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleStopBenchmark}>
                <Square className="h-4 w-4 mr-2" />
                Cancel Test
              </Button>
            )}
          </div>

          {/* Current Test Status - Compact */}
          {isRunning && currentTest && (
            <div className="p-2 bg-muted/50 rounded-md">
              <div className="flex items-center space-x-2">
                <Timer className="h-3 w-3 animate-spin" />
                <span className="text-xs font-medium">Testing:</span>
                <span className="text-xs text-muted-foreground truncate">
                  {currentTest}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time Results - Always Visible When Running */}
      {isRunning && realTimeResults.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Live Results</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-hidden rounded-md border max-h-[45vh]">
              <div className="overflow-y-auto max-h-[45vh]">
                <Table className="min-w-[520px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Server</TableHead>
                    <TableHead className="w-28">Tests</TableHead>
                    <TableHead className="w-28">Avg Time</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {realTimeResults.map((server) => {
                    const statusIcon = {
                      success: <CheckCircle className="h-4 w-4 text-green-500" />,
                      running: <Timer className="h-4 w-4 text-blue-500 animate-spin" />,
                      pending: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
                      failed: <XCircle className="h-4 w-4 text-red-500" />
                    }[server.status]

                    const statusLabels = {
                      success: 'Completed',
                      running: 'Running',
                      pending: 'Pending',
                      failed: 'Failed'
                    }
                    const statusLabel = statusLabels[server.status]

                    return (
                      <TableRow
                        key={server.ip}
                        className={server.status === 'running' ? 'bg-muted/50' : undefined}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{server.name}</span>
                            <span className="text-xs text-muted-foreground">{server.ip}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {server.tests}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {server.timingMethod === 'performance-observer' ? '🎯' : '⏱️'}
                            <span className="font-mono text-sm">
                              {server.time > 0
                                ? `${server.timingMethod === 'performance-observer'
                                    ? server.time.toFixed(3)
                                    : server.time.toFixed(1)}ms`
                                : '--'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {statusIcon}
                            <span className="text-sm capitalize">{statusLabel}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Log */}
      {isRunning && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Activity Log</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActivityLog([])}>
                Clear Log
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <Table className="min-w-[480px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Server</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-24 text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityLog.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                        No activity yet...
                      </TableCell>
                    </TableRow>
                  ) : (
                    activityLog.map((test, index) => (
                      <TableRow key={`${test.domain}-${test.server}-${index}`}>
                        <TableCell className="font-medium">{test.domain}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{test.server}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {test.status === 'success' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm capitalize">{test.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          <div className="flex items-center justify-end gap-1">
                            {test.status === 'success' && test.timingMethod && (
                              <span className="text-xs">
                                {test.timingMethod === 'high-precision' ? '🎯' : '⏱️'}
                              </span>
                            )}
                            <span>
                              {test.status === 'success'
                                ? test.time !== null
                                  ? `${test.time.toFixed(1)}ms`
                                  : 'Testing...'
                                : 'Timeout'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}