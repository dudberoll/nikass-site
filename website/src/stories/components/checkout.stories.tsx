import type { Meta, StoryObj } from '@storybook/react-vite'
import Checkout from '../../components/Checkout'

const meta = {
  component: Checkout,
  title: 'Components/Checkout',
  args: {
    apiBase: '',
    privacyUrl: '/privacy',
    termsUrl: '/payment-and-delivery',
    yandexSuggestApiKey: '',
    cdekYandexApiKey: '',
  },
} satisfies Meta<typeof Checkout>

export default meta
type Story = StoryObj<typeof meta>

export const EmptyCart: Story = {}
