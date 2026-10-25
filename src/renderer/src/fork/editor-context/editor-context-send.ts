import { formatEditorContextBlock } from './editor-context-block'
import { buildEditorContextSnapshot } from './editor-context-snapshot'
import {
  readEditorContextChat,
  readEditorContextEntry,
  updateEditorContextChat
} from './editor-context-store'

const NO_COMMIT = (): void => {}

/** State changes only on commit, so a refused send re-attaches the same context next time. */
export function prepareEditorContext(
  scopeKey: string,
  worktreeId: string | undefined,
  text: string
): { text: string; commit: () => void } {
  const chat = readEditorContextChat(scopeKey)
  if (chat.disabled || !worktreeId) {
    return { text, commit: NO_COMMIT }
  }
  if (chat.skipNext) {
    return { text, commit: () => updateEditorContextChat(scopeKey, { skipNext: false }) }
  }
  const entry = readEditorContextEntry(worktreeId)
  if (!entry) {
    return { text, commit: NO_COMMIT }
  }
  const snapshot = buildEditorContextSnapshot(entry, entry.readMarkers())
  const key = JSON.stringify(snapshot)
  if (key === chat.lastSent) {
    return { text, commit: NO_COMMIT }
  }
  return {
    text: `${formatEditorContextBlock(snapshot)}\n${text}`,
    commit: () => updateEditorContextChat(scopeKey, { lastSent: key })
  }
}
