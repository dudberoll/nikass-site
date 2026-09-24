import type { Meta, StoryObj } from '@storybook/react-vite'
import CatalogExplorer from '../../components/CatalogExplorer'
import { categories, products } from './fixtures'

const meta = {
  component: CatalogExplorer,
  title: 'Components/Catalog Explorer',
  args: { categories, products },
} satisfies Meta<typeof CatalogExplorer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
