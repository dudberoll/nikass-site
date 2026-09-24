import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import type { NoStyleOverrides } from '@/components/component-props'

type AvatarRootProps = Omit<
  React.ComponentProps<typeof AvatarPrimitive.Root>,
  "className" | "style"
> & {
  size?: "default" | "sm" | "lg" | "xl"
  shape?: "circle" | "rounded"
}

function Avatar({ size = "default", shape = "circle", ...props }: AvatarRootProps & NoStyleOverrides) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      data-shape={shape}
      className={cn("group/avatar relative flex size-8 shrink-0 select-none after:absolute after:inset-0 after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 data-[size=xl]:size-16 dark:after:mix-blend-lighten", shape === "circle" ? "rounded-full after:rounded-full" : "rounded-lg after:rounded-lg")}
      {...props}
    />
  )
}

function AvatarImage(props: Omit<React.ComponentProps<typeof AvatarPrimitive.Image>, "className" | "style"> & NoStyleOverrides) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className="aspect-square size-full rounded-full object-cover group-data-[shape=rounded]/avatar:rounded-lg"
      {...props}
    />
  )
}

function AvatarFallback(props: Omit<React.ComponentProps<typeof AvatarPrimitive.Fallback>, "className" | "style"> & NoStyleOverrides) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className="flex size-full items-center justify-center rounded-full bg-muted text-sm text-foreground group-data-[shape=rounded]/avatar:rounded-lg group-data-[size=sm]/avatar:text-xs group-data-[size=xl]/avatar:text-lg"
      {...props}
    />
  )
}

function AvatarBadge(props: Omit<React.ComponentProps<"span">, "className" | "style"> & NoStyleOverrides) {
  return (
    <span
      data-slot="avatar-badge"
      className="absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2 group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2 group-data-[size=xl]/avatar:size-4 group-data-[size=xl]/avatar:[&>svg]:size-3"
      {...props}
    />
  )
}

function AvatarGroup(props: Omit<React.ComponentProps<"div">, "className" | "style"> & NoStyleOverrides) {
  return (
    <div
      data-slot="avatar-group"
      className="group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background"
      {...props}
    />
  )
}

function AvatarGroupCount(props: Omit<React.ComponentProps<"div">, "className" | "style"> & NoStyleOverrides) {
  return (
    <div
      data-slot="avatar-group-count"
      className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=xl]/avatar-group:size-16 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3"
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}
