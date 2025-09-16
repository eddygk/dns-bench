import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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

export function SettingsPage() {
  const [corsSettings, setCorsSettings] = useState<CORSSettings>({
    allowIPAccess: true,
    allowHostnameAccess: true,
    customOrigins: []
  })
  const [localDNSConfig, setLocalDNSConfig] = useState<LocalDNSConfig>({
    servers: [{ ip: '', enabled: true }]
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDetectingHostname, setIsDetectingHostname] = useState(false)
  const [isSavingDNS, setIsSavingDNS] = useState(false)
  const [newOrigin, setNewOrigin] = useState('')

  // Load settings on component mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      // Load CORS settings
      const response = await apiRequest('/api/settings')
      const data = await response.json()

      // Also get server info for host IP
      const serverInfoResponse = await apiRequest('/api/server-info')
      const serverData = await serverInfoResponse.json()

      if (data.settings?.cors) {
        setCorsSettings({
          ...data.settings.cors,
          detectedHostIP: serverData.detectedHostIP || serverData.hostIP
        })
      }

      // Load local DNS configuration
      const dnsResponse = await apiRequest('/api/settings/local-dns')
      const dnsData = await dnsResponse.json()
      if (dnsData.config) {
        setLocalDNSConfig(dnsData.config)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveCorsSettings = async () => {
    setIsSaving(true)
    try {
      const response = await apiRequest('/api/settings/cors', {
        method: 'PUT',
        body: JSON.stringify(corsSettings),
      })

      if (response.ok) {
        const data = await response.json()
        setCorsSettings(data.settings.cors)
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
        const data = await response.json()
        setLocalDNSConfig(data.config)
      } else {
        throw new Error('Failed to save local DNS settings')
      }
    } catch (error) {
      console.error('Failed to save local DNS settings:', error)
    } finally {
      setIsSavingDNS(false)
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