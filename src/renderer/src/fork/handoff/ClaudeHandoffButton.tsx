import { useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { selectKnownWorktreeById } from '@/store/selectors'
import { AgentSessionContinuationDialog } from '@/components/agent-session-continuation/AgentSessionContinuationDialog'
import type { AgentSessionContinuationRequest } from '@/lib/agent-session-continuation'
import { resolveUnifiedTabLabel } from '../../../../shared/tab-title-resolution'
import { structuredAgentSessionPaneKey } from '../../../../shared/structured-agent-session-projection'
import { buildClaudeChatHandoffRequest } from './claude-chat-handoff-request'

function requestFor(worktreeId: string, tabId: string): AgentSessionContinuationRequest | null {
  const state = useAppStore.getState()
  const tab = state.unifiedTabsByWorktree[worktreeId]?.find((candidate) => candidate.id === tabId)
  const workspacePath = selectKnownWorktreeById(state, worktreeId)?.path
  if (!tab || !workspacePath) {
    return null
  }
  const status = state.agentStatusByPaneKey[structuredAgentSessionPaneKey(tab.id, tab.entityId)]
  return buildClaudeChatHandoffRequest(
    {
      id: tab.id,
      entityId: tab.entityId,
      groupId: tab.groupId,
      title: resolveUnifiedTabLabel(tab, false)
    },
    status,
    worktreeId,
    workspacePath
  )
}

/** Orca's one-click handoff (Codex, Grok, …) for the chat shown in the Claude panel. */
export function ClaudeHandoffButton({
  worktreeId,
  tabId
}: {
  worktreeId: string
  tabId: string | null
}): React.JSX.Element {
  const [request, setRequest] = useState<AgentSessionContinuationRequest | null>(null)
  const label = translate('components.claudePanel.handOff', 'Hand off to another agent')
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={label}
        title={label}
        disabled={!tabId}
        onClick={() => {
          const next = tabId ? requestFor(worktreeId, tabId) : null
          if (next) {
            setRequest(next)
          } else {
            toast.error(
              translate(
                'components.claudePanel.handOffUnavailable',
                'This chat cannot be handed off yet.'
              )
            )
          }
        }}
      >
        <ArrowRightLeft className="size-3.5" aria-hidden />
      </Button>
      {request ? (
        <AgentSessionContinuationDialog
          open
          request={request}
          onOpenChange={(open) => {
            if (!open) {
              setRequest(null)
            }
          }}
        />
      ) : null}
    </>
  )
}
