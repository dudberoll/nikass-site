import type { Meta, StoryObj } from '@storybook/react-vite'
import ProductVariantSelector from '../../components/ProductVariantSelector'
import { products } from './fixtures'

const meta = {
  component: ProductVariantSelector,
  title: 'Components/Product Variant Selector',
  args: { product: products[0]! },
} satisfies Meta<typeof ProductVariantSelector>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
