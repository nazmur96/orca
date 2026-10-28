import {
  Code2,
  History,
  Maximize2,
  MessagesSquare,
  Minimize2,
  PanelRightClose,
  SquarePen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { openAgentSessionHistoryModal } from '@/components/right-sidebar/agent-session-history-modal'
import { ClaudeHandoffButton } from '../handoff/ClaudeHandoffButton'
import { useClaudePanelState } from './claude-panel-registry'
import { toggleClaudeView } from './claude-panel-view'
import {
  hideClaudePanel,
  isClaudePanelMaximized,
  newClaudeChatInPanel,
  toggleMaximizeClaudePanel
} from './claude-panel-actions'

function HeaderButton(props: {
  label: string
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
    >
      {props.children}
    </Button>
  )
}

/** Cursor-style controls on the Claude panel's tab strip; renders nothing on other groups. */
export function ClaudePanelHeaderActions({
  worktreeId,
  groupId
}: {
  worktreeId: string
  groupId: string
}): React.JSX.Element | null {
  const panelState = useClaudePanelState()
  const activeTabId = useAppStore(
    (s) =>
      s.groupsByWorktree?.[worktreeId]?.find((group) => group.id === groupId)?.activeTabId ?? null
  )
  // Re-read on layout changes so the maximize icon follows drags of the divider.
  useAppStore((s) => s.layoutByWorktree?.[worktreeId])
  if (panelState.groupIdByWorktree[worktreeId] !== groupId) {
    return null
  }
  const agentsView = (panelState.viewByWorktree[worktreeId] ?? 'agents') === 'agents'
  const maximized = isClaudePanelMaximized(worktreeId)
  return (
    <div className="flex items-center gap-0.5">
      <ClaudeHandoffButton worktreeId={worktreeId} tabId={activeTabId} />
      <HeaderButton
        label={
          agentsView
            ? translate('components.claudePanel.ideView', 'Open the IDE view (Ctrl+E)')
            : translate('components.claudePanel.agentsView', 'Back to the Agents view (Ctrl+E)')
        }
        onClick={() => toggleClaudeView(worktreeId)}
      >
        {agentsView ? (
          <Code2 className="size-3.5" aria-hidden />
        ) : (
          <MessagesSquare className="size-3.5" aria-hidden />
        )}
      </HeaderButton>
      <HeaderButton
        label={translate('components.claudePanel.newChat', 'New Claude chat')}
        onClick={() => newClaudeChatInPanel(worktreeId)}
      >
        <SquarePen className="size-3.5" aria-hidden />
      </HeaderButton>
      <HeaderButton
        label={translate('components.claudePanel.history', 'Chat history')}
        onClick={() =>
          openAgentSessionHistoryModal({
            workspace: { worktreeId },
            chatTabId: activeTabId ?? '',
            initialQuery: '',
            agent: 'claude'
          })
        }
      >
        <History className="size-3.5" aria-hidden />
      </HeaderButton>
      <HeaderButton
        label={
          maximized
            ? translate('components.claudePanel.restore', 'Show the editor again')
            : translate('components.claudePanel.maximize', 'Give Claude the full width')
        }
        onClick={() => toggleMaximizeClaudePanel(worktreeId)}
      >
        {maximized ? (
          <Minimize2 className="size-3.5" aria-hidden />
        ) : (
          <Maximize2 className="size-3.5" aria-hidden />
        )}
      </HeaderButton>
      <HeaderButton
        label={translate('components.claudePanel.hide', 'Hide the Claude panel (Ctrl+I)')}
        onClick={() => hideClaudePanel(worktreeId)}
      >
        <PanelRightClose className="size-3.5" aria-hidden />
      </HeaderButton>
    </div>
  )
}
