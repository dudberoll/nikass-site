import type { Meta, StoryObj } from '@storybook/react-vite'
import RestockRequest from '../../components/RestockRequest'
import { products } from './fixtures'

const meta = { component: RestockRequest, title: 'Components/Restock Request',
  args: { product: products[0]!, variant: products[0]!.variants[1]!, large: true } } satisfies Meta<typeof RestockRequest>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
