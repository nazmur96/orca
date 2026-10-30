import { useSyncExternalStore } from 'react'

export type SideChatLink = {
  mainTabId: string
  mainSessionId: string
  worktreeId: string
  /** Cleared once the side chat's composer has switched it to Ask for approval. */
  askModePending: boolean
}

// In memory only: after a restart a side chat is an ordinary chat without hand-back.
const links = new Map<string, SideChatLink>()
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function linkSideChat(sideSessionId: string, link: SideChatLink): void {
  links.set(sideSessionId, link)
  for (const listener of listeners) {
    listener()
  }
}

export function markSideChatAskModeApplied(sideSessionId: string): void {
  const link = links.get(sideSessionId)
  if (link?.askModePending) {
    linkSideChat(sideSessionId, { ...link, askModePending: false })
  }
}

export function readSideChatLink(sideSessionId: string): SideChatLink | null {
  return links.get(sideSessionId) ?? null
}

/** Side chats of a main chat, oldest first. */
export function sideChatsOf(mainSessionId: string): string[] {
  return [...links].filter(([, link]) => link.mainSessionId === mainSessionId).map(([id]) => id)
}

export function useSideChatLink(sideSessionId: string): SideChatLink | null {
  const read = (): ReturnType<typeof readSideChatLink> => readSideChatLink(sideSessionId)
  return useSyncExternalStore(subscribe, read, read)
}

export function resetSideChatRegistryForTests(): void {
  links.clear()
  listeners.clear()
}
