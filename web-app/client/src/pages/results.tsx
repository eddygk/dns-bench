import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Download, Clock, CheckCircle, Award, Loader2 } from 'lucide-react'
import { apiRequest } from '@/lib/api'

interface BenchmarkResult {
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

interface TestResults {
  id: string
  startedAt: string
  completedAt: string
  testType: string
  status: string
  options: {
    servers: string[]
    domains: string[]
    totalTests: number
  }
  results: BenchmarkResult[]
}

interface DomainResult {
  id: string
  serverIp: string
  domain: string
  success: boolean
  responseTime?: number
  responseCode?: string
  errorType?: string
  authoritative?: boolean
  queryTime?: number
  ipResult?: string
  errorMessage?: string
  rawOutput?: string
  timestamp: string
}

interface FailureAnalysis {
  id: string
  domain: string
  consistentFailure: boolean
  upstreamShouldResolve?: boolean
  failurePattern: string
  analysisTimestamp: string
}

export function ResultsPage() {
  const { id } = useParams()
  const [results, setResults] = useState<TestResults | null>(null)
  const [domainResults, setDomainResults] = useState<DomainResult[]>([])
  const [failureAnalysis, setFailureAnalysis] = useState<FailureAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchResults = async () => {
      if (!id) {
        setError('No test ID provided')
        setLoading(false)
        return
      }

      try {
        // Fetch basic results
        const response = await apiRequest(`/api/results/${id}/export?format=json`)
        if (!response.ok) {
          throw new Error('Failed to fetch results')
        }
        const data = await response.json()
        setResults(data)

        // Fetch detailed domain results
        try {
          const domainResponse = await apiRequest(`/api/results/${id}/domains`)
          if (domainResponse.ok) {
            const domainData = await domainResponse.json()
            setDomainResults(domainData.domainResults)
          }
        } catch (domainErr) {
          console.warn('Failed to fetch domain results:', domainErr)
        }

        // Fetch failure analysis
        try {
          const failureResponse = await apiRequest(`/api/results/${id}/failures`)
          if (failureResponse.ok) {
            const failureData = await failureResponse.json()
            setFailureAnalysis(failureData.failureAnalysis)
          }
        } catch (failureErr) {
          console.warn('Failed to fetch failure analysis:', failureErr)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load results')
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [id])

  const handleExport = async (format: 'csv' | 'json') => {
    if (!id) return

    try {
      const response = await apiRequest(`/api/results/${id}/export?format=${format}`)
      if (!response.ok) {
        throw new Error('Failed to export results')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dns-benchmark-${id}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !results) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600">Error</h1>
        <p className="text-muted-foreground">{error || 'Results not found'}</p>
      </div>
    )
  }

  const chartData = results.results.map(result => ({
    name: result.serverName,
    avgTime: result.avgResponseTime > 0 ? result.avgResponseTime : 0,
    successRate: result.successRate
  }))

  const winner = results.results.find(r => r.successRate > 0) || results.results[0]
  const totalQueries = results.results.reduce((sum, r) => sum + r.totalQueries, 0)
  const successfulQueries = results.results.reduce((sum, r) => sum + r.successfulQueries, 0)
  const overallSuccessRate = totalQueries > 0 ? (successfulQueries / totalQueries) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Benchmark Results</h1>
          <p className="text-muted-foreground">
            Test completed on {new Date(results.completedAt).toLocaleDateString()} at {new Date(results.completedAt).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('json')}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Winner</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winner.serverName}</div>
            <p className="text-xs text-muted-foreground">
              {winner.avgResponseTime > 0 ? `${winner.avgResponseTime}ms average response time` : 'No successful queries'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((new Date(results.completedAt).getTime() - new Date(results.startedAt).getTime()) / 1000)}s</div>
            <p className="text-xs text-muted-foreground">
              {results.results.length} servers, {results.options.domains.length} domains each
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallSuccessRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {successfulQueries}/{totalQueries} queries successful
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Response Time Comparison</CardTitle>
          <CardDescription>
            Average response times across all tested domains
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => [`${value}ms`, 'Avg Response Time']} />
                <Bar dataKey="avgTime" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Results</CardTitle>
          <CardDescription>
            Complete performance metrics for all tested DNS servers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Rank</th>
                  <th className="text-left p-2">DNS Server</th>
                  <th className="text-left p-2">Success Rate</th>
                  <th className="text-left p-2">Avg Time</th>
                  <th className="text-left p-2">Min Time</th>
                  <th className="text-left p-2">Max Time</th>
                  <th className="text-left p-2">Median</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((server, index) => (
                  <tr key={server.server} className="border-b">
                    <td className="p-2">
                      <Badge variant={index === 0 ? 'default' : 'secondary'}>
                        #{index + 1}
                      </Badge>
                    </td>
                    <td className="p-2 font-medium">{server.serverName}</td>
                    <td className="p-2">
                      <span className={server.successRate >= 95 ? 'text-green-600' : server.successRate > 0 ? 'text-yellow-600' : 'text-red-600'}>
                        {server.successRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2 font-mono">{server.avgResponseTime > 0 ? `${server.avgResponseTime}ms` : '--'}</td>
                    <td className="p-2 font-mono">{server.minResponseTime > 0 ? `${server.minResponseTime}ms` : '--'}</td>
                    <td className="p-2 font-mono">{server.maxResponseTime > 0 ? `${server.maxResponseTime}ms` : '--'}</td>
                    <td className="p-2 font-mono">{server.medianResponseTime > 0 ? `${server.medianResponseTime}ms` : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Per-Domain Breakdown */}
      {domainResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Per-Domain Analysis</CardTitle>
            <CardDescription>
              Detailed breakdown showing how each domain performed across different DNS servers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Create domain groups */}
              {(() => {
                const domainGroups = domainResults.reduce<Record<string, DomainResult[]>>((acc, result) => {
                  if (!acc[result.domain]) {
                    acc[result.domain] = []
                  }
                  acc[result.domain].push(result)
                  return acc
                }, {})

                return Object.entries(domainGroups).map(([domain, results]) => {
                  const sortedResults = results.sort((a, b) => {
                    if (a.success !== b.success) return a.success ? -1 : 1
                    if (a.responseTime && b.responseTime) return a.responseTime - b.responseTime
                    return 0
                  })

                  const successRate = (results.filter(r => r.success).length / results.length) * 100
                  const avgResponseTime = results.filter(r => r.success && r.responseTime)
                    .reduce((sum, r) => sum + (r.responseTime || 0), 0) /
                    results.filter(r => r.success && r.responseTime).length

                  // Find related failure analysis
                  const relatedFailure = failureAnalysis.find(f => f.domain === domain)

                  return (
                    <div key={domain} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-lg">{domain}</h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>Success Rate:
                              <span className={`font-medium ml-1 ${successRate >= 95 ? 'text-green-600' : successRate > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {successRate.toFixed(1)}%
                              </span>
                            </span>
                            {avgResponseTime > 0 && (
                              <span>Avg Response: <span className="font-mono">{avgResponseTime.toFixed(1)}ms</span></span>
                            )}
                          </div>
                        </div>
                        {relatedFailure && (
                          <div className="text-right">
                            <Badge variant={relatedFailure.consistentFailure ? "destructive" : "secondary"}>
                              {relatedFailure.failurePattern.replace(/_/g, ' ')}
                            </Badge>
                            {relatedFailure.upstreamShouldResolve === false && (
                              <p className="text-xs text-muted-foreground mt-1">Blocked upstream</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">DNS Server</th>
                              <th className="text-left p-2">Status</th>
                              <th className="text-left p-2">Response Time</th>
                              <th className="text-left p-2">Response Code</th>
                              <th className="text-left p-2">IP Result</th>
                              <th className="text-left p-2">Error</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedResults.map((result, idx) => (
                              <tr key={`${result.serverIp}-${idx}`} className="border-b">
                                <td className="p-2 font-mono text-xs">{result.serverIp}</td>
                                <td className="p-2">
                                  <Badge variant={result.success ? "default" : "destructive"} className="text-xs">
                                    {result.success ? 'Success' : 'Failed'}
                                  </Badge>
                                </td>
                                <td className="p-2 font-mono text-xs">
                                  {result.responseTime ? `${result.responseTime}ms` : '--'}
                                </td>
                                <td className="p-2 font-mono text-xs">
                                  {result.responseCode || '--'}
                                </td>
                                <td className="p-2 font-mono text-xs">
                                  {result.ipResult || '--'}
                                </td>
                                <td className="p-2 text-xs">
                                  {result.errorMessage || result.errorType || '--'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failure Analysis Summary */}
      {failureAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Failure Analysis</CardTitle>
            <CardDescription>
              Detailed analysis of DNS resolution failures and their potential causes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {failureAnalysis.map((failure, idx) => (
                <div key={failure.id} className={`p-4 rounded-lg border ${
                  failure.consistentFailure ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' :
                  'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{failure.domain}</h4>
                    <Badge variant={failure.consistentFailure ? "destructive" : "secondary"}>
                      {failure.failurePattern.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm">
                    {failure.consistentFailure ? (
                      <div>
                        <p className="text-red-700 dark:text-red-300">
                          🚫 <strong>Consistent Failure:</strong> This domain fails across all DNS servers.
                        </p>
                        {failure.upstreamShouldResolve === false ? (
                          <p className="text-orange-700 dark:text-orange-300 mt-1">
                            💡 <strong>Root Cause:</strong> Domain appears to be blocked or filtered upstream.
                          </p>
                        ) : failure.upstreamShouldResolve === true ? (
                          <p className="text-blue-700 dark:text-blue-300 mt-1">
                            🔍 <strong>Investigation Needed:</strong> Domain resolves upstream but fails locally. Check network configuration.
                          </p>
                        ) : (
                          <p className="text-gray-700 dark:text-gray-300 mt-1">
                            ❓ <strong>Unclear:</strong> Unable to determine if this is a legitimate domain failure.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-yellow-700 dark:text-yellow-300">
                        ⚠️ <strong>Server-Specific Issue:</strong> This domain fails on specific DNS servers only.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>
            Optimize your DNS configuration based on these results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {results.results[0] && results.results[0].successRate > 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <h4 className="font-semibold text-green-800 dark:text-green-200">
                  🏆 Switch to {results.results[0].serverName}
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  {results.results[0].serverName} ({results.results[0].server}) achieved {results.results[0].avgResponseTime}ms average response time.
                  {results.results.length > 1 && results.results[1].avgResponseTime > 0 &&
                    ` This is ${Math.round(((results.results[1].avgResponseTime - results.results[0].avgResponseTime) / results.results[1].avgResponseTime) * 100)}% faster than the second-best server.`
                  }
                </p>
              </div>
            )}

            {(() => {
              const currentDnsServers = results.results.filter(r => r.serverName.includes('Current'))
              const bestCurrentDns = currentDnsServers.find(r => r.successRate > 0)
              if (bestCurrentDns) {
                const currentDnsRank = results.results.findIndex(r => r.server === bestCurrentDns.server) + 1
                return (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                      📊 Your Current DNS Ranking
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Your best current DNS ({bestCurrentDns.server}) ranks #{currentDnsRank} out of {results.results.length} tested servers with {bestCurrentDns.successRate.toFixed(1)}% reliability.
                      {currentDnsRank === 1 ? ' Excellent performance!' : ' There\'s room for improvement.'}
                    </p>
                  </div>
                )
              }
              return null
            })()}

            {results.results.some(r => r.successRate === 0) && (
              <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <h4 className="font-semibold text-red-800 dark:text-red-200">
                  ⚠️ DNS Server Failures Detected
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {results.results.filter(r => r.successRate === 0).map(r => r.serverName).join(', ')} failed to respond to DNS queries.
                  These servers may be unreachable or misconfigured.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}