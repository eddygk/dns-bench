import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg+div]:translate-y-[-1px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-6',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        success: 'border-green-500/60 text-green-700 dark:border-green-800 dark:text-green-300 [&>svg]:text-green-600',
        info: 'border-blue-500/60 text-blue-700 dark:border-blue-800 dark:text-blue-300 [&>svg]:text-blue-600',
        warning: 'border-yellow-500/60 text-yellow-700 dark:border-yellow-800 dark:text-yellow-300 [&>svg]:text-yellow-600'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />
  )
)
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
  )
)
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription }
