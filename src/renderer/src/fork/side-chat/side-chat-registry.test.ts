import { beforeEach, describe, expect, it } from 'vitest'
import {
  linkSideChat,
  markSideChatAskModeApplied,
  readSideChatLink,
  resetSideChatRegistryForTests
} from './side-chat-registry'

describe('side chat registry', () => {
  beforeEach(() => resetSideChatRegistryForTests())

  it('remembers which main chat a side chat came from', () => {
    linkSideChat('side-1', {
      mainTabId: 'tab-1',
      mainSessionId: 'main-1',
      worktreeId: 'wt',
      askModePending: true
    })
    expect(readSideChatLink('side-1')).toEqual({
      mainTabId: 'tab-1',
      mainSessionId: 'main-1',
      worktreeId: 'wt',
      askModePending: true
    })
    markSideChatAskModeApplied('side-1')
    expect(readSideChatLink('side-1')?.askModePending).toBe(false)
    expect(readSideChatLink('other')).toBeNull()
  })
})
