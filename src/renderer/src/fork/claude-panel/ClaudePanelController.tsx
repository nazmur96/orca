import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { getShortcutPlatform } from '@/lib/shortcut-platform'
import { keybindingMatchesAction } from '../../../../shared/keybindings'
import { ensureClaudePanel } from './ensure-claude-panel'
import { runClaudePanelToggle, syncClaudePanelVisibility } from './claude-panel-actions'

/** Mounted once: gives each workspace its Claude panel and owns Ctrl+I. */
export function ClaudePanelController(): null {
  const worktreeId = useAppStore((s) => s.activeWorktreeId)
  const hasLayout = useAppStore((s) =>
    worktreeId ? Boolean(s.layoutByWorktree[worktreeId]) : false
  )

  useEffect(() => {
    if (worktreeId && hasLayout) {
      ensureClaudePanel(worktreeId)
      syncClaudePanelVisibility(worktreeId)
    }
  }, [worktreeId, hasLayout])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const state = useAppStore.getState()
      if (
        event.repeat ||
        !state.activeWorktreeId ||
        !keybindingMatchesAction(
          'claudePanel.toggle',
          event,
          getShortcutPlatform(),
          state.keybindings
        )
      ) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      runClaudePanelToggle(state.activeWorktreeId)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  return null
}
