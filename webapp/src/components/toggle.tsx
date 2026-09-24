import * as React from "react"
import { Toggle as TogglePrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { toggleVariants, type ToggleStyleProps } from "@/lib/toggle-variants"
import type { NoStyleOverrides } from '@/components/component-props'

function Toggle({
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  ToggleStyleProps & NoStyleOverrides) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size }))}
      {...props}
    />
  )
}

export { Toggle }
