import { describe, expect, it } from 'vitest'
import { agentStatusWordKind } from './agent-status-word'

describe('agentStatusWordKind', () => {
  it('names the three states the sidebar is scanned for', () => {
    expect(agentStatusWordKind('working')).toBe('working')
    expect(agentStatusWordKind('monitoring')).toBe('working')
    expect(agentStatusWordKind('waiting')).toBe('needs-you')
    expect(agentStatusWordKind('blocked')).toBe('needs-you')
    expect(agentStatusWordKind('permission')).toBe('needs-you')
    expect(agentStatusWordKind('done')).toBe('done')
  })

  it('shows no word where the outcome is unproven', () => {
    expect(agentStatusWordKind('idle')).toBeNull()
    expect(agentStatusWordKind('unverifiable')).toBeNull()
    expect(agentStatusWordKind('unconfirmed')).toBeNull()
  })
})
