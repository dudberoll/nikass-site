import * as React from "react"
import { Slot } from "radix-ui"
import type { NoStyleOverrides } from '@/components/component-props'
import { buttonVariants, type ButtonStyleProps } from "@/lib/button-variants"

type ButtonProps = Omit<React.ComponentProps<"button">, "className" | "style"> &
  Pick<ButtonStyleProps, "variant" | "size" | "shape"> & {
    asChild?: boolean
  }

function Button({
  variant = "default",
  size = "default",
  shape = "default",
  asChild = false,
  ...props
}: ButtonProps & NoStyleOverrides) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-shape={shape}
      className={buttonVariants({ variant, size, shape })}
      {...props}
    />
  )
}

export { Button }
