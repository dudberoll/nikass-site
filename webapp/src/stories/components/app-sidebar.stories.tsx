import { Home01Icon, Settings01Icon, UserIcon } from '@hugeicons/core-free-icons'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { UserDto } from '@web-app-demo/contracts'

import { AppSidebar } from '@/components/AppSidebar'
import { DashboardStoryProviders } from './dashboard-story-providers'

const user: UserDto = {
  id: 'story-user',
  email: 'alex@example.com',
  displayName: 'Alex Morgan',
  role: 'user',
  createdAt: '2025-01-01T00:00:00.000Z',
}

const meta = {
  component: AppSidebar,
  title: 'Components/App Sidebar',
  args: {
    homePath: '/app',
    items: [
      { icon: Home01Icon, isActive: true, label: 'Home', to: '/app' },
      { icon: UserIcon, isActive: false, label: 'Profile', to: '/app/profile' },
      { icon: Settings01Icon, isActive: false, label: 'Settings', to: '/app/settings' },
    ],
    onLogout: async () => undefined,
    settingsPath: '/app/settings',
    user,
    workspaceLabel: 'User workspace',
  },
  decorators: [(Story) => <DashboardStoryProviders><Story /></DashboardStoryProviders>],
} satisfies Meta<typeof AppSidebar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
