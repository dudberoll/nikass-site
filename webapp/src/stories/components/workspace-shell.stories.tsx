import type { Meta, StoryObj } from '@storybook/react-vite'
import type { UserDto } from '@web-app-demo/contracts'

import { WorkspaceShell } from '@/components/WorkspaceShell'
import { Typography } from '@/components/typography'
import { DashboardStoryProviders } from './dashboard-story-providers'

const user: UserDto = {
  id: 'story-user',
  email: 'alex@example.com',
  displayName: 'Alex Morgan',
  role: 'user',
  createdAt: '2025-01-01T00:00:00.000Z',
}

const meta = {
  component: WorkspaceShell,
  title: 'Components/Workspace Shell',
  args: {
    children: <div className="p-6"><Typography as="h1" variant="h3">Workspace content</Typography><Typography tone="muted">The sidebar and header own the surrounding application frame.</Typography></div>,
    onLogout: async () => undefined,
    user,
  },
  decorators: [(Story) => <DashboardStoryProviders><Story /></DashboardStoryProviders>],
} satisfies Meta<typeof WorkspaceShell>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
