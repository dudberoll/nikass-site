import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
} from 'recharts'
import { toast } from 'sonner'

import * as AccordionUi from '@/components/accordion'
import * as AlertDialogUi from '@/components/alert-dialog'
import * as AlertUi from '@/components/alert'
import * as AspectRatioUi from '@/components/aspect-ratio'
import * as AvatarUi from '@/components/avatar'
import * as BadgeUi from '@/components/badge'
import * as BreadcrumbUi from '@/components/breadcrumb'
import * as ButtonGroupUi from '@/components/button-group'
import * as ButtonUi from '@/components/button'
import * as CalendarUi from '@/components/calendar'
import * as CardUi from '@/components/card'
import * as CarouselUi from '@/components/carousel'
import * as ChartUi from '@/components/chart'
import * as CheckboxUi from '@/components/checkbox'
import * as CollapsibleUi from '@/components/collapsible'
import * as ComboboxUi from '@/components/combobox'
import * as CommandUi from '@/components/command'
import * as ContextMenuUi from '@/components/context-menu'
import * as DialogUi from '@/components/dialog'
import * as DirectionUi from '@/components/direction'
import * as DrawerUi from '@/components/drawer'
import * as DropdownMenuUi from '@/components/dropdown-menu'
import * as EmptyUi from '@/components/empty'
import * as FieldUi from '@/components/field'
import * as HoverCardUi from '@/components/hover-card'
import * as InputGroupUi from '@/components/input-group'
import * as InputOtpUi from '@/components/input-otp'
import * as InputUi from '@/components/input'
import * as ItemUi from '@/components/item'
import * as KbdUi from '@/components/kbd'
import * as LabelUi from '@/components/label'
import * as MenubarUi from '@/components/menubar'
import * as NativeSelectUi from '@/components/native-select'
import * as NavigationMenuUi from '@/components/navigation-menu'
import * as PaginationUi from '@/components/pagination'
import * as PopoverUi from '@/components/popover'
import * as ProgressUi from '@/components/progress'
import * as RadioGroupUi from '@/components/radio-group'
import * as ResizableUi from '@/components/resizable'
import * as ScrollAreaUi from '@/components/scroll-area'
import * as SelectUi from '@/components/select'
import * as SeparatorUi from '@/components/separator'
import * as SheetUi from '@/components/sheet'
import * as SidebarUi from '@/components/sidebar'
import * as SkeletonUi from '@/components/skeleton'
import * as SliderUi from '@/components/slider'
import * as SonnerUi from '@/components/sonner'
import * as SpinnerUi from '@/components/spinner'
import * as SwitchUi from '@/components/switch'
import * as TableUi from '@/components/table'
import * as TabsUi from '@/components/tabs'
import * as TextareaUi from '@/components/textarea'
import * as ToggleGroupUi from '@/components/toggle-group'
import * as ToggleUi from '@/components/toggle'
import * as TooltipUi from '@/components/tooltip'
import { Wrapper } from '@/components/Wrapper'

const options = ['Design', 'Engineering', 'Product']
const chartData = [
  { month: 'Jan', total: 18 },
  { month: 'Feb', total: 31 },
  { month: 'Mar', total: 24 },
  { month: 'Apr', total: 42 },
]

function DemoSurface({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-2xl p-6">{children}</div>
}

function AccordionDemo() {
  return (
    <DemoSurface>
      <AccordionUi.Accordion defaultValue="first" type="single" collapsible>
        <AccordionUi.AccordionItem value="first">
          <AccordionUi.AccordionTrigger>What is included?</AccordionUi.AccordionTrigger>
          <AccordionUi.AccordionContent>All core UI states and responsive behavior.</AccordionUi.AccordionContent>
        </AccordionUi.AccordionItem>
        <AccordionUi.AccordionItem value="second">
          <AccordionUi.AccordionTrigger>Can it be customized?</AccordionUi.AccordionTrigger>
          <AccordionUi.AccordionContent>Yes. Components use local design tokens.</AccordionUi.AccordionContent>
        </AccordionUi.AccordionItem>
      </AccordionUi.Accordion>
    </DemoSurface>
  )
}

function AlertDemo() {
  return (
    <DemoSurface>
      <div className="grid gap-4">
        <AlertUi.Alert>
          <AlertUi.AlertTitle>Changes saved</AlertUi.AlertTitle>
          <AlertUi.AlertDescription>Your workspace is up to date.</AlertUi.AlertDescription>
        </AlertUi.Alert>
        <AlertUi.Alert variant="destructive">
          <AlertUi.AlertTitle>Could not save</AlertUi.AlertTitle>
          <AlertUi.AlertDescription>Check the connection and try again.</AlertUi.AlertDescription>
        </AlertUi.Alert>
      </div>
    </DemoSurface>
  )
}

function AlertDialogDemo({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <DemoSurface>
      <AlertDialogUi.AlertDialog defaultOpen={defaultOpen}>
        <AlertDialogUi.AlertDialogTrigger asChild>
          <ButtonUi.Button variant="destructive">Delete project</ButtonUi.Button>
        </AlertDialogUi.AlertDialogTrigger>
        <AlertDialogUi.AlertDialogContent>
          <AlertDialogUi.AlertDialogHeader>
            <AlertDialogUi.AlertDialogTitle>Delete this project?</AlertDialogUi.AlertDialogTitle>
            <AlertDialogUi.AlertDialogDescription>This action cannot be undone.</AlertDialogUi.AlertDialogDescription>
          </AlertDialogUi.AlertDialogHeader>
          <AlertDialogUi.AlertDialogFooter>
            <AlertDialogUi.AlertDialogCancel>Cancel</AlertDialogUi.AlertDialogCancel>
            <AlertDialogUi.AlertDialogAction variant="destructive">Delete</AlertDialogUi.AlertDialogAction>
          </AlertDialogUi.AlertDialogFooter>
        </AlertDialogUi.AlertDialogContent>
      </AlertDialogUi.AlertDialog>
    </DemoSurface>
  )
}

function AspectRatioDemo() {
  return (
    <DemoSurface>
      <AspectRatioUi.AspectRatio variant="framed" ratio={16 / 9}>
        <div className="grid size-full place-items-center text-sm text-foreground">16:9 media</div>
      </AspectRatioUi.AspectRatio>
    </DemoSurface>
  )
}

function AvatarDemo() {
  return (
    <DemoSurface>
      <AvatarUi.AvatarGroup>
        {['DS', 'UI', 'QA'].map((label) => (
          <AvatarUi.Avatar key={label} size="lg">
            <AvatarUi.AvatarFallback>{label}</AvatarUi.AvatarFallback>
          </AvatarUi.Avatar>
        ))}
        <AvatarUi.Avatar shape="rounded" size="lg">
          <AvatarUi.AvatarFallback>NX</AvatarUi.AvatarFallback>
        </AvatarUi.Avatar>
        <AvatarUi.AvatarGroupCount>+4</AvatarUi.AvatarGroupCount>
      </AvatarUi.AvatarGroup>
    </DemoSurface>
  )
}

function BadgeDemo() {
  return (
    <DemoSurface>
      <div className="flex flex-wrap gap-2">
        {(['default', 'secondary', 'outline', 'role', 'destructive', 'ghost', 'link'] as const).map((variant) => (
          <BadgeUi.Badge key={variant} variant={variant}>{variant}</BadgeUi.Badge>
        ))}
      </div>
    </DemoSurface>
  )
}

function BreadcrumbDemo() {
  return (
    <DemoSurface>
      <BreadcrumbUi.Breadcrumb>
        <BreadcrumbUi.BreadcrumbList>
          <BreadcrumbUi.BreadcrumbItem><BreadcrumbUi.BreadcrumbLink href="#">Workspace</BreadcrumbUi.BreadcrumbLink></BreadcrumbUi.BreadcrumbItem>
          <BreadcrumbUi.BreadcrumbSeparator />
          <BreadcrumbUi.BreadcrumbItem><BreadcrumbUi.BreadcrumbEllipsis /></BreadcrumbUi.BreadcrumbItem>
          <BreadcrumbUi.BreadcrumbSeparator />
          <BreadcrumbUi.BreadcrumbItem><BreadcrumbUi.BreadcrumbPage>Settings</BreadcrumbUi.BreadcrumbPage></BreadcrumbUi.BreadcrumbItem>
        </BreadcrumbUi.BreadcrumbList>
      </BreadcrumbUi.Breadcrumb>
    </DemoSurface>
  )
}

function ButtonDemo() {
  return (
    <DemoSurface>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {(['default', 'secondary', 'outline', 'ghost', 'destructive', 'fieldAction', 'link'] as const).map((variant) => (
            <ButtonUi.Button key={variant} variant={variant}>{variant}</ButtonUi.Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['xs', 'sm', 'default', 'lg'] as const).map((size) => (
            <ButtonUi.Button key={size} size={size}>{size}</ButtonUi.Button>
          ))}
          <ButtonUi.Button disabled>Disabled</ButtonUi.Button>
        </div>
      </div>
    </DemoSurface>
  )
}

function ButtonGroupDemo() {
  return (
    <DemoSurface>
      <ButtonGroupUi.ButtonGroup>
        <ButtonUi.Button variant="outline">Previous</ButtonUi.Button>
        <ButtonGroupUi.ButtonGroupText>2 of 8</ButtonGroupUi.ButtonGroupText>
        <ButtonUi.Button variant="outline">Next</ButtonUi.Button>
      </ButtonGroupUi.ButtonGroup>
    </DemoSurface>
  )
}

function CalendarDemo() {
  const [selected, setSelected] = useState<Date | undefined>(new Date(2026, 7, 26))
  return <DemoSurface><CalendarUi.Calendar mode="single" onSelect={setSelected} selected={selected} /></DemoSurface>
}

function CardDemo() {
  return (
    <DemoSurface>
      <CardUi.Card>
        <CardUi.CardHeader>
          <CardUi.CardTitle>Component card</CardUi.CardTitle>
          <CardUi.CardDescription>A reusable surface with consistent spacing.</CardUi.CardDescription>
          <CardUi.CardAction><BadgeUi.Badge variant="secondary">New</BadgeUi.Badge></CardUi.CardAction>
        </CardUi.CardHeader>
        <CardUi.CardContent><p className="text-sm">Content remains readable at every viewport.</p></CardUi.CardContent>
        <CardUi.CardFooter variant="actions"><ButtonUi.Button size="sm">Continue</ButtonUi.Button></CardUi.CardFooter>
      </CardUi.Card>
    </DemoSurface>
  )
}

function CarouselDemo() {
  return (
    <DemoSurface>
      <Wrapper width="carousel" align="center">
      <CarouselUi.Carousel opts={{ loop: true }}>
        <CarouselUi.CarouselContent>
          {[1, 2, 3].map((item) => (
            <CarouselUi.CarouselItem key={item}>
              <CardUi.Card><CardUi.CardContent><div className="grid aspect-video place-items-center text-3xl font-semibold">{item}</div></CardUi.CardContent></CardUi.Card>
            </CarouselUi.CarouselItem>
          ))}
        </CarouselUi.CarouselContent>
        <CarouselUi.CarouselPrevious />
        <CarouselUi.CarouselNext />
      </CarouselUi.Carousel>
      </Wrapper>
    </DemoSurface>
  )
}

function ChartDemo() {
  return (
    <DemoSurface>
      <ChartUi.ChartContainer size="fixed" config={{ total: { color: 'var(--primary)', label: 'Total' } }}>
        <BarChart data={chartData} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} />
          <ChartUi.ChartTooltip content={<ChartUi.ChartTooltipContent />} />
          <Bar dataKey="total" fill="var(--color-total)" radius={6} />
        </BarChart>
      </ChartUi.ChartContainer>
    </DemoSurface>
  )
}

function CheckboxDemo() {
  return (
    <DemoSurface>
      <div className="grid gap-4">
        <label className="flex items-center gap-3 text-sm"><CheckboxUi.Checkbox defaultChecked />Selected</label>
        <label className="flex items-center gap-3 text-sm"><CheckboxUi.Checkbox />Unselected</label>
        <label className="flex items-center gap-3 text-sm opacity-60"><CheckboxUi.Checkbox disabled />Disabled</label>
        <label className="flex items-center gap-3 text-sm text-destructive"><CheckboxUi.Checkbox aria-invalid />Invalid</label>
      </div>
    </DemoSurface>
  )
}

function CollapsibleDemo() {
  return (
    <DemoSurface>
      <Wrapper gap="sm">
      <CollapsibleUi.Collapsible defaultOpen>
        <CollapsibleUi.CollapsibleTrigger asChild><ButtonUi.Button variant="outline">Toggle details</ButtonUi.Button></CollapsibleUi.CollapsibleTrigger>
        <CollapsibleUi.CollapsibleContent variant="surface">Additional content stays grouped with its trigger.</CollapsibleUi.CollapsibleContent>
      </CollapsibleUi.Collapsible>
      </Wrapper>
    </DemoSurface>
  )
}

function ComboboxDemo() {
  return (
    <DemoSurface>
      <ComboboxUi.Combobox items={options}>
        <Wrapper width="wide"><ComboboxUi.ComboboxInput placeholder="Choose a team" showClear /></Wrapper>
        <ComboboxUi.ComboboxContent>
          <ComboboxUi.ComboboxEmpty>No team found.</ComboboxUi.ComboboxEmpty>
          <ComboboxUi.ComboboxList>
            {options.map((option) => <ComboboxUi.ComboboxItem key={option} value={option}>{option}</ComboboxUi.ComboboxItem>)}
          </ComboboxUi.ComboboxList>
        </ComboboxUi.ComboboxContent>
      </ComboboxUi.Combobox>
    </DemoSurface>
  )
}

function CommandDemo() {
  return (
    <DemoSurface>
      <CommandUi.Command variant="standalone">
        <CommandUi.CommandInput placeholder="Search commands" />
        <CommandUi.CommandList>
          <CommandUi.CommandEmpty>No results.</CommandUi.CommandEmpty>
          <CommandUi.CommandGroup heading="Workspace">
            <CommandUi.CommandItem>Open profile<CommandUi.CommandShortcut>⌘P</CommandUi.CommandShortcut></CommandUi.CommandItem>
            <CommandUi.CommandItem>Open settings<CommandUi.CommandShortcut>⌘S</CommandUi.CommandShortcut></CommandUi.CommandItem>
          </CommandUi.CommandGroup>
        </CommandUi.CommandList>
      </CommandUi.Command>
    </DemoSurface>
  )
}

function ContextMenuDemo() {
  return (
    <DemoSurface>
      <ContextMenuUi.ContextMenu>
        <ContextMenuUi.ContextMenuTrigger variant="target">Right-click this area</ContextMenuUi.ContextMenuTrigger>
        <ContextMenuUi.ContextMenuContent>
          <ContextMenuUi.ContextMenuItem>Open</ContextMenuUi.ContextMenuItem>
          <ContextMenuUi.ContextMenuItem>Duplicate<ContextMenuUi.ContextMenuShortcut>⌘D</ContextMenuUi.ContextMenuShortcut></ContextMenuUi.ContextMenuItem>
          <ContextMenuUi.ContextMenuSeparator />
          <ContextMenuUi.ContextMenuItem variant="destructive">Delete</ContextMenuUi.ContextMenuItem>
        </ContextMenuUi.ContextMenuContent>
      </ContextMenuUi.ContextMenu>
    </DemoSurface>
  )
}

function DialogDemo({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <DemoSurface>
      <DialogUi.Dialog defaultOpen={defaultOpen}>
        <DialogUi.DialogTrigger asChild><ButtonUi.Button>Edit profile</ButtonUi.Button></DialogUi.DialogTrigger>
        <DialogUi.DialogContent>
          <DialogUi.DialogHeader><DialogUi.DialogTitle>Edit profile</DialogUi.DialogTitle><DialogUi.DialogDescription>Update the name shown in your workspace.</DialogUi.DialogDescription></DialogUi.DialogHeader>
          <InputUi.Input defaultValue="Alex Morgan" aria-label="Display name" />
          <DialogUi.DialogFooter><DialogUi.DialogClose asChild><ButtonUi.Button variant="outline">Cancel</ButtonUi.Button></DialogUi.DialogClose><ButtonUi.Button>Save</ButtonUi.Button></DialogUi.DialogFooter>
        </DialogUi.DialogContent>
      </DialogUi.Dialog>
    </DemoSurface>
  )
}

function DirectionDemo() {
  return <DemoSurface><DirectionUi.DirectionProvider dir="rtl"><div dir="rtl" className="rounded-lg border p-4 text-sm">واجهة من اليمين إلى اليسار</div></DirectionUi.DirectionProvider></DemoSurface>
}

function DrawerDemo({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <DemoSurface>
      <DrawerUi.Drawer defaultOpen={defaultOpen}>
        <DrawerUi.DrawerTrigger asChild><ButtonUi.Button variant="outline">Open drawer</ButtonUi.Button></DrawerUi.DrawerTrigger>
        <DrawerUi.DrawerContent>
          <DrawerUi.DrawerHeader><DrawerUi.DrawerTitle>Quick settings</DrawerUi.DrawerTitle><DrawerUi.DrawerDescription>Adjust the current workspace.</DrawerUi.DrawerDescription></DrawerUi.DrawerHeader>
          <DrawerUi.DrawerFooter><DrawerUi.DrawerClose asChild><ButtonUi.Button>Done</ButtonUi.Button></DrawerUi.DrawerClose></DrawerUi.DrawerFooter>
        </DrawerUi.DrawerContent>
      </DrawerUi.Drawer>
    </DemoSurface>
  )
}

function DropdownMenuDemo({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <DemoSurface>
      <DropdownMenuUi.DropdownMenu defaultOpen={defaultOpen}>
        <DropdownMenuUi.DropdownMenuTrigger asChild><ButtonUi.Button variant="outline">Open menu</ButtonUi.Button></DropdownMenuUi.DropdownMenuTrigger>
        <DropdownMenuUi.DropdownMenuContent>
          <DropdownMenuUi.DropdownMenuLabel>Actions</DropdownMenuUi.DropdownMenuLabel>
          <DropdownMenuUi.DropdownMenuItem>Edit<DropdownMenuUi.DropdownMenuShortcut>⌘E</DropdownMenuUi.DropdownMenuShortcut></DropdownMenuUi.DropdownMenuItem>
          <DropdownMenuUi.DropdownMenuCheckboxItem checked>Notifications</DropdownMenuUi.DropdownMenuCheckboxItem>
          <DropdownMenuUi.DropdownMenuSeparator />
          <DropdownMenuUi.DropdownMenuItem variant="destructive">Delete</DropdownMenuUi.DropdownMenuItem>
        </DropdownMenuUi.DropdownMenuContent>
      </DropdownMenuUi.DropdownMenu>
    </DemoSurface>
  )
}

function EmptyDemo() {
  return (
    <DemoSurface>
      <EmptyUi.Empty variant="outlined">
        <EmptyUi.EmptyHeader><EmptyUi.EmptyMedia variant="icon">∅</EmptyUi.EmptyMedia><EmptyUi.EmptyTitle>No projects yet</EmptyUi.EmptyTitle><EmptyUi.EmptyDescription>Create the first project to start working.</EmptyUi.EmptyDescription></EmptyUi.EmptyHeader>
        <EmptyUi.EmptyContent><ButtonUi.Button>Create project</ButtonUi.Button></EmptyUi.EmptyContent>
      </EmptyUi.Empty>
    </DemoSurface>
  )
}

function FieldDemo() {
  return (
    <DemoSurface>
      <FieldUi.FieldGroup>
        <FieldUi.Field><FieldUi.FieldLabel htmlFor="story-name">Display name</FieldUi.FieldLabel><InputUi.Input id="story-name" placeholder="Your name" /><FieldUi.FieldDescription>Shown to people in your workspace.</FieldUi.FieldDescription></FieldUi.Field>
        <FieldUi.Field data-invalid><FieldUi.FieldLabel htmlFor="story-code">Invite code</FieldUi.FieldLabel><InputUi.Input id="story-code" aria-invalid defaultValue="x" /><FieldUi.FieldError>Use at least four characters.</FieldUi.FieldError></FieldUi.Field>
      </FieldUi.FieldGroup>
    </DemoSurface>
  )
}

function HoverCardDemo({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <DemoSurface>
      <HoverCardUi.HoverCard defaultOpen={defaultOpen}>
        <HoverCardUi.HoverCardTrigger asChild><ButtonUi.Button variant="link">@design-system</ButtonUi.Button></HoverCardUi.HoverCardTrigger>
        <HoverCardUi.HoverCardContent><div className="grid gap-1"><strong>Design system</strong><span className="text-sm text-muted-foreground">Shared components and interaction rules.</span></div></HoverCardUi.HoverCardContent>
      </HoverCardUi.HoverCard>
    </DemoSurface>
  )
}

function InputDemo() {
  return <DemoSurface><div className="grid gap-3"><InputUi.Input aria-label="Default input" placeholder="Default input" /><InputUi.Input aria-label="Surface input" placeholder="Surface input" variant="surface" /><InputUi.Input aria-invalid aria-label="Invalid input" defaultValue="Invalid value" /><InputUi.Input aria-label="Disabled input" disabled placeholder="Disabled input" /></div></DemoSurface>
}

function InputGroupDemo() {
  return (
    <DemoSurface>
      <InputGroupUi.InputGroup>
        <InputGroupUi.InputGroupAddon><InputGroupUi.InputGroupText>https://</InputGroupUi.InputGroupText></InputGroupUi.InputGroupAddon>
        <InputGroupUi.InputGroupInput aria-label="Project domain" placeholder="project.example" />
        <InputGroupUi.InputGroupAddon align="inline-end"><InputGroupUi.InputGroupButton size="sm">Copy</InputGroupUi.InputGroupButton></InputGroupUi.InputGroupAddon>
      </InputGroupUi.InputGroup>
    </DemoSurface>
  )
}

function InputOtpDemo() {
  return <DemoSurface><InputOtpUi.InputOTP aria-label="Verification code" maxLength={6}><InputOtpUi.InputOTPGroup>{[0, 1, 2].map((index) => <InputOtpUi.InputOTPSlot index={index} key={index} />)}</InputOtpUi.InputOTPGroup><InputOtpUi.InputOTPSeparator /><InputOtpUi.InputOTPGroup>{[3, 4, 5].map((index) => <InputOtpUi.InputOTPSlot index={index} key={index} />)}</InputOtpUi.InputOTPGroup></InputOtpUi.InputOTP></DemoSurface>
}

function ItemDemo() {
  return (
    <DemoSurface>
      <ItemUi.ItemGroup>
        <ItemUi.Item variant="outline"><ItemUi.ItemMedia variant="icon">A</ItemUi.ItemMedia><ItemUi.ItemContent><ItemUi.ItemTitle>Account settings</ItemUi.ItemTitle><ItemUi.ItemDescription>Profile, password, and security.</ItemUi.ItemDescription></ItemUi.ItemContent><ItemUi.ItemActions><ButtonUi.Button size="sm" variant="outline">Open</ButtonUi.Button></ItemUi.ItemActions></ItemUi.Item>
        <ItemUi.ItemSeparator />
        <ItemUi.Item><ItemUi.ItemContent><ItemUi.ItemTitle>Notifications</ItemUi.ItemTitle><ItemUi.ItemDescription>Choose which updates you receive.</ItemUi.ItemDescription></ItemUi.ItemContent><ItemUi.ItemActions><SwitchUi.Switch aria-label="Notifications" defaultChecked /></ItemUi.ItemActions></ItemUi.Item>
      </ItemUi.ItemGroup>
    </DemoSurface>
  )
}

function KbdDemo() {
  return <DemoSurface><div className="flex items-center gap-2 text-sm">Open command palette <KbdUi.KbdGroup><KbdUi.Kbd>⌘</KbdUi.Kbd><KbdUi.Kbd>K</KbdUi.Kbd></KbdUi.KbdGroup></div></DemoSurface>
}

function LabelDemo() {
  return <DemoSurface><div className="grid gap-2"><LabelUi.Label htmlFor="story-email">Email</LabelUi.Label><InputUi.Input id="story-email" type="email" placeholder="name@example.com" /></div></DemoSurface>
}

function MenubarDemo() {
  return (
    <DemoSurface>
      <MenubarUi.Menubar>
        <MenubarUi.MenubarMenu><MenubarUi.MenubarTrigger>File</MenubarUi.MenubarTrigger><MenubarUi.MenubarContent><MenubarUi.MenubarItem>New project<MenubarUi.MenubarShortcut>⌘N</MenubarUi.MenubarShortcut></MenubarUi.MenubarItem><MenubarUi.MenubarSeparator /><MenubarUi.MenubarItem>Archive</MenubarUi.MenubarItem></MenubarUi.MenubarContent></MenubarUi.MenubarMenu>
        <MenubarUi.MenubarMenu><MenubarUi.MenubarTrigger>View</MenubarUi.MenubarTrigger><MenubarUi.MenubarContent><MenubarUi.MenubarCheckboxItem checked>Sidebar</MenubarUi.MenubarCheckboxItem></MenubarUi.MenubarContent></MenubarUi.MenubarMenu>
      </MenubarUi.Menubar>
    </DemoSurface>
  )
}

function NativeSelectDemo() {
  return <DemoSurface><NativeSelectUi.NativeSelect defaultValue="product" aria-label="Team"><NativeSelectUi.NativeSelectOption value="design">Design</NativeSelectUi.NativeSelectOption><NativeSelectUi.NativeSelectOption value="engineering">Engineering</NativeSelectUi.NativeSelectOption><NativeSelectUi.NativeSelectOption value="product">Product</NativeSelectUi.NativeSelectOption></NativeSelectUi.NativeSelect></DemoSurface>
}

function NavigationMenuDemo() {
  return (
    <DemoSurface>
      <NavigationMenuUi.NavigationMenu>
        <NavigationMenuUi.NavigationMenuList>
          <NavigationMenuUi.NavigationMenuItem><NavigationMenuUi.NavigationMenuLink href="#" variant="trigger">Overview</NavigationMenuUi.NavigationMenuLink></NavigationMenuUi.NavigationMenuItem>
          <NavigationMenuUi.NavigationMenuItem><NavigationMenuUi.NavigationMenuTrigger>Resources</NavigationMenuUi.NavigationMenuTrigger><NavigationMenuUi.NavigationMenuContent><Wrapper width="reading" gap="sm" padding="sm"><NavigationMenuUi.NavigationMenuLink href="#" variant="card">Documentation</NavigationMenuUi.NavigationMenuLink><NavigationMenuUi.NavigationMenuLink href="#" variant="card">Examples</NavigationMenuUi.NavigationMenuLink></Wrapper></NavigationMenuUi.NavigationMenuContent></NavigationMenuUi.NavigationMenuItem>
        </NavigationMenuUi.NavigationMenuList>
      </NavigationMenuUi.NavigationMenu>
    </DemoSurface>
  )
}

function PaginationDemo() {
  return <DemoSurface><PaginationUi.Pagination><PaginationUi.PaginationContent><PaginationUi.PaginationItem><PaginationUi.PaginationPrevious href="#" /></PaginationUi.PaginationItem><PaginationUi.PaginationItem><PaginationUi.PaginationLink href="#" isActive>1</PaginationUi.PaginationLink></PaginationUi.PaginationItem><PaginationUi.PaginationItem><PaginationUi.PaginationLink href="#">2</PaginationUi.PaginationLink></PaginationUi.PaginationItem><PaginationUi.PaginationItem><PaginationUi.PaginationEllipsis /></PaginationUi.PaginationItem><PaginationUi.PaginationItem><PaginationUi.PaginationNext href="#" /></PaginationUi.PaginationItem></PaginationUi.PaginationContent></PaginationUi.Pagination></DemoSurface>
}

function PopoverDemo({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return <DemoSurface><PopoverUi.Popover defaultOpen={defaultOpen}><PopoverUi.PopoverTrigger asChild><ButtonUi.Button variant="outline">Open popover</ButtonUi.Button></PopoverUi.PopoverTrigger><PopoverUi.PopoverContent aria-label="Card dimensions"><PopoverUi.PopoverHeader><PopoverUi.PopoverTitle>Dimensions</PopoverUi.PopoverTitle><PopoverUi.PopoverDescription>Set the preferred card width.</PopoverUi.PopoverDescription></PopoverUi.PopoverHeader><InputUi.Input type="number" defaultValue="320" aria-label="Width" /></PopoverUi.PopoverContent></PopoverUi.Popover></DemoSurface>
}

function ProgressDemo() {
  return <DemoSurface><div className="grid gap-3"><ProgressUi.Progress value={68} aria-label="68 percent complete" /><span className="text-sm text-muted-foreground">68% complete</span></div></DemoSurface>
}

function RadioGroupDemo() {
  return <DemoSurface><Wrapper gap="sm"><RadioGroupUi.RadioGroup defaultValue="system">{['system', 'light', 'dark'].map((value) => <label className="flex items-center gap-3 text-sm capitalize" key={value}><RadioGroupUi.RadioGroupItem value={value} />{value}</label>)}</RadioGroupUi.RadioGroup></Wrapper></DemoSurface>
}

function ResizableDemo() {
  return <DemoSurface><Wrapper height="medium"><ResizableUi.ResizablePanelGroup variant="framed" orientation="horizontal"><ResizableUi.ResizablePanel defaultSize="35%"><div className="grid size-full place-items-center bg-muted/40 text-sm">Sidebar</div></ResizableUi.ResizablePanel><ResizableUi.ResizableHandle withHandle /><ResizableUi.ResizablePanel><div className="grid size-full place-items-center text-sm">Content</div></ResizableUi.ResizablePanel></ResizableUi.ResizablePanelGroup></Wrapper></DemoSurface>
}

function ScrollAreaDemo() {
  return <DemoSurface><Wrapper height="medium"><ScrollAreaUi.ScrollArea variant="framed"><div className="grid gap-3 p-4">{Array.from({ length: 12 }, (_, index) => <div className="border-b pb-3 text-sm" key={index}>Scrollable item {index + 1}</div>)}</div><ScrollAreaUi.ScrollBar /></ScrollAreaUi.ScrollArea></Wrapper></DemoSurface>
}

function SelectDemo({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return <DemoSurface><Wrapper width="wide"><SelectUi.Select defaultOpen={defaultOpen} defaultValue="product"><SelectUi.SelectTrigger aria-label="Team" tabIndex={defaultOpen ? -1 : undefined}><SelectUi.SelectValue placeholder="Choose a team" /></SelectUi.SelectTrigger><SelectUi.SelectContent><SelectUi.SelectGroup><SelectUi.SelectLabel>Teams</SelectUi.SelectLabel>{options.map((option) => <SelectUi.SelectItem key={option} value={option.toLowerCase()}>{option}</SelectUi.SelectItem>)}</SelectUi.SelectGroup></SelectUi.SelectContent></SelectUi.Select></Wrapper></DemoSurface>
}

function SeparatorDemo() {
  return <DemoSurface><div className="grid gap-4"><div><strong>Design system</strong><p className="text-sm text-muted-foreground">A consistent component language.</p></div><SeparatorUi.Separator /><div className="flex h-5 items-center gap-4 text-sm"><span>Overview</span><SeparatorUi.Separator orientation="vertical" /><span>Components</span><SeparatorUi.Separator orientation="vertical" /><span>Patterns</span></div></div></DemoSurface>
}

function SheetDemo({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return <DemoSurface><SheetUi.Sheet defaultOpen={defaultOpen}><SheetUi.SheetTrigger asChild><ButtonUi.Button variant="outline">Open sheet</ButtonUi.Button></SheetUi.SheetTrigger><SheetUi.SheetContent><SheetUi.SheetHeader><SheetUi.SheetTitle>Workspace settings</SheetUi.SheetTitle><SheetUi.SheetDescription>Manage preferences without leaving the page.</SheetUi.SheetDescription></SheetUi.SheetHeader><div className="grid gap-2 px-4"><LabelUi.Label htmlFor="sheet-name">Name</LabelUi.Label><InputUi.Input id="sheet-name" defaultValue="Design team" /></div><SheetUi.SheetFooter><SheetUi.SheetClose asChild><ButtonUi.Button>Save</ButtonUi.Button></SheetUi.SheetClose></SheetUi.SheetFooter></SheetUi.SheetContent></SheetUi.Sheet></DemoSurface>
}

function SidebarDemo() {
  return (
    <div className="h-[34rem] overflow-hidden rounded-xl border">
      <SidebarUi.SidebarProvider defaultOpen>
        <SidebarUi.Sidebar collapsible="icon" variant="inset">
          <SidebarUi.SidebarHeader><SidebarUi.SidebarInput placeholder="Search" /></SidebarUi.SidebarHeader>
          <SidebarUi.SidebarContent><SidebarUi.SidebarGroup><SidebarUi.SidebarGroupLabel>Workspace</SidebarUi.SidebarGroupLabel><SidebarUi.SidebarGroupContent><SidebarUi.SidebarMenu>{['Overview', 'Projects', 'Settings'].map((label, index) => <SidebarUi.SidebarMenuItem key={label}><SidebarUi.SidebarMenuButton isActive={index === 0}><span>{label.slice(0, 1)}</span><span>{label}</span></SidebarUi.SidebarMenuButton></SidebarUi.SidebarMenuItem>)}</SidebarUi.SidebarMenu></SidebarUi.SidebarGroupContent></SidebarUi.SidebarGroup></SidebarUi.SidebarContent>
          <SidebarUi.SidebarFooter><span className="px-2 text-xs text-muted-foreground">Storybook user</span></SidebarUi.SidebarFooter>
          <SidebarUi.SidebarRail />
        </SidebarUi.Sidebar>
        <SidebarUi.SidebarInset><header className="flex h-14 items-center gap-3 border-b px-4"><SidebarUi.SidebarTrigger /><strong>Overview</strong></header><div className="p-6 text-sm text-muted-foreground">Resize the viewport to inspect desktop and mobile behavior.</div></SidebarUi.SidebarInset>
      </SidebarUi.SidebarProvider>
    </div>
  )
}

function SkeletonDemo() {
  return <DemoSurface><div className="flex items-center gap-4"><SkeletonUi.Skeleton variant="avatar" /><div className="grid flex-1 gap-2"><div className="w-2/5"><SkeletonUi.Skeleton variant="text" /></div><div className="w-4/5"><SkeletonUi.Skeleton variant="text" /></div></div></div></DemoSurface>
}

function SliderDemo() {
  return <DemoSurface><SliderUi.Slider defaultValue={[25, 75]} max={100} step={1} aria-label="Range" /></DemoSurface>
}

function SonnerDemo() {
  return <DemoSurface><ButtonUi.Button onClick={() => toast.success('Changes saved')}>Show toast</ButtonUi.Button><SonnerUi.Toaster /></DemoSurface>
}

function SpinnerDemo() {
  return <DemoSurface><div className="flex items-center gap-3 text-sm"><SpinnerUi.Spinner />Loading workspace…</div></DemoSurface>
}

function SwitchDemo() {
  return <DemoSurface><div className="grid gap-4"><label className="flex items-center gap-3 text-sm"><SwitchUi.Switch defaultChecked />Notifications</label><label className="flex items-center gap-3 text-sm"><SwitchUi.Switch size="sm" />Compact control</label><label className="flex items-center gap-3 text-sm opacity-60"><SwitchUi.Switch disabled />Disabled</label></div></DemoSurface>
}

function TableDemo() {
  return <DemoSurface><TableUi.Table><TableUi.TableCaption>Recent projects</TableUi.TableCaption><TableUi.TableHeader><TableUi.TableRow><TableUi.TableHead>Project</TableUi.TableHead><TableUi.TableHead>Status</TableUi.TableHead><TableUi.TableHead align="right">Members</TableUi.TableHead></TableUi.TableRow></TableUi.TableHeader><TableUi.TableBody>{[['Website', 'Active', '6'], ['Mobile app', 'Draft', '3'], ['Research', 'Paused', '2']].map((row) => <TableUi.TableRow key={row[0]}><TableUi.TableCell variant="emphasis">{row[0]}</TableUi.TableCell><TableUi.TableCell><BadgeUi.Badge variant="outline">{row[1]}</BadgeUi.Badge></TableUi.TableCell><TableUi.TableCell align="right">{row[2]}</TableUi.TableCell></TableUi.TableRow>)}</TableUi.TableBody></TableUi.Table></DemoSurface>
}

function TabsDemo() {
  return <DemoSurface><TabsUi.Tabs defaultValue="overview"><TabsUi.TabsList><TabsUi.TabsTrigger value="overview">Overview</TabsUi.TabsTrigger><TabsUi.TabsTrigger value="activity">Activity</TabsUi.TabsTrigger><TabsUi.TabsTrigger value="settings" disabled>Settings</TabsUi.TabsTrigger></TabsUi.TabsList><TabsUi.TabsContent variant="panel" value="overview">Overview content</TabsUi.TabsContent><TabsUi.TabsContent variant="panel" value="activity">Activity content</TabsUi.TabsContent></TabsUi.Tabs></DemoSurface>
}

function TextareaDemo() {
  return <DemoSurface><div className="grid gap-3"><TextareaUi.Textarea aria-label="Description" placeholder="Write a short description" /><TextareaUi.Textarea aria-invalid aria-label="Invalid description" defaultValue="Invalid content" /><TextareaUi.Textarea aria-label="Disabled description" disabled placeholder="Disabled" /></div></DemoSurface>
}

function ToggleDemo() {
  return <DemoSurface><div className="flex gap-2"><ToggleUi.Toggle aria-label="Toggle bold">Bold</ToggleUi.Toggle><ToggleUi.Toggle aria-label="Toggle italic" variant="outline" defaultPressed>Italic</ToggleUi.Toggle><ToggleUi.Toggle aria-label="Disabled toggle" disabled>Disabled</ToggleUi.Toggle></div></DemoSurface>
}

function ToggleGroupDemo() {
  return <DemoSurface><ToggleGroupUi.ToggleGroup type="multiple" variant="outline" density="joined" defaultValue={['left']}><ToggleGroupUi.ToggleGroupItem value="left">Left</ToggleGroupUi.ToggleGroupItem><ToggleGroupUi.ToggleGroupItem value="center">Center</ToggleGroupUi.ToggleGroupItem><ToggleGroupUi.ToggleGroupItem value="right">Right</ToggleGroupUi.ToggleGroupItem></ToggleGroupUi.ToggleGroup></DemoSurface>
}

function TooltipDemo({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return <DemoSurface><TooltipUi.Tooltip defaultOpen={defaultOpen}><TooltipUi.TooltipTrigger asChild><ButtonUi.Button variant="outline">Hover or focus</ButtonUi.Button></TooltipUi.TooltipTrigger><TooltipUi.TooltipContent>Keyboard shortcut: ⌘K</TooltipUi.TooltipContent></TooltipUi.Tooltip></DemoSurface>
}

export const uiDemos = {
  accordion: AccordionDemo,
  alert: AlertDemo,
  'alert-dialog': AlertDialogDemo,
  'aspect-ratio': AspectRatioDemo,
  avatar: AvatarDemo,
  badge: BadgeDemo,
  breadcrumb: BreadcrumbDemo,
  button: ButtonDemo,
  'button-group': ButtonGroupDemo,
  calendar: CalendarDemo,
  card: CardDemo,
  carousel: CarouselDemo,
  chart: ChartDemo,
  checkbox: CheckboxDemo,
  collapsible: CollapsibleDemo,
  combobox: ComboboxDemo,
  command: CommandDemo,
  'context-menu': ContextMenuDemo,
  dialog: DialogDemo,
  direction: DirectionDemo,
  drawer: DrawerDemo,
  'dropdown-menu': DropdownMenuDemo,
  empty: EmptyDemo,
  field: FieldDemo,
  'hover-card': HoverCardDemo,
  input: InputDemo,
  'input-group': InputGroupDemo,
  'input-otp': InputOtpDemo,
  item: ItemDemo,
  kbd: KbdDemo,
  label: LabelDemo,
  menubar: MenubarDemo,
  'native-select': NativeSelectDemo,
  'navigation-menu': NavigationMenuDemo,
  pagination: PaginationDemo,
  popover: PopoverDemo,
  progress: ProgressDemo,
  'radio-group': RadioGroupDemo,
  resizable: ResizableDemo,
  'scroll-area': ScrollAreaDemo,
  select: SelectDemo,
  separator: SeparatorDemo,
  sheet: SheetDemo,
  sidebar: SidebarDemo,
  skeleton: SkeletonDemo,
  slider: SliderDemo,
  sonner: SonnerDemo,
  spinner: SpinnerDemo,
  switch: SwitchDemo,
  table: TableDemo,
  tabs: TabsDemo,
  textarea: TextareaDemo,
  toggle: ToggleDemo,
  'toggle-group': ToggleGroupDemo,
  tooltip: TooltipDemo,
} as const
