import { Separator } from '@/components/separator'
import { SidebarTrigger } from '@/components/sidebar'
import { Typography } from '@/components/typography'

export function SiteHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center border-b bg-background/95 backdrop-blur transition-[width,height] motion-reduce:transition-none">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <span className="-ml-1"><SidebarTrigger /></span>
        <Separator
          orientation="vertical"
          variant="header"
        />
        <Typography as="span" variant="h6">
          {title}
        </Typography>
      </div>
    </header>
  )
}
