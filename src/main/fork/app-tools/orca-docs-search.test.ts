import { describe, expect, it } from 'vitest'
import { docProse, searchOrcaDocs } from './orca-docs-search'

const docs = [
  { path: 'terminal.mdx', title: 'Terminal', body: 'Open a terminal tab and split panes.' },
  {
    path: 'agents/native-chat.mdx',
    title: 'Chat UI (native chat)',
    body: 'Split Chat Right opens a new chat beside this one. Chat chat.'
  },
  { path: 'browser.mdx', title: 'Browser', body: 'Preview your dev server.' }
]

describe('searchOrcaDocs', () => {
  it('ranks title matches first and returns an excerpt around the hit', () => {
    const hits = searchOrcaDocs(docs, 'how do I split a chat?')
    expect(hits.map((hit) => hit.path)).toEqual(['agents/native-chat.mdx', 'terminal.mdx'])
    expect(hits[0].excerpt).toContain('Split Chat Right')
  })

  it('returns nothing for a query of only short words', () => {
    expect(searchOrcaDocs(docs, 'a to of')).toEqual([])
  })
})

describe('docProse', () => {
  it('drops frontmatter and import lines', () => {
    expect(
      docProse(
        "---\ntitle: Tabs\ndescription: x\n---\n\nimport { C } from '@/c'\n\nDrag a tab to split."
      )
    ).toBe('Drag a tab to split.')
  })
})
