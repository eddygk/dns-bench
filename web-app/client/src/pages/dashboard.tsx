import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Globe,
  Zap,
  Activity,
  History,
  Settings,
  Play,
  Search,
  Clock,
  CheckCircle
} from 'lucide-react'
import type { BenchmarkResult, LocalDNSConfig } from '@dns-bench/shared'
import { apiRequest } from '@/lib/api'

const mockGetRecentResults = async (): Promise<BenchmarkResult[]> => {
  return []
}

export function Dashboard() {
  const navigate = useNavigate()
  const [isStartingTest, setIsStartingTest] = useState(false)
  const [localDNS, setLocalDNS] = useState<LocalDNSConfig>({
    servers: [
      { ip: '', enabled: true }
    ]
  })

  // Load saved DNS configuration on mount
  useEffect(() => {
    const loadLocalDNS = async () => {
      try {
        const response = await apiRequest('/api/settings/local-dns')
        const data = await response.json()
        setLocalDNS(data.config)
      } catch (error) {
        console.warn('Failed to load local DNS config:', error)
      }
    }
    loadLocalDNS()
  }, [])

  const getActiveDNSServers = () => {
    return localDNS.servers
      .map((server, index) => ({
        type: `DNS ${index + 1}`,
        ip: server.ip,
        enabled: server.enabled
      }))
      .filter(server => server.enabled && server.ip)
  }

  const { data: recentResults, isLoading: isLoadingResults } = useQuery({
    queryKey: ['recent-results'],
    queryFn: mockGetRecentResults
  })

  const handleQuickTest = async () => {
    setIsStartingTest(true)
    // Navigate to benchmark page with quick test configuration
    navigate('/benchmark?type=quick')
  }

  const handleFullBenchmark = async () => {
    setIsStartingTest(true)
    navigate('/benchmark?type=full')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DNS Benchmark Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and optimize your DNS performance
        </p>
      </div>

      {/* Local DNS Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <CardTitle className="text-xl">Local DNS Servers</CardTitle>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/settings')}
              size="sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
          </div>
          <CardDescription>
            Configure your LAN DNS servers (typically assigned by DHCP)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getActiveDNSServers().length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {getActiveDNSServers().map((server, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-medium">{server.ip}</span>
                      </div>
                      <Badge variant="secondary">
                        {server.type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Active
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  No local DNS servers configured.
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/settings')}
                >
                  Configure DNS Servers
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <CardTitle>Quick Test</CardTitle>
            </div>
            <CardDescription>
              Test your current DNS against top providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleQuickTest}
              disabled={isStartingTest}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Quick Test
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <CardTitle>Full Benchmark</CardTitle>
            </div>
            <CardDescription>
              Comprehensive test against all providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleFullBenchmark}
              disabled={isStartingTest}
              variant="outline"
              className="w-full"
            >
              <Search className="h-4 w-4 mr-2" />
              Full Benchmark
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/history')}>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <CardTitle>Test History</CardTitle>
            </div>
            <CardDescription>
              View and compare previous benchmark results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-2" />
              {isLoadingResults ? 'Loading...' : `${recentResults?.length || 0} recent tests`}
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/settings')}>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Settings</CardTitle>
            </div>
            <CardDescription>
              Configure DNS servers and application preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Manage DNS servers, CORS settings, and more
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}