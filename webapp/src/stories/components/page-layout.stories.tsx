import type { Meta, StoryObj } from '@storybook/react-vite'

import { PageContainer, PageHeader } from '@/components/PageLayout'
import { Button } from '@/components/button'
import { Card, CardContent, CardHeader } from '@/components/card'
import { Typography } from '@/components/typography'

const meta = {
  component: PageContainer,
  title: 'Components/Page Layout',
  args: { children: null },
} satisfies Meta<typeof PageContainer>

export default meta
type Story = StoryObj<typeof meta>

export const Container: Story = {
  render: () => (
    <PageContainer>
      <PageHeader
        actions={<Button>Create project</Button>}
        description="A shared page frame with a title, context, and page action."
        title="Workspace overview"
      />
      <Card>
        <CardHeader><Typography as="h2" variant="h6">Project summary</Typography></CardHeader>
        <CardContent>Page content uses the same centered reading width.</CardContent>
      </Card>
    </PageContainer>
  ),
}

export const Header: Story = {
  render: () => (
    <PageHeader
      description="A concise explanation of the work available on this page."
      title="Workspace overview"
    />
  ),
}

export const HeaderWithAction: Story = {
  render: () => (
    <PageHeader
      actions={<Button>Create project</Button>}
      description="A concise explanation of the work available on this page."
      title="Workspace overview"
    />
  ),
}
