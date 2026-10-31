import { describe, expect, it } from 'vitest'
import { fitSuggestionToCursor, suggestionAt } from './claude-suggest-state'

const asked = { uri: 'file:///a.ts', version: 3, line: 5, column: 9, text: 'return total' }

describe('suggestionAt', () => {
  it('offers the suggestion where it was asked for', () => {
    expect(suggestionAt(asked, { uri: 'file:///a.ts', version: 3, line: 5, column: 9 })).toBe(asked)
  })

  it('drops it once the file changed or the cursor moved', () => {
    expect(suggestionAt(asked, { uri: 'file:///a.ts', version: 4, line: 5, column: 9 })).toBeNull()
    expect(suggestionAt(asked, { uri: 'file:///a.ts', version: 3, line: 6, column: 1 })).toBeNull()
    expect(suggestionAt(asked, { uri: 'file:///b.ts', version: 3, line: 5, column: 9 })).toBeNull()
    expect(suggestionAt(null, { uri: 'file:///a.ts', version: 3, line: 5, column: 9 })).toBeNull()
  })
})

describe('fitSuggestionToCursor', () => {
  it('drops indentation the cursor already sits after', () => {
    expect(fitSuggestionToCursor('  return total\n}', '  ')).toBe('return total\n}')
  })

  it('keeps text when the cursor is mid-line', () => {
    expect(fitSuggestionToCursor(' + tax', 'const sum = total')).toBe(' + tax')
  })
})
