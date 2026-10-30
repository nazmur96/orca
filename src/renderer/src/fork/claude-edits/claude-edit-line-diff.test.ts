import { describe, expect, it } from 'vitest'
import { claudeChangedLines } from './claude-edit-line-diff'

describe('claudeChangedLines', () => {
  it('marks added lines and where lines were removed, in current line numbers', () => {
    const before = 'a\nb\nc\nd\n'
    const current = 'top\na\nb\nX\nd\nend\n'
    expect(claudeChangedLines(before, current)).toEqual({ added: [1, 4, 6], removedAfter: [3] })
  })

  it('treats a new file as all added', () => {
    expect(claudeChangedLines(null, 'x\ny\n')).toEqual({ added: [1, 2], removedAfter: [] })
  })

  it('reports nothing for identical content and a removal at the top as line 0', () => {
    expect(claudeChangedLines('a\nb\n', 'a\nb\n')).toEqual({ added: [], removedAfter: [] })
    expect(claudeChangedLines('gone\na\n', 'a\n')).toEqual({ added: [], removedAfter: [0] })
  })

  it('gives up on huge files instead of freezing the editor', () => {
    const big = Array.from({ length: 5000 }, (_, i) => `l${i}`).join('\n')
    expect(claudeChangedLines(big, `${big}\nmore`)).toBeNull()
  })
})
