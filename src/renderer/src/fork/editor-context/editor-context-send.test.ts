import { beforeEach, describe, expect, it } from 'vitest'
import { prepareEditorContext } from './editor-context-send'
import {
  readEditorContextChat,
  resetEditorContextStoreForTests,
  setEditorContextEntry,
  updateEditorContextChat
} from './editor-context-store'

const owner = {}

function track(cursorLine = 3): void {
  setEditorContextEntry('wt', {
    owner,
    file: 'a.ts',
    language: 'typescript',
    cursorLine,
    selection: null,
    readMarkers: () => []
  })
}

describe('prepareEditorContext', () => {
  beforeEach(() => resetEditorContextStoreForTests())

  it('leaves text alone without a tracked editor', () => {
    expect(prepareEditorContext('chat', 'wt', 'hi').text).toBe('hi')
  })

  it('prepends the block and skips an unchanged snapshot after commit', () => {
    track()
    const first = prepareEditorContext('chat', 'wt', 'hi')
    expect(first.text).toMatch(
      /^<editor_context>\nfile: a\.ts \(typescript\), cursor line 3\n<\/editor_context>\nhi$/
    )
    first.commit()
    expect(prepareEditorContext('chat', 'wt', 'again').text).toBe('again')
    track(7)
    expect(prepareEditorContext('chat', 'wt', 'moved').text).toContain('cursor line 7')
  })

  it('re-sends when the first send was never committed', () => {
    track()
    prepareEditorContext('chat', 'wt', 'refused')
    expect(prepareEditorContext('chat', 'wt', 'retry').text).toContain('<editor_context>')
  })

  it('honours skip-next once and disabled always', () => {
    track()
    updateEditorContextChat('chat', { skipNext: true })
    const skipped = prepareEditorContext('chat', 'wt', 'a')
    expect(skipped.text).toBe('a')
    skipped.commit()
    expect(readEditorContextChat('chat').skipNext).toBe(false)
    updateEditorContextChat('chat', { disabled: true })
    expect(prepareEditorContext('chat', 'wt', 'b').text).toBe('b')
  })
})
