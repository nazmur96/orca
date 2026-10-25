import { describe, expect, it } from 'vitest'
import { buildEditorContextSnapshot, editorContextLabel } from './editor-context-snapshot'

const base = { file: 'a.ts', language: 'typescript', cursorLine: 3, selection: null }

describe('buildEditorContextSnapshot', () => {
  it('keeps errors and warnings only, sorted by line, capped at 20', () => {
    const markers = [
      { startLineNumber: 9, severity: 4, message: 'warn' },
      { startLineNumber: 2, severity: 8, message: 'err', code: { value: 'TS1' } },
      { startLineNumber: 5, severity: 2, message: 'info' },
      ...Array.from({ length: 30 }, (_, i) => ({
        startLineNumber: 100 + i,
        severity: 8,
        message: 'x'
      }))
    ]
    const { diagnostics } = buildEditorContextSnapshot(base, markers)
    expect(diagnostics).toHaveLength(20)
    expect(diagnostics[0]).toEqual({ line: 2, severity: 'error', message: 'err', code: 'TS1' })
    expect(diagnostics[1]).toEqual({ line: 9, severity: 'warning', message: 'warn' })
  })

  it('trims a selection to 200 lines and flags it', () => {
    const text = Array.from({ length: 250 }, (_, i) => `l${i}`).join('\n')
    const { selection } = buildEditorContextSnapshot(
      { ...base, selection: { startLine: 1, endLine: 250, text } },
      []
    )
    expect(selection?.text.split('\n')).toHaveLength(200)
    expect(selection?.truncated).toBe(true)
  })

  it('trims a selection to 8000 chars and flags it', () => {
    const { selection } = buildEditorContextSnapshot(
      { ...base, selection: { startLine: 1, endLine: 1, text: 'x'.repeat(9000) } },
      []
    )
    expect(selection?.text).toHaveLength(8000)
    expect(selection?.truncated).toBe(true)
  })
})

describe('editorContextLabel', () => {
  it('shows the selected range and error count', () => {
    const snapshot = buildEditorContextSnapshot(
      { ...base, selection: { startLine: 4, endLine: 9, text: 'x' } },
      [
        { startLineNumber: 5, severity: 8, message: 'e' },
        { startLineNumber: 6, severity: 4, message: 'w' }
      ]
    )
    expect(editorContextLabel(snapshot)).toBe('a.ts:4–9 · 1 error')
  })

  it('shows the cursor line without a selection', () => {
    expect(editorContextLabel(buildEditorContextSnapshot(base, []))).toBe('a.ts:3')
  })
})
