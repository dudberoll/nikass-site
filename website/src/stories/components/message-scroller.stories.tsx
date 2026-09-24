import type { Meta, StoryObj } from '@storybook/react-vite'
import { MessageScroller } from '../../components/MessageScroller'

const meta = {
  title: 'Components/Message Scroller',
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Conversation: Story = {
  render: () => (
    <div className="message-scroller-card">
      <MessageScroller.Provider defaultScrollPosition="last-anchor">
        <MessageScroller.Root>
          <MessageScroller.Viewport>
            <MessageScroller.Content>
              <MessageScroller.Item messageId="story-user" scrollAnchor>
                <div className="message-scroller-message is-user"><div className="message-scroller-bubble"><p>How do I choose a station for home use?</p></div></div>
              </MessageScroller.Item>
              <MessageScroller.Item messageId="story-assistant">
                <div className="message-scroller-message is-assistant"><div className="message-scroller-avatar" aria-hidden="true">N</div><div className="message-scroller-bubble"><p>Start with the devices you need to power and how long they should run.</p></div></div>
              </MessageScroller.Item>
            </MessageScroller.Content>
          </MessageScroller.Viewport>
          <MessageScroller.Button direction="end" aria-label="К последнему сообщению">↓</MessageScroller.Button>
        </MessageScroller.Root>
      </MessageScroller.Provider>
    </div>
  ),
}
