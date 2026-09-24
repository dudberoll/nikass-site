"use client"

import { Collapsible as CollapsiblePrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import type { NoStyleOverrides } from '@/components/component-props'

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root> & NoStyleOverrides) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger> & NoStyleOverrides) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  )
}

function CollapsibleContent({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent> & { variant?: "default" | "surface" } & NoStyleOverrides) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      className={cn(variant === "surface" && "rounded-lg border bg-muted/40 p-4 text-sm", className)}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
