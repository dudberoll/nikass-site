import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTableFrame, SectionCards } from '@/components/dashboard'
import { PageHeader } from '@/components/PageLayout'
import { Alert, AlertDescription, AlertTitle } from '@/components/alert'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/empty'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/field'
import { Input } from '@/components/input'
import { Skeleton } from '@/components/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { Typography } from '@/components/typography'

const meta = {
  title: 'Patterns/Application',
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function PatternSurface({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto grid w-full max-w-6xl gap-6 p-5 md:p-8">{children}</main>
}

export const FormCard: Story = {
  render: () => (
    <PatternSurface>
      <PageHeader description="A focused form composed from fields and card primitives." title="Profile settings" />
      <div className="max-w-2xl">
      <Card>
        <CardHeader><Typography as="h2" variant="h6">Profile details</Typography><CardDescription>Update the details shown throughout your workspace.</CardDescription></CardHeader>
        <CardContent>
          <FieldGroup>
            <Field><FieldLabel htmlFor="pattern-name">Display name</FieldLabel><Input id="pattern-name" defaultValue="Alex Morgan" /><FieldDescription>Use the name teammates recognize.</FieldDescription></Field>
            <Field><FieldLabel htmlFor="pattern-email">Email</FieldLabel><Input id="pattern-email" readOnly value="alex@example.com" /><FieldDescription>Email changes are managed separately.</FieldDescription></Field>
          </FieldGroup>
        </CardContent>
        <CardFooter variant="actions"><Button variant="outline">Cancel</Button><Button>Save changes</Button></CardFooter>
      </Card>
      </div>
    </PatternSurface>
  ),
}

export const Metrics: Story = {
  render: () => (
    <PatternSurface>
      <PageHeader description="Responsive summary cards for the current workspace." title="Overview" />
      <SectionCards items={[{ label: 'Active projects', value: 12, description: '+3 this month' }, { label: 'Team members', value: 28, description: '4 invited' }, { label: 'Tasks completed', value: '84%', description: 'Last 30 days' }]} />
    </PatternSurface>
  ),
}

export const DataTable: Story = {
  render: () => (
    <PatternSurface>
      <DataTableFrame description="A reusable table frame with toolbar and pagination." nextDisabled={false} onNext={() => undefined} onPrevious={() => undefined} previousDisabled summary="Showing 1–3 of 18 projects" title="Projects" toolbar={<div className="max-w-xs"><Input placeholder="Filter projects" /></div>}>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Owner</TableHead></TableRow></TableHeader>
          <TableBody>{[['Website refresh', 'Active', 'Alex'], ['Mobile onboarding', 'Review', 'Taylor'], ['Research library', 'Draft', 'Morgan']].map(([name, status, owner]) => <TableRow key={name}><TableCell variant="emphasis">{name}</TableCell><TableCell><Badge variant="outline">{status}</Badge></TableCell><TableCell>{owner}</TableCell></TableRow>)}</TableBody>
        </Table>
      </DataTableFrame>
    </PatternSurface>
  ),
}

export const LoadingEmptyError: Story = {
  render: () => (
    <PatternSurface>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card><CardHeader><Typography as="h2" variant="h6">Loading</Typography></CardHeader><CardContent><div className="grid gap-3"><div className="w-1/2"><Skeleton size="md" variant="text" /></div><Skeleton variant="text" /><div className="w-4/5"><Skeleton variant="text" /></div></div></CardContent></Card>
        <Card><CardContent><Empty size="sm"><EmptyHeader><EmptyMedia variant="icon">∅</EmptyMedia><EmptyTitle>No results</EmptyTitle><EmptyDescription>Try another filter.</EmptyDescription></EmptyHeader><EmptyContent><Button size="sm" variant="outline">Clear filter</Button></EmptyContent></Empty></CardContent></Card>
        <Alert variant="destructive"><AlertTitle>Could not load projects</AlertTitle><AlertDescription>The connection was interrupted. Try again.</AlertDescription></Alert>
      </div>
    </PatternSurface>
  ),
}
