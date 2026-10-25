import { describe, expect, it } from 'vitest'
import { pickClaudeChatTab } from './editor-context-add-selection'

const chat = (id: string, agent: string) => ({
  id,
  entityId: `s-${id}`,
  contentType: 'agent-session',
  agentSessionAgent: agent
})

describe('pickClaudeChatTab', () => {
  it('picks the last Claude structured chat', () => {
    const tabs = [
      chat('a', 'claude'),
      chat('b', 'codex'),
      chat('c', 'claude'),
      { id: 'f', entityId: 'x', contentType: 'editor' }
    ]
    expect(pickClaudeChatTab(tabs)?.id).toBe('c')
  })

  it('returns null without a Claude chat', () => {
    expect(pickClaudeChatTab([chat('b', 'codex')])).toBeNull()
  })
})
