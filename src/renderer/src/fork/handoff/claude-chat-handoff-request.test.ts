import { describe, expect, it } from 'vitest'
import { buildClaudeChatHandoffRequest } from './claude-chat-handoff-request'

describe('buildClaudeChatHandoffRequest', () => {
  const chat = { id: 'tab-1', entityId: 'claude_s1', groupId: 'g1', title: 'Fix empty cart' }

  it('hands off the full transcript plus the last exchange', () => {
    const entry = {
      prompt: 'fix the empty cart',
      lastAssistantMessage: 'Done, tests pass.',
      providerSession: { transcriptPath: '/home/u/.claude/projects/x/s1.jsonl' }
    }
    expect(buildClaudeChatHandoffRequest(chat, entry, 'wt', '/repo')).toEqual({
      source: {
        sourceAgent: 'claude',
        capturedText: 'Done, tests pass.',
        sourceTitle: 'Fix empty cart',
        sourceWorkingDirectory: '/repo',
        transcriptPath: '/home/u/.claude/projects/x/s1.jsonl',
        lastPrompt: 'fix the empty cart',
        lastAssistantMessage: 'Done, tests pass.'
      },
      worktreeId: 'wt',
      groupId: 'g1',
      workspacePath: '/repo',
      launchSource: 'sidebar'
    })
  })

  it('still works before the chat has a status entry', () => {
    const request = buildClaudeChatHandoffRequest(chat, undefined, 'wt', '/repo')
    expect(request.source.transcriptPath).toBeNull()
    expect(request.source.capturedText).toBe('')
  })
})
