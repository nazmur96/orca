import { useCallback, useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { selectKnownWorktreeById } from '@/store/selectors'
import type { ClaudeEdit } from '../../../../shared/fork-claude-edits'
import { publishClaudeEdits } from './claude-edits-store'

const POLL_MS = 2500

export type ClaudeEditsState = {
  workspacePath: string | null
  edits: ClaudeEdit[]
  resolve: (action: 'keep' | 'undo', paths?: string[]) => Promise<void>
  /** Save a file after reverting some of Claude's blocks in the review diff. */
  writeReviewed: (path: string, content: string) => Promise<void>
}

/** Pending Claude edits for a workspace, refreshed while the panel is on screen. */
export function useClaudeEdits(worktreeId: string): ClaudeEditsState {
  const workspacePath = useAppStore((s) => selectKnownWorktreeById(s, worktreeId)?.path ?? null)
  const [edits, setEdits] = useState<ClaudeEdit[]>([])

  const refresh = useCallback(async (): Promise<void> => {
    if (!workspacePath) {
      setEdits([])
      return
    }
    try {
      const next = await window.api.aiVault.listClaudeEdits(workspacePath)
      setEdits(next)
      publishClaudeEdits(workspacePath, next)
    } catch {
      setEdits([])
    }
  }, [workspacePath])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh()
      }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  const resolve = useCallback(
    async (action: 'keep' | 'undo', paths?: string[]): Promise<void> => {
      if (!workspacePath) {
        return
      }
      await window.api.aiVault.resolveClaudeEdits({
        workspacePath,
        action,
        ...(paths ? { paths } : {})
      })
      await refresh()
    },
    [refresh, workspacePath]
  )

  const writeReviewed = useCallback(
    async (path: string, content: string): Promise<void> => {
      if (!workspacePath) {
        return
      }
      await window.api.aiVault.writeReviewedClaudeEdit({ workspacePath, path, content })
      await refresh()
    },
    [refresh, workspacePath]
  )

  return { workspacePath, edits, resolve, writeReviewed }
}
