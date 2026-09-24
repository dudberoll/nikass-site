import { useMemo } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Label } from "@/components/label"
import { Separator } from "@/components/separator"
import type { NoStyleOverrides } from '@/components/component-props'

function FieldSet(props: Omit<React.ComponentProps<"fieldset">, "className" | "style"> & NoStyleOverrides) {
  return (
    <fieldset
      data-slot="field-set"
      className="flex flex-col gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3"
      {...props}
    />
  )
}

function FieldLegend({
  variant = "legend",
  ...props
}: Omit<React.ComponentProps<"legend">, "className" | "style"> & { variant?: "legend" | "label" } & NoStyleOverrides) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className="mb-3 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base"
      {...props}
    />
  )
}

const fieldGroupVariants = cva(
  "group/field-group @container/field-group flex w-full flex-col data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4",
  {
    variants: { variant: { default: "gap-7", form: "gap-5" } },
    defaultVariants: { variant: "default" },
  }
)

function FieldGroup({ variant = "default", ...props }: Omit<React.ComponentProps<"div">, "className" | "style"> & VariantProps<typeof fieldGroupVariants> & NoStyleOverrides) {
  return (
    <div
      data-slot="field-group"
      data-variant={variant}
      className={fieldGroupVariants({ variant })}
      {...props}
    />
  )
}

const fieldVariants = cva(
  "group/field flex w-full gap-3 data-[invalid=true]:text-destructive",
  {
    variants: {
      orientation: {
        vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
        horizontal:
          "flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
        responsive:
          "flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  }
)

function Field({
  orientation = "vertical",
  ...props
}: Omit<React.ComponentProps<"div">, "className" | "style"> & VariantProps<typeof fieldVariants> & NoStyleOverrides) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={fieldVariants({ orientation })}
      {...props}
    />
  )
}

function FieldContent(props: Omit<React.ComponentProps<"div">, "className" | "style"> & NoStyleOverrides) {
  return (
    <div
      data-slot="field-content"
      className="group/field-content flex flex-1 flex-col gap-1 leading-snug"
      {...props}
    />
  )
}

function FieldLabel(props: Omit<React.ComponentProps<typeof Label>, "className" | "style" | "variant"> & NoStyleOverrides) {
  return (
    <Label
      data-slot="field-label"
      variant="field"
      {...props}
    />
  )
}

function FieldTitle(props: Omit<React.ComponentProps<"div">, "className" | "style"> & NoStyleOverrides) {
  return (
    <div
      data-slot="field-label"
      className="flex w-fit items-center gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50"
      {...props}
    />
  )
}

function FieldDescription(props: Omit<React.ComponentProps<"p">, "className" | "style"> & NoStyleOverrides) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "text-sm leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5",
        "last:mt-0 nth-last-2:-mt-1",
        "[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary"
      )}
      {...props}
    />
  )
}

function FieldSeparator({
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "className" | "style"> & {
  children?: React.ReactNode
} & NoStyleOverrides) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className="relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2"
      {...props}
    >
      <Separator variant="field" />
      {children && (
        <span
          className="relative mx-auto block w-fit bg-background px-2 text-muted-foreground"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  )
}

function FieldError({
  children,
  errors,
  ...props
}: Omit<React.ComponentProps<"div">, "className" | "style"> & {
  errors?: Array<{ message?: string } | undefined>
} & NoStyleOverrides) {
  const content = useMemo(() => {
    if (children) {
      return children
    }

    if (!errors?.length) {
      return null
    }

    const uniqueErrors = [
      ...new Map(errors.map((error) => [error?.message, error])).values(),
    ]

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>
        )}
      </ul>
    )
  }, [children, errors])

  if (!content) {
    return null
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className="text-sm font-normal text-destructive"
      {...props}
    >
      {content}
    </div>
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
}
