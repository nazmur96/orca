import { useAppStore } from '@/store'
import {
  appendToNativeChatComposerDraft,
  structuredAgentSessionDraftScopeKey
} from '@/components/native-chat/native-chat-composer-draft-store'
import { formatNativeChatQuote } from '@/components/native-chat/native-chat-quote-selection'
import { openSideChat, type SideChatSource } from './open-side-chat'
import { sideChatsOf } from './side-chat-registry'

/** The newest side chat of this chat whose tab is still open. */
function openSideChatTab(source: SideChatSource): { tabId: string; sessionId: string } | null {
  const tabs = useAppStore.getState().unifiedTabsByWorktree[source.worktreeId] ?? []
  for (const sessionId of sideChatsOf(source.sessionId).toReversed()) {
    const tab = tabs.find((candidate) => candidate.entityId === sessionId)
    if (tab) {
      return { tabId: tab.id, sessionId }
    }
  }
  return null
}

/** Quote text into the chat's open side chat, opening one first when it has none. */
export async function addTextToSideChat(source: SideChatSource, text: string): Promise<boolean> {
  const open = openSideChatTab(source)
  const sessionId = open?.sessionId ?? (await openSideChat(source))
  if (!sessionId) {
    return false
  }
  appendToNativeChatComposerDraft(structuredAgentSessionDraftScopeKey(sessionId), {
    text: formatNativeChatQuote(text)
  })
  if (open) {
    useAppStore.getState().activateTab(open.tabId, { worktreeId: source.worktreeId })
  }
  return true
}
