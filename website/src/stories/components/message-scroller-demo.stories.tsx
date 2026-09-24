import type { Meta, StoryObj } from '@storybook/react-vite'
import MessageScrollerDemo from '../../components/MessageScrollerDemo'

const meta = {
  component: MessageScrollerDemo,
  title: 'Components/Message Scroller Demo',
  args: { apiBase: '' },
} satisfies Meta<typeof MessageScrollerDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}
