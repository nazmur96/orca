import { beforeEach, describe, expect, it, vi } from 'vitest'

const chat = vi.hoisted(() => ({
  awaits: vi.fn(() => false),
  load: vi.fn(async () => {}),
  open: vi.fn<(id: string, seedShell: () => boolean) => { primaryTabId: string | null } | null>()
}))
vi.mock('@/lib/empty-workspace-default-agent-chat', () => ({
  emptyWorkspaceDefaultChatAwaitsDetection: chat.awaits,
  loadEmptyWorkspaceDefaultChatDetection: chat.load,
  openDefaultAgentChatInEmptyWorkspace: chat.open
}))

import { seedStartupDefaultSurface } from './startup-default-surface'

describe('seedStartupDefaultSurface', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens the default chat instead of a shell', async () => {
    chat.open.mockReturnValue({ primaryTabId: 'chat-tab' })
    const shell = vi.fn()
    await seedStartupDefaultSurface('wt', shell, () => true)
    expect(chat.open).toHaveBeenCalledWith('wt', expect.any(Function))
    expect(shell).not.toHaveBeenCalled()
  })

  it('falls back to the shell when no chat can open', async () => {
    chat.open.mockReturnValue(null)
    const shell = vi.fn()
    await seedStartupDefaultSurface('wt', shell, () => true)
    expect(shell).toHaveBeenCalledOnce()
  })

  it('waits for agent detection, then does nothing if the user moved on', async () => {
    chat.awaits.mockReturnValue(true)
    const shell = vi.fn()
    await seedStartupDefaultSurface('wt', shell, () => false)
    expect(chat.load).toHaveBeenCalledWith('wt')
    expect(chat.open).not.toHaveBeenCalled()
    expect(shell).not.toHaveBeenCalled()
  })
})
