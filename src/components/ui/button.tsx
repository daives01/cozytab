import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none border-2 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-primary shadow-md hover:shadow-lg active:shadow-sm active:translate-x-[2px] active:translate-y-[2px]",
        destructive:
          "bg-destructive text-destructive-foreground border-destructive shadow-md hover:shadow-lg active:shadow-sm active:translate-x-[2px] active:translate-y-[2px]",
        outline:
          "border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:shadow-md active:shadow-xs active:translate-x-[1px] active:translate-y-[1px]",
        secondary:
          "bg-secondary text-secondary-foreground border-border shadow-sm hover:shadow-md active:shadow-xs active:translate-x-[1px] active:translate-y-[1px]",
        ghost:
          "border-transparent hover:bg-accent hover:text-accent-foreground hover:border-border",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-11 rounded-lg px-6 has-[>svg]:px-4 text-base",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button }
// eslint-disable-next-line react-refresh/only-export-components
export { buttonVariants }
