"use client"

import { AspectRatio as AspectRatioPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import type { NoStyleOverrides } from '@/components/component-props'

function AspectRatio({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof AspectRatioPrimitive.Root> & { variant?: "default" | "framed" } & NoStyleOverrides) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" className={cn(variant === "framed" && "overflow-hidden rounded-xl border bg-muted", className)} {...props} />
}

export { AspectRatio }
