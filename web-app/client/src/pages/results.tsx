import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Download, Clock, CheckCircle, Award, Loader2, AlertTriangle, ChevronDown, ChevronUp, Eye, Activity, Server, Globe } from 'lucide-react'
import { apiRequest } from '@/lib/api'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

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
  const [expandedFailures, setExpandedFailures] = useState<Set<string>>(new Set())
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set())
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set())
  const [isDomainAnalysisExpanded, setIsDomainAnalysisExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [rawDiagnosticsPage, setRawDiagnosticsPage] = useState(1)
  const [failedDomainsPerPage] = useState(10)

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

  // Enhanced analytics
  const failedDomains = domainResults.filter(r => !r.success)
  const uniqueFailedDomains = [...new Set(failedDomains.map(r => r.domain))]
  const repeatOffenders = getRepeatOffenders(domainResults)
  const serverFailureMap = getServerFailureBreakdown(domainResults)
  const errorTypeBreakdown = getErrorTypeBreakdown(failedDomains)

  // Pagination calculations
  const totalPages = Math.ceil(failedDomains.length / failedDomainsPerPage)
  const startIndex = (rawDiagnosticsPage - 1) * failedDomainsPerPage
  const endIndex = startIndex + failedDomainsPerPage
  const paginatedFailedDomains = failedDomains.slice(startIndex, endIndex)

  function getRepeatOffenders(results: DomainResult[]) {
    const domainFailureCounts = results.reduce<Record<string, { count: number; servers: string[]; errors: string[] }>>((acc, result) => {
      if (!result.success) {
        if (!acc[result.domain]) {
          acc[result.domain] = { count: 0, servers: [], errors: [] }
        }
        acc[result.domain].count++
        if (!acc[result.domain].servers.includes(result.serverIp)) {
          acc[result.domain].servers.push(result.serverIp)
        }
        if (result.errorType && !acc[result.domain].errors.includes(result.errorType)) {
          acc[result.domain].errors.push(result.errorType)
        }
      }
      return acc
    }, {})

    return Object.entries(domainFailureCounts)
      .filter(([_, data]) => data.count >= 2)
      .sort(([_, a], [__, b]) => b.count - a.count)
      .map(([domain, data]) => ({ domain, ...data }))
  }

  function getServerFailureBreakdown(results: DomainResult[]) {
    const serverBreakdown = results.reduce<Record<string, { total: number; failed: number; failedDomains: string[] }>>((acc, result) => {
      if (!acc[result.serverIp]) {
        acc[result.serverIp] = { total: 0, failed: 0, failedDomains: [] }
      }
      acc[result.serverIp].total++
      if (!result.success) {
        acc[result.serverIp].failed++
        if (!acc[result.serverIp].failedDomains.includes(result.domain)) {
          acc[result.serverIp].failedDomains.push(result.domain)
        }
      }
      return acc
    }, {})

    return Object.entries(serverBreakdown)
      .map(([server, data]) => ({
        server,
        ...data,
        failureRate: ((data.failed / data.total) * 100).toFixed(1)
      }))
      .sort((a, b) => b.failed - a.failed)
  }

  function getErrorTypeBreakdown(failedResults: DomainResult[]) {
    const errorCounts = failedResults.reduce<Record<string, number>>((acc, result) => {
      const errorType = result.errorType || result.errorMessage || 'Unknown Error'
      acc[errorType] = (acc[errorType] || 0) + 1
      return acc
    }, {})

    return Object.entries(errorCounts)
      .sort(([_, a], [__, b]) => b - a)
      .map(([error, count]) => ({ error, count }))
  }

  const toggleFailureExpansion = (domain: string) => {
    const newExpanded = new Set(expandedFailures)
    if (newExpanded.has(domain)) {
      newExpanded.delete(domain)
    } else {
      newExpanded.add(domain)
    }
    setExpandedFailures(newExpanded)
  }

  const toggleDomainExpansion = (domain: string) => {
    const newExpanded = new Set(expandedDomains)
    if (newExpanded.has(domain)) {
      newExpanded.delete(domain)
    } else {
      newExpanded.add(domain)
    }
    setExpandedDomains(newExpanded)
  }

  const toggleServerExpansion = (server: string) => {
    const newExpanded = new Set(expandedServers)
    if (newExpanded.has(server)) {
      newExpanded.delete(server)
    } else {
      newExpanded.add(server)
    }
    setExpandedServers(newExpanded)
  }

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

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              {results.results.length} servers × {results.options.domains.length} domains = {results.results.length * results.options.domains.length} total tests
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Domains</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{uniqueFailedDomains.length}</div>
            <p className="text-xs text-muted-foreground">
              {repeatOffenders.length} repeat offenders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="failures" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Failures ({uniqueFailedDomains.length})</span>
          </TabsTrigger>
          <TabsTrigger value="servers" className="flex items-center space-x-2">
            <Server className="h-4 w-4" />
            <span>Server Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Raw Diagnostics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="failures" className="space-y-6">
          {/* Repeat Offenders */}
          {repeatOffenders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span>Repeat Offenders</span>
                  <Badge variant="destructive">{repeatOffenders.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Domains that failed 2+ times across different DNS servers - these need attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {repeatOffenders.map((offender) => (
                    <div key={offender.domain} className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Globe className="h-5 w-5 text-red-600" />
                          <div>
                            <h4 className="font-semibold text-red-900 dark:text-red-100">{offender.domain}</h4>
                            <p className="text-sm text-red-700 dark:text-red-300">
                              Failed {offender.count} times across {offender.servers.length} servers
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-red-600 dark:text-red-400 space-y-1">
                            <div>Servers: {offender.servers.map(s => s.slice(-3)).join(', ')}</div>
                            <div>Errors: {offender.errors.slice(0, 2).join(', ')}{offender.errors.length > 2 ? '...' : ''}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Error Type Analysis</CardTitle>
              <CardDescription>
                Breakdown of DNS resolution errors to identify patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {errorTypeBreakdown.map((item) => (
                  <div key={item.error} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="font-medium">{item.error}</div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{item.count} failures</Badge>
                      <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${(item.count / failedDomains.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Failed Domains List */}
          <Card>
            <CardHeader>
              <CardTitle>All Failed Domains</CardTitle>
              <CardDescription>
                Complete list of domains that failed DNS resolution with details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {uniqueFailedDomains.map((domain) => {
                  const domainFailures = failedDomains.filter(f => f.domain === domain)
                  const isExpanded = expandedFailures.has(domain)
                  return (
                    <Collapsible key={domain}>
                      <CollapsibleTrigger
                        className="flex items-center justify-between w-full p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
                        onClick={() => toggleFailureExpansion(domain)}
                      >
                        <div className="flex items-center space-x-3">
                          <Globe className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{domain}</span>
                          <Badge variant="destructive" className="text-xs">
                            {domainFailures.length} failures
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">
                            {isExpanded ? 'Hide' : 'Show'} details
                          </span>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="ml-7 space-y-2">
                          {domainFailures.map((failure, idx) => (
                            <div key={idx} className="p-2 bg-gray-50 dark:bg-gray-900 rounded border-l-2 border-red-400">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><strong>Server:</strong> {failure.serverIp}</div>
                                <div><strong>Error:</strong> {failure.errorType || 'Unknown'}</div>
                                <div><strong>Response Code:</strong> {failure.responseCode || 'None'}</div>
                                <div><strong>Response Time:</strong> {failure.responseTime ? `${failure.responseTime}ms` : 'N/A'}</div>
                                {failure.ipResult && (
                                  <div className="col-span-2"><strong>IP Result:</strong> {failure.ipResult}</div>
                                )}
                                {failure.errorMessage && (
                                  <div className="col-span-2"><strong>Error Details:</strong> {failure.errorMessage}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servers" className="space-y-6">
          {/* Server Failure Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Server Failure Breakdown</CardTitle>
              <CardDescription>
                Per-server analysis showing which DNS servers are most problematic
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {serverFailureMap.map((server) => (
                  <div key={server.server} className={`p-4 rounded-lg border ${
                    parseFloat(server.failureRate) > 20 ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' :
                    parseFloat(server.failureRate) > 10 ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800' :
                    'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Server className="h-5 w-5" />
                        <div>
                          <h4 className="font-semibold">{server.server}</h4>
                          <p className="text-sm text-muted-foreground">
                            {server.failed}/{server.total} queries failed
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{server.failureRate}%</div>
                        <div className="text-sm text-muted-foreground">
                          {server.failedDomains.length} domains affected
                        </div>
                      </div>
                    </div>
                    {server.failedDomains.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium mb-2">Failed Domains:</p>
                        <div className="flex flex-wrap gap-1">
                          {server.failedDomains.slice(0, 12).map(domain => (
                            <Badge key={domain} variant="secondary" className="text-xs">
                              {domain}
                            </Badge>
                          ))}
                          {server.failedDomains.length > 12 && (
                            <Badge variant="outline" className="text-xs">
                              +{server.failedDomains.length - 12} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Per-Server Domain Analysis */}
          {domainResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Server className="h-5 w-5" />
                  <span>Per-Server Domain Analysis</span>
                  <Badge variant="outline">{results.results.length} servers</Badge>
                </CardTitle>
                <CardDescription>
                  Detailed breakdown showing each domain that each DNS server was tested against with results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Create server groups from domain results */}
                  {(() => {
                    const serverGroups = domainResults.reduce<Record<string, DomainResult[]>>((acc, result) => {
                      if (!acc[result.serverIp]) {
                        acc[result.serverIp] = []
                      }
                      acc[result.serverIp].push(result)
                      return acc
                    }, {})

                    return Object.entries(serverGroups).map(([serverIp, serverDomainResults]) => {
                      const sortedResults = serverDomainResults.sort((a, b) => {
                        if (a.success !== b.success) return a.success ? -1 : 1
                        if (a.responseTime && b.responseTime) return a.responseTime - b.responseTime
                        return 0
                      })

                      const successRate = (serverDomainResults.filter(r => r.success).length / serverDomainResults.length) * 100
                      const avgResponseTime = serverDomainResults.filter(r => r.success && r.responseTime)
                        .reduce((sum, r) => sum + (r.responseTime || 0), 0) /
                        Math.max(1, serverDomainResults.filter(r => r.success && r.responseTime).length)

                      const failedDomains = serverDomainResults.filter(r => !r.success)
                      const isServerExpanded = expandedServers.has(serverIp)

                      // Get server name from main results data
                      const serverInfo = results.results.find(r => r.server === serverIp)
                      const serverName = serverInfo?.serverName || serverIp

                      return (
                        <Collapsible key={serverIp}>
                          <CollapsibleTrigger
                            className="flex items-center justify-between w-full p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
                            onClick={() => toggleServerExpansion(serverIp)}
                          >
                            <div className="flex items-center space-x-3">
                              <Server className="h-4 w-4 text-gray-500" />
                              <div>
                                <h4 className="font-semibold text-lg text-left">{serverName}</h4>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  <span>Success Rate:
                                    <span className={`font-medium ml-1 ${successRate >= 95 ? 'text-green-600' : successRate > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                                      {successRate.toFixed(1)}%
                                    </span>
                                  </span>
                                  {avgResponseTime > 0 && (
                                    <span>Avg Response: <span className="font-mono">{avgResponseTime.toFixed(1)}ms</span></span>
                                  )}
                                  <span>{failedDomains.length} failed</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {failedDomains.length > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {failedDomains.length} failures
                                </Badge>
                              )}
                              <span className="text-sm text-muted-foreground">
                                {isServerExpanded ? 'Hide' : 'Show'} details
                              </span>
                              {isServerExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2">
                            <div className="ml-7 overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left p-2">Domain</th>
                                    <th className="text-left p-2">Status</th>
                                    <th className="text-left p-2">Response Time</th>
                                    <th className="text-left p-2">Response Code</th>
                                    <th className="text-left p-2">IP Result</th>
                                    <th className="text-left p-2">Error</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sortedResults.map((result, idx) => (
                                    <tr key={`${result.domain}-${idx}`} className="border-b">
                                      <td className="p-2 font-medium">{result.domain}</td>
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
                          </CollapsibleContent>
                        </Collapsible>
                      )
                    })
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-6">
          {/* Raw Diagnostics */}
          <Card>
            <CardHeader>
              <CardTitle>Raw DNS Query Diagnostics</CardTitle>
              <CardDescription>
                Detailed technical output for troubleshooting DNS issues
                {failedDomains.length > 0 && (
                  <span className="ml-2 text-sm">
                    (Showing {startIndex + 1}-{Math.min(endIndex, failedDomains.length)} of {failedDomains.length} failed tests)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paginatedFailedDomains.map((result, idx) => (
                  <div key={`${result.domain}-${result.serverIp}-${idx}`} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-mono text-sm font-bold">
                        {result.domain} → {result.serverIp}
                      </div>
                      <Badge variant="destructive">FAILED</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Error Type:</strong> {result.errorType || 'N/A'}<br/>
                        <strong>Response Code:</strong> {result.responseCode || 'N/A'}<br/>
                        <strong>Response Time:</strong> {result.responseTime ? `${result.responseTime}ms` : 'N/A'}<br/>
                        <strong>Query Time:</strong> {result.queryTime ? `${result.queryTime}ms` : 'N/A'}
                      </div>
                      <div>
                        <strong>Authoritative:</strong> {result.authoritative ? 'Yes' : 'No'}<br/>
                        <strong>IP Result:</strong> {result.ipResult || 'None'}<br/>
                        <strong>Timestamp:</strong> {new Date(result.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    {result.errorMessage && (
                      <div className="mt-3 pt-3 border-t">
                        <strong>Error Message:</strong>
                        <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                          {result.errorMessage}
                        </pre>
                      </div>
                    )}
                    {result.rawOutput && (
                      <div className="mt-3 pt-3 border-t">
                        <strong>Raw Output:</strong>
                        <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                          {result.rawOutput}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center pt-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setRawDiagnosticsPage(Math.max(1, rawDiagnosticsPage - 1))}
                            className={rawDiagnosticsPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>

                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (rawDiagnosticsPage <= 3) {
                            pageNum = i + 1;
                          } else if (rawDiagnosticsPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = rawDiagnosticsPage - 2 + i;
                          }

                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setRawDiagnosticsPage(pageNum)}
                                isActive={pageNum === rawDiagnosticsPage}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setRawDiagnosticsPage(Math.min(totalPages, rawDiagnosticsPage + 1))}
                            className={rawDiagnosticsPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}

                {failedDomains.length > 0 && (
                  <div className="text-center pt-4 text-muted-foreground text-sm">
                    <Button variant="link" onClick={() => handleExport('json')}>Export all diagnostic data</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Per-Domain Analysis - Collapsible */}
      {domainResults.length > 0 && activeTab === 'overview' && (
        <Card>
          <CardHeader>
            <Collapsible>
              <CollapsibleTrigger
                className="flex items-center justify-between w-full text-left"
                onClick={() => setIsDomainAnalysisExpanded(!isDomainAnalysisExpanded)}
              >
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Globe className="h-5 w-5" />
                    <span>Per-Domain Analysis</span>
                    <Badge variant="outline">{Object.keys(domainResults.reduce<Record<string, DomainResult[]>>((acc, result) => {
                      if (!acc[result.domain]) acc[result.domain] = []
                      acc[result.domain].push(result)
                      return acc
                    }, {})).length} domains</Badge>
                  </CardTitle>
                  <CardDescription>
                    Detailed breakdown showing how each domain performed across different DNS servers
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    {isDomainAnalysisExpanded ? 'Hide' : 'Show'} details
                  </span>
                  {isDomainAnalysisExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-4">
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
                        const isDomainExpanded = expandedDomains.has(domain)

                        return (
                          <Collapsible key={domain}>
                            <CollapsibleTrigger
                              className="flex items-center justify-between w-full p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
                              onClick={() => toggleDomainExpansion(domain)}
                            >
                              <div className="flex items-center space-x-3">
                                <Globe className="h-4 w-4 text-gray-500" />
                                <div>
                                  <h4 className="font-semibold text-lg text-left">{domain}</h4>
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
                              </div>
                              <div className="flex items-center space-x-2">
                                {relatedFailure && (
                                  <Badge variant={relatedFailure.consistentFailure ? "destructive" : "secondary"} className="text-xs">
                                    {relatedFailure.failurePattern.replace(/_/g, ' ')}
                                  </Badge>
                                )}
                                <span className="text-sm text-muted-foreground">
                                  {isDomainExpanded ? 'Hide' : 'Show'} details
                                </span>
                                {isDomainExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2">
                              <div className="ml-7 overflow-x-auto">
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
                            </CollapsibleContent>
                          </Collapsible>
                        )
                      })
                    })()}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </CardHeader>
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