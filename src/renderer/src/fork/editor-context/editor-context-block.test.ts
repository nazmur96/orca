import { describe, expect, it } from 'vitest'
import {
  formatEditorContextBlock,
  formatSelectionQuote,
  parseEditorContextBlock
} from './editor-context-block'
import type { EditorContextSnapshot } from './editor-context-types'

const snapshot: EditorContextSnapshot = {
  file: 'src/api/user (v2).ts',
  language: 'typescript',
  cursorLine: 42,
  selection: { startLine: 42, endLine: 44, text: 'const a = 1\n```\nconst b = 2', truncated: true },
  diagnostics: [
    { line: 45, severity: 'error', message: "Type 'string' is not assignable.", code: 'TS2322' },
    { line: 50, severity: 'warning', message: 'Unused variable.' }
  ]
}

describe('editor context block', () => {
  it('round-trips a full snapshot and keeps the message body', () => {
    const text = `${formatEditorContextBlock(snapshot)}\nwhat does this do?`
    expect(parseEditorContextBlock(text)).toEqual({ snapshot, body: 'what does this do?' })
  })

  it('round-trips a snapshot without selection or diagnostics', () => {
    const bare = { ...snapshot, selection: null, diagnostics: [] }
    expect(parseEditorContextBlock(`${formatEditorContextBlock(bare)}\nhi`)).toEqual({
      snapshot: bare,
      body: 'hi'
    })
  })

  it('fences the selection longer than any backtick run inside it', () => {
    expect(formatEditorContextBlock(snapshot)).toContain('````typescript\n')
  })

  it('ignores text that does not start with a block', () => {
    expect(parseEditorContextBlock('hello <editor_context>')).toBeNull()
  })

  it('formats a selection quote with path, range and fence', () => {
    expect(
      formatSelectionQuote('a.ts', 'typescript', { startLine: 3, endLine: 4, text: 'x\ny' })
    ).toBe('a.ts:3-4\n```typescript\nx\ny\n```\n')
  })
})
