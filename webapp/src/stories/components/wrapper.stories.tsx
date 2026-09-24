import type { Meta, StoryObj } from '@storybook/react-vite'

import { Wrapper } from '@/components/Wrapper'

const meta = {
  title: 'Components/Wrapper',
  component: Wrapper,
  args: { dir: 'row', gap: 'md', align: 'center', padding: 'md' },
} satisfies Meta<typeof Wrapper>

export default meta
type Story = StoryObj<typeof meta>

export const Layout: Story = {
  render: (args) => (
    <Wrapper {...args}>
      <div className="rounded-md border p-4">First item</div>
      <div className="rounded-md border p-4">Second item</div>
    </Wrapper>
  ),
}
