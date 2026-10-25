import { useSyncExternalStore } from 'react'
import type { EditorContextEntry } from './editor-context-types'

export type EditorContextChatState = {
  lastSent: string | null
  skipNext: boolean
  disabled: boolean
}

const DEFAULT_CHAT: EditorContextChatState = { lastSent: null, skipNext: false, disabled: false }

const entries = new Map<string, EditorContextEntry>()
const chats = new Map<string, EditorContextChatState>()
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setEditorContextEntry(worktreeId: string, entry: EditorContextEntry): void {
  entries.set(worktreeId, entry)
  emit()
}

/** Only the editor that owns the entry may clear it, so closing a background tab keeps the focused one. */
export function clearEditorContextEntry(worktreeId: string, owner: object): void {
  if (entries.get(worktreeId)?.owner === owner) {
    entries.delete(worktreeId)
    emit()
  }
}

export function readEditorContextEntry(worktreeId: string): EditorContextEntry | null {
  return entries.get(worktreeId) ?? null
}

export function readEditorContextChat(scopeKey: string): EditorContextChatState {
  return chats.get(scopeKey) ?? DEFAULT_CHAT
}

export function updateEditorContextChat(
  scopeKey: string,
  patch: Partial<EditorContextChatState>
): void {
  chats.set(scopeKey, { ...readEditorContextChat(scopeKey), ...patch })
  emit()
}

export function useEditorContextEntry(worktreeId: string | undefined): EditorContextEntry | null {
  return useSyncExternalStore(subscribe, () =>
    worktreeId ? readEditorContextEntry(worktreeId) : null
  )
}

export function useEditorContextChat(scopeKey: string): EditorContextChatState {
  return useSyncExternalStore(subscribe, () => readEditorContextChat(scopeKey))
}

export function resetEditorContextStoreForTests(): void {
  entries.clear()
  chats.clear()
  listeners.clear()
}
