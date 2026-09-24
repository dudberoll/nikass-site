import type { Meta, StoryObj } from '@storybook/react-vite'
import CartView from '../../components/CartView'
import { products } from './fixtures'

const meta = {
  component: CartView,
  title: 'Components/Cart View',
  args: { products },
} satisfies Meta<typeof CartView>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}
