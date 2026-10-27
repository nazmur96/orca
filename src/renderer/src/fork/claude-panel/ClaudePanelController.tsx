import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { getShortcutPlatform } from '@/lib/shortcut-platform'
import { keybindingMatchesAction } from '../../../../shared/keybindings'
import { ensureClaudePanel } from './ensure-claude-panel'
import { runClaudePanelToggle, syncClaudePanelVisibility } from './claude-panel-actions'
import { applyClaudeView, toggleClaudeView } from './claude-panel-view'

/** Mounted once: gives each workspace its Claude panel and owns Ctrl+I. */
export function ClaudePanelController(): null {
  const worktreeId = useAppStore((s) => s.activeWorktreeId)
  const hasLayout = useAppStore((s) =>
    worktreeId ? Boolean(s.layoutByWorktree[worktreeId]) : false
  )

  useEffect(() => {
    if (!worktreeId || !hasLayout) {
      return undefined
    }
    ensureClaudePanel(worktreeId)
    syncClaudePanelVisibility(worktreeId)
    applyClaudeView(worktreeId)
    // A new panel's moved-out groups are pruned a tick later, rebuilding the split.
    const timer = setTimeout(() => applyClaudeView(worktreeId), 50)
    return () => clearTimeout(timer)
  }, [worktreeId, hasLayout])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const state = useAppStore.getState()
      const worktree = state.activeWorktreeId
      if (event.repeat || !worktree) {
        return
      }
      const platform = getShortcutPlatform()
      const run = keybindingMatchesAction('claudePanel.toggle', event, platform, state.keybindings)
        ? runClaudePanelToggle
        : keybindingMatchesAction('claudePanel.toggleView', event, platform, state.keybindings)
          ? toggleClaudeView
          : null
      if (run) {
        event.preventDefault()
        event.stopPropagation()
        run(worktree)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  return null
}
