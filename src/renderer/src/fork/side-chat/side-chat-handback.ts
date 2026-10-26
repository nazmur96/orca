import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import {
  appendToNativeChatComposerDraft,
  structuredAgentSessionDraftScopeKey
} from '@/components/native-chat/native-chat-composer-draft-store'
import { structuredAgentSessionPaneKey } from '../../../../shared/structured-agent-session-projection'
import { formatSideChatHandback } from './side-chat-handback-format'
import { readSideChatLink } from './side-chat-registry'

/** Quote the side chat's last reply into the main chat's composer; the user decides to send it. */
export function handBackToMainChat(sideTabId: string, sideSessionId: string): boolean {
  const link = readSideChatLink(sideSessionId)
  if (!link) {
    return false
  }
  const state = useAppStore.getState()
  const paneKey = structuredAgentSessionPaneKey(sideTabId, sideSessionId)
  const reply = state.agentStatusByPaneKey[paneKey]?.lastAssistantMessage?.trim()
  if (!reply) {
    toast(
      translate(
        'components.native-chat.sideChat.noReply',
        'The side chat has no reply to hand back yet.'
      )
    )
    return false
  }
  appendToNativeChatComposerDraft(structuredAgentSessionDraftScopeKey(link.mainSessionId), {
    text: formatSideChatHandback(reply)
  })
  state.activateTab(link.mainTabId, { worktreeId: link.worktreeId })
  return true
}
