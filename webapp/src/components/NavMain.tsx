import type { IconSvgElement } from '@hugeicons/react'
import { HugeiconsIcon } from '@hugeicons/react'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/sidebar'
import { Typography } from '@/components/typography'
import type { WorkspaceRoutePath } from '@/features/navigation'
import { DashboardLink } from './DashboardLink'

export type DashboardNavigationItem = {
  icon: IconSvgElement
  isActive: boolean
  label: string
  to: WorkspaceRoutePath
}

export function NavMain({
  items,
}: {
  items: ReadonlyArray<DashboardNavigationItem>
}) {
  return (
    <nav aria-label="Primary navigation">
      <SidebarGroup>
        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton
                  asChild
                  isActive={item.isActive}
                  tooltip={item.label}
                >
                  <DashboardLink to={item.to}>
                    <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                    <Typography as="span" variant="control">
                      {item.label}
                    </Typography>
                  </DashboardLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </nav>
  )
}
