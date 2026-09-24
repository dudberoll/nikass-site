import type { Meta, StoryObj } from '@storybook/react-vite'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card'
import { uiDemos } from './demos'

const meta = {
  component: uiDemos['card'],
  title: 'UI/Data Display/Card',
} satisfies Meta<typeof uiDemos['card']>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Variants: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-4 p-5 md:grid-cols-3">
      {(['default', 'raised', 'metric'] as const).map((variant) => (
        <Card key={variant} variant={variant}>
          <CardHeader>
            <CardTitle>{variant}</CardTitle>
            <CardDescription>Component-owned surface style</CardDescription>
          </CardHeader>
          <CardContent>Content</CardContent>
        </Card>
      ))}
    </div>
  ),
}
