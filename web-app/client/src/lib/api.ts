// API utility functions for dynamic backend URL detection

/**
 * Get the backend base URL dynamically based on current location
 */
export function getBackendURL(): string {
  // In development, if we're on localhost, use localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001'
  }

  // Otherwise, use the same host as frontend but different port
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  return `${protocol}//${hostname}:3001`
}

/**
 * Get the WebSocket URL dynamically
 */
export function getWebSocketURL(): string {
  const backendURL = getBackendURL()
  return backendURL.replace(/^http/, 'ws')
}

/**
 * Make an API request with automatic URL resolution
 */
export async function apiRequest(endpoint: string, options?: RequestInit): Promise<Response> {
  const baseURL = getBackendURL()
  const url = `${baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`

  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })
}

/**
 * Get server information from backend
 */
export async function getServerInfo(): Promise<{
  hostname?: string
  detectedHostname?: string
  port: number
  timestamp: string
}> {
  const response = await apiRequest('/api/server-info')
  if (!response.ok) {
    throw new Error('Failed to get server info')
  }
  return response.json()
}