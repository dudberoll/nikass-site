import {
  MessageScroller as PrimitiveMessageScroller,
} from '@shadcn/react/message-scroller'
import type { ComponentProps } from 'react'

type WithoutStyle<Props> = Omit<Props, 'className' | 'style'>

function Root(props: WithoutStyle<ComponentProps<typeof PrimitiveMessageScroller.Root>>) {
  return <PrimitiveMessageScroller.Root {...props} className="message-scroller-root" />
}

function Viewport(props: WithoutStyle<ComponentProps<typeof PrimitiveMessageScroller.Viewport>>) {
  return <PrimitiveMessageScroller.Viewport {...props} className="message-scroller-viewport" />
}

function Content(props: WithoutStyle<Omit<ComponentProps<typeof PrimitiveMessageScroller.Content>, 'spacerClassName'>>) {
  return <PrimitiveMessageScroller.Content {...props} className="message-scroller-content" />
}

function Item(props: WithoutStyle<ComponentProps<typeof PrimitiveMessageScroller.Item>>) {
  return <PrimitiveMessageScroller.Item {...props} className="message-scroller-row" />
}

function Button(props: WithoutStyle<Omit<ComponentProps<typeof PrimitiveMessageScroller.Button>, 'render'>>) {
  return <PrimitiveMessageScroller.Button {...props} className="message-scroller-end-button" />
}

export const MessageScroller = {
  Provider: PrimitiveMessageScroller.Provider,
  Root,
  Viewport,
  Content,
  Item,
  Button,
}
