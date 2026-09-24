import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

const typographyVariants = cva("min-w-0 tracking-normal", {
  variants: {
    variant: {
      h1: "font-heading text-4xl leading-tight font-semibold",
      h2: "font-heading text-3xl leading-tight font-semibold",
      h3: "font-heading text-2xl leading-snug font-semibold",
      h4: "font-heading text-xl leading-snug font-semibold",
      h5: "font-heading text-lg leading-snug font-medium",
      h6: "font-heading text-base leading-snug font-medium",
      link: "text-base leading-7 font-normal underline underline-offset-4",
      linkSm: "text-sm leading-normal font-normal underline-offset-4 hover:underline",
      lead: "text-lg leading-7 font-normal",
      body: "text-base leading-7 font-normal",
      bodySm: "text-sm leading-normal font-normal",
      bodyXs: "text-xs leading-normal font-normal",
      bodySmMedium: "text-sm leading-normal font-medium",
      emphasis: "font-medium",
      label: "text-sm leading-normal font-medium",
      control: "text-sm leading-normal font-medium whitespace-nowrap",
      controlXs: "text-xs leading-normal font-medium whitespace-nowrap",
      kbd: "font-sans text-xs leading-normal font-medium whitespace-nowrap",
      input:
        "text-base leading-normal font-normal md:text-sm file:text-sm file:font-medium",
      caption: "text-xs leading-normal font-normal",
      shortcut: "text-xs leading-normal tracking-widest font-normal",
      code: "font-mono text-sm leading-normal font-medium",
      avatar: "text-sm leading-normal font-normal group-data-[size=sm]/avatar:text-xs",
      avatarCount:
        "text-sm leading-normal font-normal group-has-data-[size=sm]/avatar-group:text-xs",
      calendar:
        "text-sm leading-normal font-normal [&_.rdp-caption_label]:text-sm [&_.rdp-caption_label]:font-medium [&_.rdp-dropdowns]:text-sm [&_.rdp-dropdowns]:font-medium [&_.rdp-week_number]:text-[0.8rem] [&_.rdp-weekday]:text-[0.8rem] [&_.rdp-weekday]:font-normal",
      calendarDay:
        "text-sm leading-normal font-normal [&>span]:text-xs",
      commandGroup:
        "text-sm leading-normal font-normal **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:leading-normal **:[[cmdk-group-heading]]:font-medium",
      srOnly: "sr-only",
    },
    tone: {
      current: "",
      default: "text-foreground",
      muted: "text-muted-foreground",
      destructive: "text-destructive",
      primary: "text-primary",
      card: "text-card-foreground",
      popover: "text-popover-foreground",
      sidebar: "text-sidebar-foreground",
      inverse: "text-background",
    },
    numeric: {
      true: "tabular-nums",
    },
  },
  defaultVariants: {
    variant: "body",
    tone: "current",
  },
})

type TypographyVariant = NonNullable<
  VariantProps<typeof typographyVariants>["variant"]
>

const defaultElementByVariant: Record<TypographyVariant, React.ElementType> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  link: "a",
  linkSm: "a",
  lead: "p",
  body: "p",
  bodySm: "p",
  bodyXs: "p",
  bodySmMedium: "p",
  emphasis: "strong",
  label: "span",
  control: "span",
  controlXs: "span",
  kbd: "kbd",
  input: "span",
  caption: "span",
  shortcut: "span",
  code: "code",
  avatar: "span",
  avatarCount: "span",
  calendar: "div",
  calendarDay: "span",
  commandGroup: "div",
  srOnly: "span",
}

type TypographyOwnProps<TElement extends React.ElementType = "span"> =
  VariantProps<typeof typographyVariants> & {
    as?: TElement
  }

type TypographyProps<TElement extends React.ElementType = "span"> =
  TypographyOwnProps<TElement> &
    Omit<
      React.ComponentPropsWithoutRef<TElement>,
      keyof TypographyOwnProps<TElement> | "className" | "style"
    >

function Typography<TElement extends React.ElementType = "span">({
  as,
  variant,
  tone,
  numeric,
  ...props
}: TypographyProps<TElement>) {
  const resolvedVariant = variant ?? "body"
  const Comp = as ?? defaultElementByVariant[resolvedVariant]

  return (
    <Comp
      data-slot="typography"
      data-variant={resolvedVariant}
      className={typographyVariants({ variant: resolvedVariant, tone, numeric })}
      {...props}
    />
  )
}

export { Typography }
export type { TypographyProps }
