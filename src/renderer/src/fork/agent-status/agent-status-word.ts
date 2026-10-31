import type { AgentDotState } from '@/components/AgentStateDot'

export type AgentStatusWordKind = 'working' | 'needs-you' | 'done' | 'failed' | 'stopped'

/** Cursor-style one-word status; states without a clear outcome show none. */
export function agentStatusWordKind(state: AgentDotState): AgentStatusWordKind | null {
  switch (state) {
    case 'working':
    case 'monitoring':
      return 'working'
    case 'blocked':
    case 'waiting':
    case 'permission':
      return 'needs-you'
    case 'done':
      return 'done'
    case 'failed':
      return 'failed'
    case 'interrupted':
      return 'stopped'
    case 'idle':
    case 'unverifiable':
    case 'unconfirmed':
      return null
  }
}
