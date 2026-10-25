import { describe, expect, it } from 'vitest'
import { nextPermissionMode } from './permission-mode-cycle'

describe('nextPermissionMode', () => {
  const all = ['ask', 'accept-edits', 'auto', 'full-access'] as const
  it('steps forward and wraps', () => {
    expect(nextPermissionMode('ask', all)).toBe('accept-edits')
    expect(nextPermissionMode('auto', all)).toBe('full-access')
    expect(nextPermissionMode('full-access', all)).toBe('ask')
  })
  it('only cycles through the modes the host offers', () => {
    expect(nextPermissionMode('accept-edits', ['ask', 'accept-edits'])).toBe('ask')
  })
})
