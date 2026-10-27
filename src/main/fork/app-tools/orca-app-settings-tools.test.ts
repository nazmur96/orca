import { describe, expect, it } from 'vitest'
import { parseClaudeSettingChange } from './orca-app-settings-tools'

describe('parseClaudeSettingChange', () => {
  it('accepts an allowlisted setting with a valid value', () => {
    expect(parseClaudeSettingChange('compactWorktreeCards', true)).toEqual({
      ok: true,
      update: { compactWorktreeCards: true }
    })
  })

  it('refuses settings that could raise its own permissions', () => {
    for (const key of [
      'nativeChatPermissionMode',
      'agentDefaultArgs',
      'agentCmdOverrides',
      'agentDefaultEnv'
    ]) {
      expect(parseClaudeSettingChange(key, 'full-access').ok).toBe(false)
    }
  })

  it('refuses an invalid value for an allowed key', () => {
    expect(parseClaudeSettingChange('compactWorktreeCards', 'yes').ok).toBe(false)
  })
})
