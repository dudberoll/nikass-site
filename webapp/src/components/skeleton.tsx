import { cn } from "@/lib/utils"
import type { NoStyleOverrides } from '@/components/component-props'

type SkeletonProps = Omit<React.ComponentProps<"div">, "className" | "style"> & {
  variant?: "text" | "avatar" | "metric" | "row" | "sidebarIcon" | "sidebarText"
  size?: "sm" | "md"
}

function Skeleton({ variant, size = "sm", ...props }: SkeletonProps & NoStyleOverrides) {
  const variantClassName = {
    text: size === "md" ? "h-5" : "h-4",
    avatar: "size-12 rounded-full",
    metric: "h-40 w-full rounded-4xl",
    row: "h-12 w-full",
    sidebarIcon: "size-4 rounded-md",
    sidebarText: "h-4 max-w-[70%] flex-1",
  }[variant ?? "text"]

  return (
    <div
      data-slot="skeleton"
      data-variant={variant ?? "text"}
      className={cn("animate-pulse rounded-md bg-muted", variantClassName)}
      {...props}
    />
  )
}

export { Skeleton }
