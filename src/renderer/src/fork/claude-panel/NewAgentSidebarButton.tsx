import { Plus } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { isClaudePanelHidden } from './claude-panel-registry'
import { newClaudeChatInPanel, showClaudePanel } from './claude-panel-actions'
import { ensureClaudePanel, liveClaudePanelGroupId } from './ensure-claude-panel'

function startNewAgent(worktreeId: string): void {
  if (isClaudePanelHidden()) {
    showClaudePanel(worktreeId)
  }
  if (liveClaudePanelGroupId(worktreeId)) {
    newClaudeChatInPanel(worktreeId)
  } else {
    ensureClaudePanel(worktreeId)
  }
}

/** Cursor's "New agent": a fresh Claude chat in the current workspace's panel. */
export function NewAgentSidebarButton(): React.JSX.Element {
  const worktreeId = useAppStore((s) => s.activeWorktreeId)
  return (
    <button
      type="button"
      disabled={!worktreeId}
      onClick={() => {
        if (worktreeId) {
          startNewAgent(worktreeId)
        }
      }}
      className="mb-1 flex w-full items-center justify-center gap-1.5 rounded-md border border-worktree-sidebar-border px-2 py-1.5 text-[13px] font-medium text-worktree-sidebar-foreground transition-colors hover:bg-worktree-sidebar-foreground/8 disabled:opacity-50"
    >
      <Plus className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      <span>{translate('components.claudePanel.newAgent', 'New agent')}</span>
    </button>
  )
}
