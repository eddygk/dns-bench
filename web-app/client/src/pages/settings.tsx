import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { apiRequest } from '@/lib/api'
import { Settings, Bell, Palette, Database, Globe, RefreshCw, Plus, X, Trash2, Server } from 'lucide-react'

interface CORSSettings {
  allowIPAccess: boolean
  allowHostnameAccess: boolean
  detectedHostname?: string
  detectedHostIP?: string
  customOrigins: string[]
}

interface LocalDNSServer {
  ip: string
  enabled: boolean
}

interface LocalDNSConfig {
  servers: LocalDNSServer[]
}

interface PublicDNSServer {
  id: string
  name: string
  ip: string
  provider: string
  enabled: boolean
  isPrimary?: boolean
}

interface PublicDNSConfig {
  servers: PublicDNSServer[]
}

interface TestConfiguration {
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

export function SettingsPage() {
  const queryClient = useQueryClient()
  const [corsSettings, setCorsSettings] = useState<CORSSettings>({
    allowIPAccess: true,
    allowHostnameAccess: true,
    customOrigins: []
  })
  const [localDNSConfig, setLocalDNSConfig] = useState<LocalDNSConfig>({
    servers: [{ ip: '', enabled: true }]
  })
  const [publicDNSConfig, setPublicDNSConfig] = useState<PublicDNSConfig>({
    servers: []
  })
  const [testConfig, setTestConfig] = useState<TestConfiguration>({
    domainCounts: { quick: 10, full: 20, custom: 30 },
    queryTypes: { cached: true, uncached: true, dotcom: false },
    performance: { maxConcurrentServers: 3, queryTimeout: 2000, maxRetries: 1, rateLimitMs: 100 },
    analysis: { detectRedirection: true, detectMalwareBlocking: false, testDNSSEC: false, minReliabilityThreshold: 95 }
  })
  // isLoading now comes from React Query below
  const [isSaving, setIsSaving] = useState(false)
  const [isDetectingHostname, setIsDetectingHostname] = useState(false)
  const [isSavingDNS, setIsSavingDNS] = useState(false)
  const [isSavingPublicDNS, setIsSavingPublicDNS] = useState(false)
  const [isSavingTestConfig, setIsSavingTestConfig] = useState(false)
  const [newOrigin, setNewOrigin] = useState('')

  // Load settings using React Query for automatic refetching
  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await apiRequest('/api/settings')
      return response.json()
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: true
  })

  const { data: serverInfo } = useQuery({
    queryKey: ['server-info'],
    queryFn: async () => {
      const response = await apiRequest('/api/server-info')
      return response.json()
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: true
  })

  const { data: localDNSData } = useQuery({
    queryKey: ['settings-local-dns-config'],
    queryFn: async () => {
      const response = await apiRequest('/api/settings/local-dns')
      const data = await response.json()
      return data.config
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: true
  })

  const { data: publicDNSData } = useQuery({
    queryKey: ['public-dns-config'],
    queryFn: async () => {
      const response = await apiRequest('/api/settings/public-dns')
      const data = await response.json()
      return data.config
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: true
  })

  const { data: testConfigData } = useQuery({
    queryKey: ['test-config'],
    queryFn: async () => {
      const response = await apiRequest('/api/settings/test-config')
      const data = await response.json()
      return data.config
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: true
  })

  // Update state when query data changes (React Query v5 compatible)
  useEffect(() => {
    if (settingsData?.settings?.cors) {
      setCorsSettings(prev => ({
        ...prev,
        ...settingsData.settings.cors
      }))
    }
  }, [settingsData])

  useEffect(() => {
    if (serverInfo) {
      setCorsSettings(prev => ({
        ...prev,
        detectedHostIP: serverInfo.detectedHostIP || serverInfo.hostIP
      }))
    }
  }, [serverInfo])

  useEffect(() => {
    if (localDNSData) {
      setLocalDNSConfig(localDNSData)
    }
  }, [localDNSData])

  useEffect(() => {
    if (publicDNSData) {
      setPublicDNSConfig(publicDNSData)
    }
  }, [publicDNSData])

  useEffect(() => {
    if (testConfigData) {
      setTestConfig(testConfigData)
    }
  }, [testConfigData])

  const saveCorsSettings = async () => {
    setIsSaving(true)
    try {
      const response = await apiRequest('/api/settings/cors', {
        method: 'PUT',
        body: JSON.stringify(corsSettings),
      })

      if (response.ok) {
        // Invalidate and refetch the query instead of manually updating state
        queryClient.invalidateQueries({ queryKey: ['settings'] })
        // Show success message
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save CORS settings:', error)
      // Show error message
    } finally {
      setIsSaving(false)
    }
  }

  const detectHostname = async () => {
    setIsDetectingHostname(true)
    try {
      // Use the server-info endpoint to get both hostname and host IP
      const response = await apiRequest('/api/server-info')
      const data = await response.json()

      setCorsSettings(prev => ({
        ...prev,
        detectedHostname: data.detectedHostname || data.hostname,
        detectedHostIP: data.detectedHostIP || data.hostIP
      }))
    } catch (error) {
      console.error('Failed to detect hostname and host IP:', error)
    } finally {
      setIsDetectingHostname(false)
    }
  }

  const addCustomOrigin = () => {
    if (newOrigin.trim() && !corsSettings.customOrigins.includes(newOrigin.trim())) {
      setCorsSettings(prev => ({
        ...prev,
        customOrigins: [...prev.customOrigins, newOrigin.trim()]
      }))
      setNewOrigin('')
    }
  }

  const removeCustomOrigin = (origin: string) => {
    setCorsSettings(prev => ({
      ...prev,
      customOrigins: prev.customOrigins.filter(o => o !== origin)
    }))
  }

  const saveLocalDNSConfig = async () => {
    setIsSavingDNS(true)
    try {
      const response = await apiRequest('/api/settings/local-dns', {
        method: 'PUT',
        body: JSON.stringify(localDNSConfig),
      })

      if (response.ok) {
        // Invalidate and refetch the query instead of manually updating state
        queryClient.invalidateQueries({ queryKey: ['settings-local-dns-config'] })
      } else {
        throw new Error('Failed to save local DNS settings')
      }
    } catch (error) {
      console.error('Failed to save local DNS settings:', error)
    } finally {
      setIsSavingDNS(false)
    }
  }

  const savePublicDNSConfig = async () => {
    setIsSavingPublicDNS(true)
    try {
      const response = await apiRequest('/api/settings/public-dns', {
        method: 'PUT',
        body: JSON.stringify(publicDNSConfig),
      })

      if (response.ok) {
        // Invalidate and refetch the query instead of manually updating state
        queryClient.invalidateQueries({ queryKey: ['public-dns-config'] })
      } else {
        throw new Error('Failed to save public DNS settings')
      }
    } catch (error) {
      console.error('Failed to save public DNS settings:', error)
    } finally {
      setIsSavingPublicDNS(false)
    }
  }

  const saveTestConfig = async () => {
    setIsSavingTestConfig(true)
    try {
      const response = await apiRequest('/api/settings/test-config', {
        method: 'PUT',
        body: JSON.stringify(testConfig),
      })

      if (response.ok) {
        // Invalidate and refetch the query instead of manually updating state
        queryClient.invalidateQueries({ queryKey: ['test-config'] })
      } else {
        throw new Error('Failed to save test configuration')
      }
    } catch (error) {
      console.error('Failed to save test configuration:', error)
    } finally {
      setIsSavingTestConfig(false)
    }
  }

  const addDNSServer = () => {
    if (localDNSConfig.servers.length < 10) {
      setLocalDNSConfig(prev => ({
        servers: [...prev.servers, { ip: '', enabled: true }]
      }))
    }
  }

  const removeDNSServer = (index: number) => {
    if (localDNSConfig.servers.length > 1) {
      setLocalDNSConfig(prev => ({
        servers: prev.servers.filter((_, i) => i !== index)
      }))
    }
  }

  const updateDNSServer = (index: number, field: 'ip' | 'enabled', value: string | boolean) => {
    setLocalDNSConfig(prev => ({
      servers: prev.servers.map((server, i) =>
        i === index ? { ...server, [field]: value } : server
      )
    }))
  }

  const addPublicDNSServer = () => {
    if (publicDNSConfig.servers.length < 20) {
      const newId = `custom-${Date.now()}`
      setPublicDNSConfig(prev => ({
        servers: [...prev.servers, {
          id: newId,
          name: '',
          ip: '',
          provider: 'Custom',
          enabled: true,
          isPrimary: true
        }]
      }))
    }
  }

  const removePublicDNSServer = (id: string) => {
    setPublicDNSConfig(prev => ({
      servers: prev.servers.filter(server => server.id !== id)
    }))
  }

  const updatePublicDNSServer = (id: string, field: keyof PublicDNSServer, value: string | boolean) => {
    setPublicDNSConfig(prev => ({
      servers: prev.servers.map(server =>
        server.id === id ? { ...server, [field]: value } : server
      )
    }))
  }

  const togglePublicDNSServer = (id: string) => {
    setPublicDNSConfig(prev => ({
      servers: prev.servers.map(server =>
        server.id === id ? { ...server, enabled: !server.enabled } : server
      )
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your DNS benchmarking preferences
        </p>
      </div>

      {/* CORS Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <CardTitle>Network Access (CORS)</CardTitle>
          </div>
          <CardDescription>
            Control which origins can access the DNS Bench web interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-ip">Allow IP address access</Label>
              <p className="text-sm text-muted-foreground">
                Enable access from any IP address (e.g., 192.168.1.100)
              </p>
            </div>
            <Switch
              id="allow-ip"
              checked={corsSettings.allowIPAccess}
              onCheckedChange={(checked) => setCorsSettings(prev => ({ ...prev, allowIPAccess: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-hostname">Allow hostname access</Label>
              <p className="text-sm text-muted-foreground">
                Enable access from any hostname (e.g., myserver.local)
              </p>
            </div>
            <Switch
              id="allow-hostname"
              checked={corsSettings.allowHostnameAccess}
              onCheckedChange={(checked) => setCorsSettings(prev => ({ ...prev, allowHostnameAccess: checked }))}
            />
          </div>

          <div className="space-y-4">
            {true && (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">Current Access Configuration</Label>

                    {/* Localhost access - always enabled */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-700 dark:text-blue-300">Localhost Access</p>
                        <p className="text-sm font-mono text-blue-800 dark:text-blue-200">http://localhost:3000</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Always enabled for development and local access
                        </p>
                      </div>
                      <Badge variant="default">Always Enabled</Badge>
                    </div>

                    {/* IP address access */}
                    {corsSettings.detectedHostIP && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-blue-700 dark:text-blue-300">LAN IP Access</p>
                          <p className="text-sm font-mono text-blue-800 dark:text-blue-200">http://{corsSettings.detectedHostIP}:3000</p>
                        </div>
                        <Badge variant={corsSettings.allowIPAccess ? "default" : "secondary"}>
                          {corsSettings.allowIPAccess ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    )}

                    {/* Hostname access */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-700 dark:text-blue-300">Hostname Access</p>
                        <p className="text-sm font-mono text-blue-800 dark:text-blue-200">http://[hostname]:3000</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Allows access from any hostname on your network
                        </p>
                      </div>
                      <Badge variant={corsSettings.allowHostnameAccess ? "default" : "secondary"}>
                        {corsSettings.allowHostnameAccess ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>

                    {/* Custom origins */}
                    {corsSettings.customOrigins.length > 0 && (
                      <div>
                        <p className="text-xs text-blue-700 dark:text-blue-300">Custom Origins</p>
                        <div className="space-y-1">
                          {corsSettings.customOrigins.map((origin, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <p className="text-sm font-mono text-blue-800 dark:text-blue-200">{origin}</p>
                              <Badge variant="default">Enabled</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-blue-600 dark:text-blue-400 pt-2 border-t border-blue-200 dark:border-blue-800">
                      <p><strong>Note:</strong> IP address configured via Docker environment (HOST_IP={corsSettings.detectedHostIP})</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> The host IP is configured via Docker environment variables following containerization best practices.
                Complex auto-detection has been simplified for security and reliability.
              </p>
            </div>
          </div>


          <div className="space-y-4">
            <div>
              <Label>Custom origins</Label>
              <p className="text-sm text-muted-foreground">
                Add specific origins that should be allowed (e.g., http://myserver.local:3000, https://dns-bench.mycompany.com:3000)
              </p>
            </div>

            <div className="flex space-x-2">
              <Input
                placeholder="http://myserver.local:3000"
                value={newOrigin}
                onChange={(e) => setNewOrigin(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomOrigin()}
              />
              <Button onClick={addCustomOrigin} size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {corsSettings.customOrigins.length > 0 && (
              <div className="space-y-2">
                {corsSettings.customOrigins.map((origin, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{origin}</span>
                    <Button
                      onClick={() => removeCustomOrigin(origin)}
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={saveCorsSettings} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save CORS Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Local DNS Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <CardTitle>Local DNS Servers</CardTitle>
          </div>
          <CardDescription>
            Configure DNS servers for benchmarking (minimum 1, maximum 10)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {localDNSConfig.servers.map((server, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={server.enabled}
                    onCheckedChange={(checked) => updateDNSServer(index, 'enabled', checked)}
                  />
                  <Label className="text-sm font-medium">
                    DNS {index + 1}
                  </Label>
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="e.g., 10.10.20.30"
                    value={server.ip}
                    onChange={(e) => updateDNSServer(index, 'ip', e.target.value)}
                    disabled={!server.enabled}
                    className={server.enabled && server.ip && !/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(server.ip) ? 'border-red-300' : ''}
                  />
                  {server.enabled && server.ip && !/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(server.ip) && (
                    <p className="text-xs text-red-600 mt-1">Please enter a valid IP address</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDNSServer(index)}
                  disabled={localDNSConfig.servers.length <= 1}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={addDNSServer}
              disabled={localDNSConfig.servers.length >= 10}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add DNS Server</span>
            </Button>
            <Badge variant="secondary">
              {localDNSConfig.servers.length}/10 servers
            </Badge>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> These DNS servers will be included in your benchmarks as "Current" DNS servers.
              Only enabled servers with valid IP addresses will be tested.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveLocalDNSConfig} disabled={isSavingDNS}>
              {isSavingDNS ? 'Saving...' : 'Save DNS Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Public DNS Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <CardTitle>Public DNS Servers</CardTitle>
          </div>
          <CardDescription>
            Configure public DNS servers used for benchmarking (maximum 20)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {publicDNSConfig.servers.map((server) => (
              <div key={server.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={server.enabled}
                    onCheckedChange={() => togglePublicDNSServer(server.id)}
                  />
                </div>
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <Input
                    placeholder="Provider (e.g., Cloudflare)"
                    value={server.provider}
                    onChange={(e) => updatePublicDNSServer(server.id, 'provider', e.target.value)}
                    disabled={!server.enabled}
                  />
                  <Input
                    placeholder="Server name"
                    value={server.name}
                    onChange={(e) => updatePublicDNSServer(server.id, 'name', e.target.value)}
                    disabled={!server.enabled}
                  />
                  <Input
                    placeholder="e.g., 1.1.1.1"
                    value={server.ip}
                    onChange={(e) => updatePublicDNSServer(server.id, 'ip', e.target.value)}
                    disabled={!server.enabled}
                    className={server.enabled && server.ip && !/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(server.ip) ? 'border-red-300' : ''}
                  />
                </div>
                {server.id.startsWith('custom-') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePublicDNSServer(server.id)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={addPublicDNSServer}
              disabled={publicDNSConfig.servers.length >= 20}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Custom DNS Server</span>
            </Button>
            <Badge variant="secondary">
              {publicDNSConfig.servers.filter(s => s.enabled).length}/{publicDNSConfig.servers.length} enabled
            </Badge>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Only enabled public DNS servers will be included in benchmark tests.
              All server details (provider, name, IP) are fully customizable. Custom servers can be deleted.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={savePublicDNSConfig} disabled={isSavingPublicDNS}>
              {isSavingPublicDNS ? 'Saving...' : 'Save Public DNS Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Test Configuration</CardTitle>
          </div>
          <CardDescription>
            Customize DNS benchmark test parameters for different scenarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Domain Count Configuration */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Domain Count per Test Type</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quick-domains">Quick Test</Label>
                <Input
                  id="quick-domains"
                  type="number"
                  min="5"
                  max="50"
                  value={testConfig.domainCounts.quick}
                  onChange={(e) => setTestConfig(prev => ({
                    ...prev,
                    domainCounts: { ...prev.domainCounts, quick: parseInt(e.target.value) || 5 }
                  }))}
                />
                <p className="text-xs text-muted-foreground">5-50 domains</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="full-domains">Full Test</Label>
                <Input
                  id="full-domains"
                  type="number"
                  min="10"
                  max="200"
                  value={testConfig.domainCounts.full}
                  onChange={(e) => setTestConfig(prev => ({
                    ...prev,
                    domainCounts: { ...prev.domainCounts, full: parseInt(e.target.value) || 10 }
                  }))}
                />
                <p className="text-xs text-muted-foreground">10-200 domains</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-domains">Custom Test</Label>
                <Input
                  id="custom-domains"
                  type="number"
                  min="1"
                  max="500"
                  value={testConfig.domainCounts.custom}
                  onChange={(e) => setTestConfig(prev => ({
                    ...prev,
                    domainCounts: { ...prev.domainCounts, custom: parseInt(e.target.value) || 1 }
                  }))}
                />
                <p className="text-xs text-muted-foreground">1-500 domains</p>
              </div>
            </div>
          </div>

          {/* Query Types */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Query Types</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cached-queries"
                  checked={testConfig.queryTypes.cached}
                  onCheckedChange={(checked) => setTestConfig(prev => ({
                    ...prev,
                    queryTypes: { ...prev.queryTypes, cached: !!checked }
                  }))}
                />
                <Label htmlFor="cached-queries">Cached Queries</Label>
                <p className="text-sm text-muted-foreground">Measure cache performance</p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="uncached-queries"
                  checked={testConfig.queryTypes.uncached}
                  onCheckedChange={(checked) => setTestConfig(prev => ({
                    ...prev,
                    queryTypes: { ...prev.queryTypes, uncached: !!checked }
                  }))}
                />
                <Label htmlFor="uncached-queries">Uncached Queries</Label>
                <p className="text-sm text-muted-foreground">Measure resolution speed</p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dotcom-queries"
                  checked={testConfig.queryTypes.dotcom}
                  onCheckedChange={(checked) => setTestConfig(prev => ({
                    ...prev,
                    queryTypes: { ...prev.queryTypes, dotcom: !!checked }
                  }))}
                />
                <Label htmlFor="dotcom-queries">DotCom Queries</Label>
                <p className="text-sm text-muted-foreground">Measure TLD performance</p>
              </div>
            </div>
          </div>

          {/* Performance Settings */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Performance Settings</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="concurrent-servers">Concurrent Servers: {testConfig.performance.maxConcurrentServers}</Label>
                <Slider
                  id="concurrent-servers"
                  min={1}
                  max={10}
                  step={1}
                  value={[testConfig.performance.maxConcurrentServers]}
                  onValueChange={(value) => setTestConfig(prev => ({
                    ...prev,
                    performance: { ...prev.performance, maxConcurrentServers: value[0] }
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="query-timeout">Query Timeout</Label>
                <Input
                  id="query-timeout"
                  type="number"
                  min="1000"
                  max="10000"
                  value={testConfig.performance.queryTimeout}
                  onChange={(e) => setTestConfig(prev => ({
                    ...prev,
                    performance: { ...prev.performance, queryTimeout: parseInt(e.target.value) || 1000 }
                  }))}
                />
                <p className="text-xs text-muted-foreground">1000-10000ms</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-retries">Max Retries: {testConfig.performance.maxRetries}</Label>
                <Slider
                  id="max-retries"
                  min={0}
                  max={5}
                  step={1}
                  value={[testConfig.performance.maxRetries]}
                  onValueChange={(value) => setTestConfig(prev => ({
                    ...prev,
                    performance: { ...prev.performance, maxRetries: value[0] }
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate-limit">Rate Limit</Label>
                <Input
                  id="rate-limit"
                  type="number"
                  min="0"
                  max="1000"
                  value={testConfig.performance.rateLimitMs}
                  onChange={(e) => setTestConfig(prev => ({
                    ...prev,
                    performance: { ...prev.performance, rateLimitMs: parseInt(e.target.value) || 0 }
                  }))}
                />
                <p className="text-xs text-muted-foreground">0-1000ms between queries</p>
              </div>
            </div>
          </div>

          {/* Analysis Features */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Analysis Features</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="detect-redirection">Detect NXDOMAIN Redirection</Label>
                  <p className="text-sm text-muted-foreground">Test for DNS hijacking</p>
                </div>
                <Switch
                  id="detect-redirection"
                  checked={testConfig.analysis.detectRedirection}
                  onCheckedChange={(checked) => setTestConfig(prev => ({
                    ...prev,
                    analysis: { ...prev.analysis, detectRedirection: checked }
                  }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="detect-malware">Detect Malware Blocking</Label>
                  <p className="text-sm text-muted-foreground">Test security filtering</p>
                </div>
                <Switch
                  id="detect-malware"
                  checked={testConfig.analysis.detectMalwareBlocking}
                  onCheckedChange={(checked) => setTestConfig(prev => ({
                    ...prev,
                    analysis: { ...prev.analysis, detectMalwareBlocking: checked }
                  }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="test-dnssec">Test DNSSEC Support</Label>
                  <p className="text-sm text-muted-foreground">Verify DNSSEC validation (coming soon)</p>
                </div>
                <Switch
                  id="test-dnssec"
                  checked={testConfig.analysis.testDNSSEC}
                  onCheckedChange={(checked) => setTestConfig(prev => ({
                    ...prev,
                    analysis: { ...prev.analysis, testDNSSEC: checked }
                  }))}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reliability-threshold">Min Reliability Threshold: {testConfig.analysis.minReliabilityThreshold}%</Label>
                <Slider
                  id="reliability-threshold"
                  min={50}
                  max={100}
                  step={5}
                  value={[testConfig.analysis.minReliabilityThreshold]}
                  onValueChange={(value) => setTestConfig(prev => ({
                    ...prev,
                    analysis: { ...prev.analysis, minReliabilityThreshold: value[0] }
                  }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveTestConfig} disabled={isSavingTestConfig}>
              {isSavingTestConfig ? 'Saving...' : 'Save Test Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <CardTitle>General</CardTitle>
          </div>
          <CardDescription>
            Basic application settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-detect">Auto-detect DNS servers</Label>
              <p className="text-sm text-muted-foreground">
                Automatically detect system DNS configuration on startup
              </p>
            </div>
            <Switch id="auto-detect" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="real-time">Real-time updates</Label>
              <p className="text-sm text-muted-foreground">
                Show live progress during benchmark tests
              </p>
            </div>
            <Switch id="real-time" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="save-history">Save test history</Label>
              <p className="text-sm text-muted-foreground">
                Keep a record of benchmark results for comparison
              </p>
            </div>
            <Switch id="save-history" defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>
            Customize the look and feel of the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">Light</Button>
              <Button variant="outline" size="sm">Dark</Button>
              <Button variant="outline" size="sm">System</Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="animations">Enable animations</Label>
              <p className="text-sm text-muted-foreground">
                Use smooth transitions and loading animations
              </p>
            </div>
            <Switch id="animations" defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>
            Control when and how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="test-complete">Test completion</Label>
              <p className="text-sm text-muted-foreground">
                Notify when benchmark tests finish
              </p>
            </div>
            <Switch id="test-complete" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="errors">Error notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show alerts when tests fail or encounter errors
              </p>
            </div>
            <Switch id="errors" defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <CardTitle>Data & Privacy</CardTitle>
          </div>
          <CardDescription>
            Manage your data and privacy preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Data Export</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Export your benchmark history and settings
              </p>
              <Button variant="outline">Export Data</Button>
            </div>

            <div>
              <Label>Clear History</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Remove all stored benchmark results from this device
              </p>
              <Button variant="destructive">Clear All Data</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button>Save Settings</Button>
      </div>
    </div>
  )
}