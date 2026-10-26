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
const chatWorktrees = new Map<string, string>()
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

/** An unmounted editor (e.g. its tab hidden for the chat) keeps its context; only the owner may freeze it. */
export function freezeEditorContextEntry(worktreeId: string, ownerId: string): void {
  const entry = entries.get(worktreeId)
  if (entry?.ownerId !== ownerId) {
    return
  }
  const markers = entry.readMarkers()
  entries.set(worktreeId, { ...entry, readMarkers: () => markers })
  emit()
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

/** Structured chats bind their worktree so the chip can show that worktree's editor. */
export function bindEditorContextChatWorktree(scopeKey: string, worktreeId: string): void {
  if (chatWorktrees.get(scopeKey) !== worktreeId) {
    chatWorktrees.set(scopeKey, worktreeId)
    emit()
  }
}

export function useEditorContextChatWorktree(scopeKey: string): string | undefined {
  return useSyncExternalStore(subscribe, () => chatWorktrees.get(scopeKey))
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
  chatWorktrees.clear()
  listeners.clear()
}
