import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { History, Clock, Award, Trash2, Loader2, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '@/lib/api'

interface HistoryItem {
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
  results: Array<{
    server: string
    serverName: string
    avgResponseTime: number
    successRate: number
  }>
}

export function HistoryPage() {
  const navigate = useNavigate()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isLoadingRef = useRef(false)

  useEffect(() => {
    if (!isLoadingRef.current) {
      fetchHistory()
    }
  }, [])

  const fetchHistory = async () => {
    if (isLoadingRef.current) {
      return
    }

    try {
      isLoadingRef.current = true
      setLoading(true)
      setError(null)
      const response = await apiRequest('/api/results?limit=20&offset=0')
      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      setHistory(data.results || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      isLoadingRef.current = false
      setLoading(false)
    }
  }

  const handleDelete = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test result?')) {
      return
    }

    try {
      const response = await apiRequest(`/api/results/${testId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete test result')
      }

      // Remove from local state
      setHistory(prev => prev.filter(item => item.id !== testId))
    } catch (err) {
      alert('Failed to delete test result: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const handleClearAllHistory = async () => {
    try {
      const response = await apiRequest('/api/results', {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to clear all history')
      }

      // Clear local state
      setHistory([])
    } catch (err) {
      alert('Failed to clear history: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const getTestDuration = (item: HistoryItem) => {
    if (!item.completedAt) return 0
    return Math.round((new Date(item.completedAt).getTime() - new Date(item.startedAt).getTime()) / 1000)
  }

  const getWinner = (item: HistoryItem) => {
    if (!item.results || item.results.length === 0) return 'No data'
    const winner = item.results.find(r => r.successRate > 0)
    return winner ? winner.serverName : 'No successful queries'
  }

  const getBestTime = (item: HistoryItem) => {
    if (!item.results || item.results.length === 0) return 0
    const successful = item.results.filter(r => r.avgResponseTime > 0)
    return successful.length > 0 ? Math.min(...successful.map(r => r.avgResponseTime)) : 0
  }

  const getOverallSuccessRate = (item: HistoryItem) => {
    if (!item.results || item.results.length === 0) return 0
    const totalQueries = item.results.reduce((sum, r) => sum + (r as any).totalQueries || 0, 0)
    const successfulQueries = item.results.reduce((sum, r) => sum + (r as any).successfulQueries || 0, 0)
    return totalQueries > 0 ? (successfulQueries / totalQueries) * 100 : 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600">Error</h1>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchHistory} className="mt-4">Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Benchmark History</h1>
          <p className="text-muted-foreground">
            View and compare your previous DNS benchmark results
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {history.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Clear History
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All History</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all {history.length} benchmark result{history.length !== 1 ? 's' : ''} from your history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAllHistory}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear All History
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={() => navigate('/benchmark')}>
            Run New Test
          </Button>
        </div>
      </div>

      {/* History List */}
      {history.length > 0 ? (
        <div className="space-y-4">
          {history.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/results/${item.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(item.completedAt || item.startedAt).toLocaleString()}
                        </span>
                      </div>
                      <Badge variant="outline">
                        {item.testType === 'benchmark' ? 'Quick' : item.testType.charAt(0).toUpperCase() + item.testType.slice(1)} Test
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Duration: {getTestDuration(item)}s
                      </span>
                      <Badge variant={item.status === 'completed' ? 'default' : item.status === 'failed' ? 'destructive' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Award className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">Winner: {getWinner(item)}</span>
                      </div>
                      {getBestTime(item) > 0 && (
                        <span className="text-sm text-muted-foreground">
                          Best: {getBestTime(item).toFixed(1)}ms
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">
                        Success: {getOverallSuccessRate(item).toFixed(1)}%
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {item.results?.length || 0} servers tested
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/results/${item.id}`)
                      }}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(item.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No benchmark history</h3>
            <p className="text-muted-foreground mb-4">
              Run your first DNS benchmark to see results here
            </p>
            <Button onClick={() => navigate('/benchmark')}>
              Start Benchmarking
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {history.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{history.length}</div>
              <p className="text-xs text-muted-foreground">
                Benchmark sessions completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Time</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const allBestTimes = history.map(h => getBestTime(h)).filter(t => t > 0)
                  return allBestTimes.length > 0 ? Math.min(...allBestTimes).toFixed(1) + 'ms' : '--'
                })()}
              </div>
              <p className="text-xs text-muted-foreground">
                Fastest recorded response time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Success Rate</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const allSuccessRates = history.map(h => getOverallSuccessRate(h))
                  return allSuccessRates.length > 0 ? Math.max(...allSuccessRates).toFixed(1) + '%' : '--'
                })()}
              </div>
              <p className="text-xs text-muted-foreground">
                Highest success rate achieved
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}