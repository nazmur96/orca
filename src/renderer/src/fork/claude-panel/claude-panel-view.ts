import { useAppStore } from '@/store'
import { isClaudePanelHidden, readClaudeView, setClaudeView } from './claude-panel-registry'
import { findGroupSplit } from './claude-panel-layout'
import { swapSplitAt } from './claude-panel-swap'
import { liveClaudePanelGroupId } from './ensure-claude-panel'

/** Agents view puts the Claude chat first (left), IDE view puts it last (right). */
export function applyClaudeView(worktreeId: string): void {
  if (isClaudePanelHidden()) {
    return
  }
  const panel = liveClaudePanelGroupId(worktreeId)
  const layout = useAppStore.getState().layoutByWorktree[worktreeId]
  const split = panel && layout ? findGroupSplit(layout, panel) : null
  if (!split) {
    return
  }
  const wanted = readClaudeView(worktreeId) === 'agents' ? 'first' : 'second'
  if (split.side === wanted) {
    return
  }
  // Fork-only layout writer: Orca has no action that swaps a split's sides.
  useAppStore.setState((s) => {
    const current = s.layoutByWorktree[worktreeId]
    return current
      ? {
          layoutByWorktree: {
            ...s.layoutByWorktree,
            [worktreeId]: swapSplitAt(current, split.path)
          }
        }
      : s
  })
}

export function toggleClaudeView(worktreeId: string): void {
  setClaudeView(worktreeId, readClaudeView(worktreeId) === 'agents' ? 'editor' : 'agents')
  applyClaudeView(worktreeId)
}
