import type { Meta, StoryObj } from '@storybook/react-vite'
import PromptInput from '../../components/PromptInput'

const meta = {
  component: PromptInput,
  title: 'Components/Prompt Input',
  args: {
    onSubmit: () => undefined,
    placeholder: 'Опишите задачу или задайте вопрос',
  },
} satisfies Meta<typeof PromptInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Embedded: Story = {
  args: { variant: 'embedded' },
}
