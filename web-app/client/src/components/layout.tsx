import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Wifi,
  Home,
  Activity,
  History,
  Settings,
  Moon,
  Sun
} from 'lucide-react'
import { useTheme } from '@/components/theme-provider'

interface LayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Benchmark', href: '/benchmark', icon: Activity },
  { name: 'History', href: '/history', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center space-x-2">
            <Wifi className="h-6 w-6" />
            <h1 className="text-xl font-semibold">DNS Bench</h1>
          </div>

          <nav className="mx-6 flex items-center space-x-4 lg:space-x-6">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}