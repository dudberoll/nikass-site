import { Home01Icon, Settings01Icon, UserIcon } from '@hugeicons/core-free-icons'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { NavMain } from '@/components/NavMain'
import { DashboardStoryProviders } from './dashboard-story-providers'

const meta = {
  component: NavMain,
  title: 'Components/Navigation/Main',
  args: {
    items: [
      { icon: Home01Icon, isActive: true, label: 'Home', to: '/app' },
      { icon: UserIcon, isActive: false, label: 'Profile', to: '/app/profile' },
      { icon: Settings01Icon, isActive: false, label: 'Settings', to: '/app/settings' },
    ],
  },
  decorators: [(Story) => <DashboardStoryProviders><Story /></DashboardStoryProviders>],
} satisfies Meta<typeof NavMain>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
