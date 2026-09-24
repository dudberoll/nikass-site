import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  NotFoundSection,
  SessionErrorSection,
  SessionLoadingSection,
} from '@/components/WebRouteSections'
import { DashboardStoryProviders } from './dashboard-story-providers'

const meta = {
  component: SessionLoadingSection,
  title: 'Components/Route Sections',
  decorators: [(Story) => <DashboardStoryProviders><Story /></DashboardStoryProviders>],
} satisfies Meta<typeof SessionLoadingSection>

export default meta
type Story = StoryObj<typeof meta>

export const Loading: Story = {}

export const SessionError: Story = {
  render: () => <SessionErrorSection retry={async () => undefined} />,
}

export const NotFound: Story = {
  render: () => <NotFoundSection destination="/app" />,
}
