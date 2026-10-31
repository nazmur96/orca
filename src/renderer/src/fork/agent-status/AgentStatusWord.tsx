import type { AgentDotState } from '@/components/AgentStateDot'
import type { DashboardAgentRow } from '@/components/dashboard/useDashboardData'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import { agentStatusWordKind, type AgentStatusWordKind } from './agent-status-word'

const WORDS: Record<AgentStatusWordKind, () => string> = {
  working: () => translate('components.agentStatusWord.working', 'Working'),
  'needs-you': () => translate('components.agentStatusWord.needsYou', 'Needs you'),
  done: () => translate('components.agentStatusWord.done', 'Done'),
  failed: () => translate('components.agentStatusWord.failed', 'Failed'),
  stopped: () => translate('components.agentStatusWord.stopped', 'Stopped')
}

const TONES: Record<AgentStatusWordKind, string> = {
  working: 'text-primary animate-pulse',
  'needs-you': 'text-amber-600 dark:text-amber-400 font-medium',
  done: 'text-emerald-600/80 dark:text-emerald-400/80',
  failed: 'text-destructive',
  stopped: 'text-muted-foreground/70'
}

/** The status word beside a chat row's dot; sub-agent rows and labels already naming it get none. */
export function AgentStatusWord({
  agent,
  state,
  label
}: {
  agent: Pick<DashboardAgentRow, 'rowSource'>
  state: AgentDotState
  label: string
}): React.JSX.Element | null {
  const kind = agent.rowSource === 'subagent' ? null : agentStatusWordKind(state)
  if (!kind || label.trim() === WORDS[kind]()) {
    return null
  }
  return (
    <span
      className={cn('shrink-0 text-[10px] leading-none', TONES[kind])}
      data-agent-status-word={kind}
    >
      {WORDS[kind]()}
    </span>
  )
}
