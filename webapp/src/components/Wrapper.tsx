import * as React from 'react'

const gaps = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
} as const

const paddings = {
  none: 'p-0',
  xs: 'p-1',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
} as const

const margins = {
  none: 'm-0',
  xs: 'm-1',
  sm: 'm-2',
  md: 'm-4',
  lg: 'm-6',
  xl: 'm-8',
} as const

const alignments = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
} as const

const justifications = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
} as const

const widths = {
  auto: 'w-auto',
  full: 'w-full',
  fit: 'w-fit',
  compact: 'w-28',
  field: 'w-full sm:w-52',
  wide: 'w-64',
  carousel: 'w-[calc(100%-6rem)]',
  reading: 'w-full max-w-2xl',
} as const

const heights = {
  small: 'h-32',
  medium: 'h-48',
  large: 'h-64',
} as const

type WrapperProps = Omit<React.ComponentProps<'div'>, 'className' | 'style'> & {
  dir?: 'row' | 'column'
  gap?: keyof typeof gaps
  padding?: keyof typeof paddings
  margin?: keyof typeof margins
  align?: keyof typeof alignments
  justify?: keyof typeof justifications
  width?: keyof typeof widths
  height?: keyof typeof heights
  columns?: 2 | 3
  wrap?: boolean
  grow?: boolean
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky'
}

export function Wrapper({
  align,
  columns,
  dir = 'column',
  gap,
  grow,
  justify,
  height,
  margin,
  padding,
  position,
  width,
  wrap,
  ...props
}: WrapperProps) {
  const classes = [
    columns ? 'grid' : 'flex',
    dir === 'row' && !columns ? 'flex-row' : 'flex-col',
    gap && gaps[gap],
    padding && paddings[padding],
    margin && margins[margin],
    align && alignments[align],
    justify && justifications[justify],
    width && widths[width],
    height && heights[height],
    columns === 2 && 'grid-cols-2',
    columns === 3 && 'grid-cols-3',
    wrap && 'flex-wrap',
    grow && 'flex-1',
    position,
  ].filter(Boolean).join(' ')

  return <div data-slot="wrapper" className={classes} {...props} />
}
