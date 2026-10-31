import { describe, expect, it } from 'vitest'
import { claudeEditorModel } from './fork-claude-editor-model'

describe('claudeEditorModel', () => {
  it('keeps the offered models', () => {
    expect(claudeEditorModel('haiku')).toBe('haiku')
    expect(claudeEditorModel('opus')).toBe('opus')
  })

  it('falls back to Sonnet for anything else', () => {
    expect(claudeEditorModel(undefined)).toBe('sonnet')
    expect(claudeEditorModel('--dangerously-skip-permissions')).toBe('sonnet')
  })
})
