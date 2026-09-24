import type { Meta, StoryObj } from '@storybook/react-vite'

import { SiteHeader } from '@/components/SiteHeader'
import { SidebarInset } from '@/components/sidebar'
import { DashboardStoryProviders } from './dashboard-story-providers'

const meta = {
  component: SiteHeader,
  title: 'Components/Site Header',
  args: { title: 'Workspace overview' },
  decorators: [(Story) => <DashboardStoryProviders><SidebarInset><Story /></SidebarInset></DashboardStoryProviders>],
} satisfies Meta<typeof SiteHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
