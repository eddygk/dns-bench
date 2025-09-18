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
  ChevronUp,
  Menu
} from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuIndicator,
  navigationMenuTriggerStyle
} from '@/components/ui/navigation-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from '@/components/ui/sheet'

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
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-200',
          isScrolled && 'shadow-sm'
        )}
      >
        <div className="flex h-16 items-center px-4">
          <Link to="/" className="flex items-center space-x-2">
            <Wifi className="h-6 w-6" />
            <h1 className="text-xl font-semibold">DNS Bench</h1>
          </Link>

          <NavigationMenu className="ml-6 hidden lg:flex">
            <NavigationMenuList>
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href

                return (
                  <NavigationMenuItem key={item.name}>
                    <NavigationMenuLink asChild>
                      <Link
                        to={item.href}
                        className={cn(
                          navigationMenuTriggerStyle('gap-2'),
                          'text-muted-foreground',
                          isActive && 'bg-primary/10 text-primary shadow-sm'
                        )}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )
              })}
            </NavigationMenuList>
            <NavigationMenuIndicator />
          </NavigationMenu>

          <div className="ml-auto flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              aria-label="Toggle theme"
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[320px]">
                <SheetHeader className="items-start">
                  <SheetTitle className="flex items-center space-x-2">
                    <Wifi className="h-5 w-5" />
                    <span className="text-base font-semibold">DNS Bench</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-6 grid gap-2">
                  {navigation.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.href

                    return (
                      <SheetClose asChild key={item.name}>
                        <Button
                          variant={isActive ? 'secondary' : 'ghost'}
                          className={cn('justify-start gap-3 text-base', isActive && 'bg-primary/10 text-primary shadow-sm')}
                          asChild
                        >
                          <Link to={item.href} aria-current={isActive ? 'page' : undefined}>
                            <Icon className="h-4 w-4" />
                            <span>{item.name}</span>
                          </Link>
                        </Button>
                      </SheetClose>
                    )
                  })}
                </nav>
              </SheetContent>
            </Sheet>
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
            'fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg transition-all duration-300',
            'hover:scale-110 hover:shadow-xl'
          )}
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
      )}
    </div>
  )
}
