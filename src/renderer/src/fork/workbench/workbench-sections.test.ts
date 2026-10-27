import { describe, expect, it } from 'vitest'
import { filterWorkbenchLists, sectionCounts, sectionOfContentType } from './workbench-sections'

describe('sectionOfContentType', () => {
  it('keeps terminals, files, changes and browser apart', () => {
    expect(sectionOfContentType('terminal')).toBe('terminals')
    expect(sectionOfContentType('agent-session')).toBe('terminals')
    expect(sectionOfContentType('editor')).toBe('files')
    expect(sectionOfContentType('conflict-review')).toBe('files')
    expect(sectionOfContentType('diff')).toBe('changes')
    expect(sectionOfContentType('check-details')).toBe('changes')
    expect(sectionOfContentType('browser')).toBe('browser')
    expect(sectionOfContentType('simulator')).toBe('browser')
  })
})

const groupTabs = [
  { id: 't1', contentType: 'terminal' as const },
  { id: 'f1', contentType: 'editor' as const },
  { id: 'd1', contentType: 'diff' as const },
  { id: 'b1', contentType: 'browser' as const }
]
const lists = {
  terminalTabs: [{ id: 'pty-1', unifiedTabId: 't1' }],
  agentSessionItems: [],
  editorItems: [{ tabId: 'f1' }, { tabId: 'd1' }],
  browserItems: [{ tabId: 'b1' }]
}

describe('filterWorkbenchLists', () => {
  it('shows only the chosen section’s tabs', () => {
    expect(filterWorkbenchLists(lists, groupTabs, 'terminals')).toEqual({
      terminalTabs: lists.terminalTabs,
      agentSessionItems: [],
      editorItems: [],
      browserItems: []
    })
    expect(filterWorkbenchLists(lists, groupTabs, 'files').editorItems).toEqual([{ tabId: 'f1' }])
    expect(filterWorkbenchLists(lists, groupTabs, 'changes').editorItems).toEqual([{ tabId: 'd1' }])
    expect(filterWorkbenchLists(lists, groupTabs, 'browser').browserItems).toEqual([
      { tabId: 'b1' }
    ])
  })

  it('counts tabs per section', () => {
    expect(sectionCounts(groupTabs)).toEqual({ terminals: 1, files: 1, changes: 1, browser: 1 })
  })
})
