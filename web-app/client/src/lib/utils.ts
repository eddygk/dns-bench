import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(1)}ms`
  }
  return `${(ms / 1000).toFixed(1)}s`
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

export function getStatusColor(successRate: number): string {
  if (successRate >= 95) return 'text-green-600'
  if (successRate >= 80) return 'text-yellow-600'
  return 'text-red-600'
}

export function validateIPAddress(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
  // Basic IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/

  if (ipv4Pattern.test(ip)) {
    const parts = ip.split('.')
    return parts.every(part => {
      const num = parseInt(part, 10)
      return num >= 0 && num <= 255
    })
  }

  return ipv6Pattern.test(ip)
}