import { describe, expect, it } from 'vitest'
import { formatSideChatHandback } from './side-chat-handback-format'

describe('formatSideChatHandback', () => {
  it('quotes every line, keeping blank lines inside the quote', () => {
    expect(formatSideChatHandback('  First line\n\nSecond line \n')).toBe(
      'From the side chat:\n\n> First line\n>\n> Second line\n\n'
    )
  })
})
