import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { editorShortcutMatches } from '@/components/editor/editor-shortcuts'
import {
  appendToNativeChatComposerDraft,
  structuredAgentSessionDraftScopeKey
} from '@/components/native-chat/native-chat-composer-draft-store'
import { isStructuredTab } from '../../../../shared/structured-agent-session-tab'
import { formatSelectionQuote } from './editor-context-block'
import { readEditorContextEntry } from './editor-context-store'

export function pickClaudeChatTab<
  T extends { id: string; entityId: string; contentType?: string; agentSessionAgent?: unknown }
>(tabs: readonly T[]): T | null {
  const claudeTabs = tabs.filter(
    (tab) => isStructuredTab(tab) && tab.agentSessionAgent === 'claude'
  )
  return claudeTabs.at(-1) ?? null
}

function addSelectionToChat(worktreeId: string): boolean {
  const entry = readEditorContextEntry(worktreeId)
  if (!entry?.selection) {
    return false
  }
  const state = useAppStore.getState()
  const tab = pickClaudeChatTab(state.unifiedTabsByWorktree[worktreeId] ?? [])
  if (!tab) {
    toast(
      translate(
        'components.native-chat.editorContext.noClaudeChat',
        'Open a Claude chat in this workspace to add the selection.'
      )
    )
    return true
  }
  appendToNativeChatComposerDraft(structuredAgentSessionDraftScopeKey(tab.entityId), {
    text: formatSelectionQuote(entry.file, entry.language, entry.selection)
  })
  state.activateTab(tab.id, { worktreeId })
  return true
}

export function installAddSelectionToChatShortcut(
  target: HTMLElement,
  worktreeId: string
): () => void {
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || !editorShortcutMatches('editor.addSelectionToChat', event)) {
      return
    }
    if (addSelectionToChat(worktreeId)) {
      event.preventDefault()
      event.stopPropagation()
    }
  }
  target.addEventListener('keydown', handleKeyDown, true)
  return () => target.removeEventListener('keydown', handleKeyDown, true)
}
