import { describe, expect, it } from 'vitest'
import { buildInlineEditPrompt, parseInlineEditReplacement } from './claude-inline-edit-prompt'

describe('buildInlineEditPrompt', () => {
  it('includes the instruction, the selection and nearby code, trimmed to a window', () => {
    const before = Array.from({ length: 100 }, (_, i) => `b${i}`).join('\n')
    const prompt = buildInlineEditPrompt({
      instruction: 'add a JSDoc comment',
      filePath: 'src/cart.ts',
      language: 'typescript',
      selection: 'export function f() {}',
      before,
      after: 'tail'
    })
    expect(prompt).toContain('Instruction: add a JSDoc comment')
    expect(prompt).toContain('<selection>\nexport function f() {}\n</selection>')
    expect(prompt).toContain('File: src/cart.ts (typescript)')
    expect(prompt).toContain('b99')
    expect(prompt).not.toContain('b10\n')
    expect(prompt).toContain('tail')
  })
})

describe('parseInlineEditReplacement', () => {
  it('extracts the tagged code without the newlines around it', () => {
    expect(parseInlineEditReplacement('<replacement>\nconst a = 1\n</replacement>')).toBe(
      'const a = 1'
    )
    expect(parseInlineEditReplacement('noise <replacement>x</replacement> more')).toBe('x')
  })

  it('returns null when Claude did not answer in the expected shape', () => {
    expect(parseInlineEditReplacement('Sure! here is the code')).toBeNull()
  })

  it('keeps an intentionally empty replacement (delete the selection)', () => {
    expect(parseInlineEditReplacement('<replacement></replacement>')).toBe('')
  })
})
