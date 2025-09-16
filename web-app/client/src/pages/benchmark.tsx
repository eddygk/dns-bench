import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { apiRequest, getBackendURL } from '@/lib/api'
import { io, Socket } from 'socket.io-client'
import {
  Activity,
  Play,
  Square,
  Timer,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

interface RealTimeResult {
  name: string
  ip: string
  time: number
  status: 'success' | 'running' | 'pending' | 'failed'
  tests: string
}

export function BenchmarkPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const testType = searchParams.get('type') || 'quick'
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTest, setCurrentTest] = useState<string>('')
  const [testId, setTestId] = useState<string | null>(null)
  const [realTimeResults, setRealTimeResults] = useState<RealTimeResult[]>([])
  const [activityLog, setActivityLog] = useState<Array<{domain: string, server: string, time: number | null, status: 'success' | 'timeout'}>>([])
  const [socket, setSocket] = useState<Socket | null>(null)

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
                  tests: `${result.successfulQueries || 0}/${result.totalQueries || 20}`
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
          ...currentServers.slice(0, 3), // Include all local DNS servers
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

  const getServerName = (ip: string, currentServers: string[]): string => {
    if (currentServers.includes(ip)) {
      return `Current-${ip}`
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DNS Benchmark</h1>
        <p className="text-muted-foreground">
          {testType === 'quick' && 'Quick test against top 3 providers + local DNS'}
          {testType === 'full' && 'Full benchmark against all public DNS providers'}
          {testType === 'custom' && 'Custom benchmark with selected servers'}
        </p>
      </div>

      {/* Benchmark Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <CardTitle>
                {isRunning ? 'Benchmark in Progress' : 'Ready to Start'}
              </CardTitle>
            </div>
            <Badge variant={isRunning ? 'default' : 'secondary'}>
              {isRunning ? 'Running' : 'Idle'}
            </Badge>
          </div>
          <CardDescription>
            Testing DNS servers with multiple domains for accurate results
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {/* Current Test Status */}
          {isRunning && currentTest && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Timer className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Current Test</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {currentTest}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time Results */}
      {isRunning && realTimeResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Real-time Results</CardTitle>
            <CardDescription>
              Live performance data as tests complete
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {realTimeResults.map((server) => (
                <div key={server.ip} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {server.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {server.status === 'running' && <Timer className="h-4 w-4 text-blue-500 animate-spin" />}
                      {server.status === 'pending' && <AlertCircle className="h-4 w-4 text-gray-400" />}
                      {server.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                      <span className="font-medium">{server.name}</span>
                      <span className="text-sm text-muted-foreground">({server.ip})</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm">{server.tests}</span>
                    <span className="font-mono text-sm">{server.time > 0 ? `${server.time.toFixed(1)}ms` : '--'}</span>
                  </div>
                </div>
              ))}
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
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {activityLog.map((test, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  {test.status === 'success' ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span>
                    {test.domain} @ {test.server}:
                    {test.status === 'success' ? ` ${test.time?.toFixed(1)}ms` : ' Timeout'}
                  </span>
                </div>
              ))}
              {activityLog.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No activity yet...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}