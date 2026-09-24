import type { Meta, StoryObj } from '@storybook/react-vite'

import { PasswordInput } from '@/components/PasswordInput'

const meta = {
  component: PasswordInput,
  title: 'Components/Password input',
} satisfies Meta<typeof PasswordInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="max-w-sm p-5">
      <PasswordInput
        aria-label="Password"
        autoComplete="current-password"
        id="password"
        name="password"
      />
    </div>
  ),
}
