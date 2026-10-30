import { MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'
import type { SideChatSource } from './open-side-chat'
import { addTextToSideChat } from './add-to-side-chat'
import { useSideChatLink } from './side-chat-registry'

function label(): string {
  return translate('components.native-chat.sideChat.addSelection', 'Add to side chat')
}

/** A side chat's own selections go to its own composer; only main chats offer one. */
function useOffersSideChat(source: SideChatSource | undefined): source is SideChatSource {
  return useSideChatLink(source?.sessionId ?? '') === null && source !== undefined
}

/** Beside "Add to chat" in the selection popover. */
export function AddToSideChatButton({
  source,
  text,
  onDone
}: {
  source: SideChatSource | undefined
  text: string
  onDone: () => void
}): React.JSX.Element | null {
  if (!useOffersSideChat(source)) {
    return null
  }
  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={() => {
        void addTextToSideChat(source, text)
        onDone()
      }}
    >
      <MessageSquarePlus />
      {label()}
    </Button>
  )
}

/** Beside "Add to chat" in the right-click menu. */
export function AddToSideChatMenuItem({
  source,
  text
}: {
  source: SideChatSource | undefined
  text: string
}): React.JSX.Element | null {
  if (!useOffersSideChat(source)) {
    return null
  }
  return (
    <DropdownMenuItem onSelect={() => void addTextToSideChat(source, text)}>
      <MessageSquarePlus />
      {label()}
    </DropdownMenuItem>
  )
}
