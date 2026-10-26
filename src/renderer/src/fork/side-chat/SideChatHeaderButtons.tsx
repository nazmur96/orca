import { useCallback, useEffect } from 'react'
import { MessageSquarePlus, Reply } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { addAppKeyListener, removeAppKeyListener } from '@/lib/app-keyboard-router'
import { getShortcutPlatform } from '@/lib/shortcut-platform'
import { keybindingMatchesAction } from '../../../../shared/keybindings'
import { openSideChat } from './open-side-chat'
import { handBackToMainChat } from './side-chat-handback'
import { useSideChatLink } from './side-chat-registry'

function HeaderButton({
  label,
  onClick,
  children
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="pane-title"
          size="icon-xs"
          aria-label={label}
          onClick={(event) => {
            event.stopPropagation()
            onClick()
          }}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/** Side chat and hand-back controls for a Claude chat pane; Mod+; opens a side chat while focused. */
export function SideChatHeaderButtons({
  tabId,
  worktreeId,
  groupId,
  sessionId,
  agent,
  focused
}: {
  tabId: string
  worktreeId: string
  groupId: string
  sessionId: string
  agent: string | undefined
  focused: boolean
}): React.JSX.Element | null {
  const link = useSideChatLink(sessionId)
  const isClaude = agent === 'claude'
  const open = useCallback(() => {
    void openSideChat({ tabId, worktreeId, groupId, sessionId })
  }, [tabId, worktreeId, groupId, sessionId])

  useEffect(() => {
    if (!focused || !isClaude) {
      return
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      const keybindings = useAppStore.getState().keybindings
      if (
        event.defaultPrevented ||
        event.repeat ||
        !keybindingMatchesAction('chat.openSideChat', event, getShortcutPlatform(), keybindings)
      ) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      open()
    }
    addAppKeyListener('keydown', onKeyDown)
    return () => removeAppKeyListener('keydown', onKeyDown)
  }, [focused, isClaude, open])

  if (!isClaude) {
    return null
  }
  return (
    <>
      {link ? (
        <HeaderButton
          label={translate('components.native-chat.sideChat.handBack', 'Hand to main agent')}
          onClick={() => handBackToMainChat(tabId, sessionId)}
        >
          <Reply className="size-3" />
        </HeaderButton>
      ) : null}
      <HeaderButton
        label={translate('components.native-chat.sideChat.open', 'Side chat')}
        onClick={open}
      >
        <MessageSquarePlus className="size-3" />
      </HeaderButton>
    </>
  )
}
