import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { readClaudePanelGroupId } from '../claude-panel/claude-panel-registry'
import { pickNonPanelGroupId } from '../claude-panel/claude-panel-layout'
import { commandFromCodeBlock, isRunnableShellLanguage } from './chat-command'

/** A new terminal in the workbench (never the Claude column) that starts by running the command. */
export function runCommandInWorkbench(worktreeId: string, command: string): void {
  const state = useAppStore.getState()
  const groups = state.groupsByWorktree[worktreeId] ?? []
  const panel = readClaudePanelGroupId(worktreeId)
  const targetGroupId = panel
    ? (pickNonPanelGroupId(groups, state.unifiedTabsByWorktree[worktreeId] ?? [], panel) ??
      undefined)
    : state.activeGroupIdByWorktree[worktreeId]
  state.createTab(worktreeId, targetGroupId ?? undefined, undefined, {
    pendingStartup: { command }
  })
}

/** Cursor's "Run" on shell code blocks in Claude's replies. */
export function RunInTerminalButton({
  code,
  language
}: {
  code: string
  language: string | undefined
}): React.JSX.Element | null {
  const worktreeId = useAppStore((s) => s.activeWorktreeId)
  const command = isRunnableShellLanguage(language) ? commandFromCodeBlock(code) : null
  if (!command || !worktreeId) {
    return null
  }
  const label = translate('components.native-chat.runInTerminal', 'Run in terminal')
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      title={label}
      onClick={() => runCommandInWorkbench(worktreeId, command)}
    >
      <Play className="size-3.5" aria-hidden />
    </Button>
  )
}
