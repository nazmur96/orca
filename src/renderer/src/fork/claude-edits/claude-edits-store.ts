import type { ClaudeEdit } from '../../../../shared/fork-claude-edits'

const byWorkspace = new Map<string, readonly ClaudeEdit[]>()
const listeners = new Set<() => void>()

/** The review bar's latest poll, shared with editors so they can mark Claude's lines. */
export function publishClaudeEdits(workspacePath: string, edits: readonly ClaudeEdit[]): void {
  byWorkspace.set(workspacePath, edits)
  for (const listener of listeners) {
    listener()
  }
}

export function readClaudeEdit(workspacePath: string, relativePath: string): ClaudeEdit | null {
  return byWorkspace.get(workspacePath)?.find((edit) => edit.path === relativePath) ?? null
}

export function subscribeClaudeEdits(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
