import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon, MoreHorizontalCircle01Icon } from "@hugeicons/core-free-icons"
import type { NoStyleOverrides } from '@/components/component-props'

function Pagination({ className, ...props }: React.ComponentProps<"nav"> & NoStyleOverrides) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul"> & NoStyleOverrides) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li"> & NoStyleOverrides) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  Omit<React.ComponentProps<"a">, "className" | "style">

function PaginationLink({
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps & NoStyleOverrides) {
  return (
    <Button
      asChild
      variant={isActive ? "outline" : "ghost"}
      size={size}
    >
      <a
        aria-current={isActive ? "page" : undefined}
        data-slot="pagination-link"
        data-active={isActive}
        {...props}
      />
    </Button>
  )
}

function PaginationPrevious({
  text = "Previous",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string } & NoStyleOverrides) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      {...props}
    >
      <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} data-icon="inline-start" />
      <span className="hidden sm:block">{text}</span>
    </PaginationLink>
  )
}

function PaginationNext({
  text = "Next",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string } & NoStyleOverrides) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      {...props}
    >
      <span className="hidden sm:block">{text}</span>
      <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} data-icon="inline-end" />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span"> & NoStyleOverrides) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "flex size-9 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} />
      <span className="sr-only">More pages</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
