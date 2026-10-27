import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'orca-fork.claudePanel.v1'

type PanelState = {
  groupIdByWorktree: Record<string, string>
  editorRatioByWorktree: Record<string, number>
  hidden: boolean
}

const EMPTY: PanelState = { groupIdByWorktree: {}, editorRatioByWorktree: {}, hidden: false }

let state: PanelState = load()
const listeners = new Set<() => void>()

function load(): PanelState {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (!raw) {
      return EMPTY
    }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return EMPTY
    }
    const groups: unknown = Reflect.get(parsed, 'groupIdByWorktree')
    const ratios: unknown = Reflect.get(parsed, 'editorRatioByWorktree')
    return {
      groupIdByWorktree: stringRecord(groups),
      editorRatioByWorktree: numberRecord(ratios),
      hidden: Reflect.get(parsed, 'hidden') === true
    }
  } catch {
    return EMPTY
  }
}

function stringRecord(value: unknown): Record<string, string> {
  return value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).filter(([, v]) => typeof v === 'string'))
    : {}
}

function numberRecord(value: unknown): Record<string, number> {
  return value && typeof value === 'object'
    ? Object.fromEntries(
        Object.entries(value).filter(([, v]) => typeof v === 'number' && v >= 0 && v <= 1)
      )
    : {}
}

function commit(next: PanelState): void {
  state = next
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage can be unavailable (private mode, tests); the in-memory state still works.
  }
  for (const listener of listeners) {
    listener()
  }
}

export function readClaudePanelGroupId(worktreeId: string): string | null {
  return state.groupIdByWorktree[worktreeId] ?? null
}

export function setClaudePanelGroupId(worktreeId: string, groupId: string | null): void {
  const groups = { ...state.groupIdByWorktree }
  if (groupId) {
    groups[worktreeId] = groupId
  } else {
    delete groups[worktreeId]
  }
  commit({ ...state, groupIdByWorktree: groups })
}

export function isClaudePanelHidden(): boolean {
  return state.hidden
}

export function setClaudePanelHidden(hidden: boolean): void {
  commit({ ...state, hidden })
}

export function readSavedEditorRatio(worktreeId: string): number | null {
  return state.editorRatioByWorktree[worktreeId] ?? null
}

export function saveEditorRatio(worktreeId: string, ratio: number): void {
  commit({
    ...state,
    editorRatioByWorktree: { ...state.editorRatioByWorktree, [worktreeId]: ratio }
  })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useClaudePanelState(): Readonly<PanelState> {
  return useSyncExternalStore(subscribe, () => state)
}

export function resetClaudePanelRegistryForTests(): void {
  state = EMPTY
  listeners.clear()
}
