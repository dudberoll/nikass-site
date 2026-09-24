import type { Meta, StoryObj } from '@storybook/react-vite'

import { DashboardLink } from '@/components/DashboardLink'
import { DashboardStoryProviders } from './dashboard-story-providers'

const meta = {
  component: DashboardLink,
  title: 'Components/Dashboard Link',
  args: {
    children: 'Open settings',
    to: '/app/settings',
  },
  decorators: [(Story) => <DashboardStoryProviders><Story /></DashboardStoryProviders>],
} satisfies Meta<typeof DashboardLink>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
