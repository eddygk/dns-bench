import { ReactNode, useState, useEffect } from 'react'
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
  Sun,
  ChevronUp
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
  const [isScrolled, setIsScrolled] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 10
      setIsScrolled(scrolled)
      setShowScrollTop(window.scrollY > 400)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-200",
        isScrolled && "shadow-sm"
      )}>
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
      <main className="flex-1 pt-16">
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </main>

      {/* Scroll to top button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className={cn(
            "fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg transition-all duration-300",
            "hover:scale-110 hover:shadow-xl"
          )}
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
      )}
    </div>
  )
}