import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import type { NoStyleOverrides } from '@/components/component-props'

const cardVariants = cva(
  "group/card @container/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
  {
    variants: {
      variant: {
        default: "shadow-xs",
        raised: "shadow-sm",
        metric: "bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

type CardDivProps = Omit<React.ComponentProps<"div">, "className" | "style">

function Card({
  variant = "default",
  size = "default",
  ...props
}: CardDivProps & VariantProps<typeof cardVariants> & { size?: "default" | "sm" } & NoStyleOverrides) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      className={cardVariants({ variant })}
      {...props}
    />
  )
}

function CardHeader(props: CardDivProps & NoStyleOverrides) {
  return (
    <div
      data-slot="card-header"
      className="group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)"
      {...props}
    />
  )
}

function CardTitle(props: CardDivProps & NoStyleOverrides) {
  return (
    <div
      data-slot="card-title"
      className="font-heading text-base leading-normal font-medium group-data-[size=sm]/card:text-sm"
      {...props}
    />
  )
}

function CardDescription(props: CardDivProps & NoStyleOverrides) {
  return (
    <div
      data-slot="card-description"
      className="text-sm text-muted-foreground"
      {...props}
    />
  )
}

function CardAction(props: CardDivProps & NoStyleOverrides) {
  return (
    <div
      data-slot="card-action"
      className="col-start-2 row-span-2 row-start-1 self-start justify-self-end"
      {...props}
    />
  )
}

function CardContent(props: CardDivProps & NoStyleOverrides) {
  return (
    <div
      data-slot="card-content"
      className="px-(--card-spacing)"
      {...props}
    />
  )
}

const cardFooterVariants = cva(
  "flex items-center rounded-b-xl px-(--card-spacing) [.border-t]:pt-(--card-spacing)",
  {
    variants: {
      variant: {
        default: "",
        actions: "border-t justify-end gap-2",
        pager: "flex-col items-stretch justify-between gap-3 border-t sm:flex-row sm:items-center",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function CardFooter({ variant = "default", ...props }: CardDivProps & VariantProps<typeof cardFooterVariants> & NoStyleOverrides) {
  return (
    <div
      data-slot="card-footer"
      data-variant={variant}
      className={cardFooterVariants({ variant })}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
