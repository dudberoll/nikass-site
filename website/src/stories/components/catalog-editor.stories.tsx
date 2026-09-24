import type { Meta, StoryObj } from '@storybook/react-vite'
import CatalogEditor from '../../components/CatalogEditor'
import { products } from './fixtures'

const meta = {
  component: CatalogEditor,
  title: 'Components/Catalog Editor',
  args: { products },
} satisfies Meta<typeof CatalogEditor>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
