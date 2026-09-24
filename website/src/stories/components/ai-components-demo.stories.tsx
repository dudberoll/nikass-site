import type { Meta, StoryObj } from '@storybook/react-vite'
import AiComponentsDemo from '../../components/AiComponentsDemo'

const meta = {
  component: AiComponentsDemo,
  title: 'Components/AI Assistant Demo',
  args: { apiBase: '', products: [] },
} satisfies Meta<typeof AiComponentsDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
