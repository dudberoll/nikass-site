import * as React from "react"

import { cn } from "@/lib/utils"
import type { NoStyleOverrides } from '@/components/component-props'

type InputProps = Omit<React.ComponentProps<"input">, "className" | "style"> & {
  variant?: "default" | "surface" | "password" | "group" | "sidebar"
}

const inputVariants = {
  default: "",
  surface: "bg-background",
  password: "bg-background pr-10",
  group:
    "flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent",
  sidebar: "h-8 w-full bg-background shadow-none",
} as const

function Input({ type, variant = "default", ...props }: InputProps & NoStyleOverrides) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        inputVariants[variant]
      )}
      {...props}
    />
  )
}

export { Input }
