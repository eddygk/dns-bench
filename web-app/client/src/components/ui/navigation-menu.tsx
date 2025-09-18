import * as React from 'react'
import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    className={cn('relative z-10 flex max-w-max flex-1 items-center justify-center', className)}
    {...props}
  >
    {children}
    <NavigationMenuViewport />
  </NavigationMenuPrimitive.Root>
))
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={cn(
      'group flex flex-1 list-none items-center justify-center space-x-1 rounded-md border border-transparent bg-background p-1 text-sm shadow-lg shadow-black/5 ring-1 ring-black/5 transition-all duration-200 ease-out focus-within:ring-2 focus-within:ring-ring',
      className
    )}
    {...props}
  />
))
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName

const NavigationMenuItem = NavigationMenuPrimitive.Item

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={cn(
      'group inline-flex h-9 items-center justify-center rounded-md bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[active]:bg-accent data-[state=open]:bg-accent/70 data-[state=open]:text-accent-foreground',
      className
    )}
    {...props}
  >
    {children}
    <ChevronDown
      className="relative top-px ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180"
      aria-hidden="true"
    />
  </NavigationMenuPrimitive.Trigger>
))
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={cn(
      'left-0 top-0 w-full md:absolute md:w-auto md:min-w-[10rem] md:rounded-md md:border md:bg-popover md:shadow-lg md:ring-1 md:ring-black/10',
      className
    )}
    {...props}
  />
))
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName

const NavigationMenuLink = NavigationMenuPrimitive.Link

const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <div className="absolute left-0 top-full flex w-full justify-center">
    <NavigationMenuPrimitive.Viewport
      className={cn(
        'origin-top-center relative mt-2 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg transition-all duration-200 md:w-[var(--radix-navigation-menu-viewport-width)]',
        className
      )}
      ref={ref}
      {...props}
    />
  </div>
))
NavigationMenuViewport.displayName = NavigationMenuPrimitive.Viewport.displayName

const NavigationMenuIndicator = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Indicator>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Indicator
    ref={ref}
    className={cn(
      'top-full z-10 flex h-2 items-end justify-center overflow-hidden data-[state=visible]:animate-in data-[state=visible]:fade-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out',
      className
    )}
    {...props}
  >
    <div className="relative top-[70%] h-2 w-2 rotate-45 rounded-tl-sm bg-border" />
  </NavigationMenuPrimitive.Indicator>
))
NavigationMenuIndicator.displayName = NavigationMenuPrimitive.Indicator.displayName

function navigationMenuTriggerStyle(className?: string) {
  return cn(
    'group inline-flex h-9 items-center justify-center rounded-md bg-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    className
  )
}

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  NavigationMenuViewport,
  NavigationMenuIndicator,
  navigationMenuTriggerStyle
}
