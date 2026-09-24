import type { Meta, StoryObj } from '@storybook/react-vite'
import type { UserDto } from '@web-app-demo/contracts'

import { NavUser } from '@/components/NavUser'
import { DashboardStoryProviders } from './dashboard-story-providers'

const user: UserDto = {
  id: 'story-user',
  email: 'alex@example.com',
  displayName: 'Alex Morgan',
  role: 'user',
  createdAt: '2025-01-01T00:00:00.000Z',
}

const meta = {
  component: NavUser,
  title: 'Components/Navigation/User Menu',
  args: {
    accountPath: '/app/profile',
    onLogout: async () => undefined,
    settingsPath: '/app/settings',
    user,
  },
  decorators: [(Story) => <DashboardStoryProviders><Story /></DashboardStoryProviders>],
} satisfies Meta<typeof NavUser>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
