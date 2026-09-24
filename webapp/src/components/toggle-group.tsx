import * as React from "react"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { toggleVariants, type ToggleStyleProps } from "@/lib/toggle-variants"
import type { NoStyleOverrides } from '@/components/component-props'

const ToggleGroupContext = React.createContext<
  ToggleStyleProps & {
    density?: "separate" | "joined"
    orientation?: "horizontal" | "vertical"
  }
>({
  size: "default",
  variant: "default",
  density: "separate",
  orientation: "horizontal",
})

function ToggleGroup({
  className,
  variant,
  size,
  density = "separate",
  orientation = "horizontal",
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  ToggleStyleProps & {
    density?: "separate" | "joined"
    orientation?: "horizontal" | "vertical"
  } & NoStyleOverrides) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-density={density}
      data-orientation={orientation}
      className={cn(
        "group/toggle-group flex w-fit flex-row items-center gap-2 rounded-md data-[density=joined]:gap-0 data-[density=joined]:data-[variant=outline]:shadow-xs data-vertical:flex-col data-vertical:items-stretch",
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider
        value={{ variant, size, density, orientation }}
      >
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  ToggleStyleProps & NoStyleOverrides) {
  const context = React.useContext(ToggleGroupContext)

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      data-density={context.density}
      className={cn(
        "shrink-0 group-data-[density=joined]/toggle-group:rounded-none group-data-[density=joined]/toggle-group:px-2 group-data-[density=joined]/toggle-group:shadow-none focus:z-10 focus-visible:z-10 group-data-[density=joined]/toggle-group:has-data-[icon=inline-end]:pr-1.5 group-data-[density=joined]/toggle-group:has-data-[icon=inline-start]:pl-1.5 group-data-horizontal/toggle-group:data-[density=joined]:first:rounded-l-md group-data-vertical/toggle-group:data-[density=joined]:first:rounded-t-md group-data-horizontal/toggle-group:data-[density=joined]:last:rounded-r-md group-data-vertical/toggle-group:data-[density=joined]:last:rounded-b-md data-[state=on]:bg-muted group-data-horizontal/toggle-group:data-[density=joined]:data-[variant=outline]:border-l-0 group-data-vertical/toggle-group:data-[density=joined]:data-[variant=outline]:border-t-0 group-data-horizontal/toggle-group:data-[density=joined]:data-[variant=outline]:first:border-l group-data-vertical/toggle-group:data-[density=joined]:data-[variant=outline]:first:border-t",
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
