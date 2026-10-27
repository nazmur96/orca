import { describe, expect, it } from 'vitest'
import type { TabGroupLayoutNode } from '../../../../shared/tab-types'
import { findGroupSplit, pickNonPanelGroupId, rightmostLeafGroupId } from './claude-panel-layout'

const leaf = (groupId: string): TabGroupLayoutNode => ({ type: 'leaf', groupId })
const split = (first: TabGroupLayoutNode, second: TabGroupLayoutNode): TabGroupLayoutNode => ({
  type: 'split',
  direction: 'horizontal',
  first,
  second
})

describe('findGroupSplit', () => {
  it('finds the split holding a leaf and which side it is on', () => {
    const layout = split(split(leaf('a'), leaf('b')), leaf('panel'))
    expect(findGroupSplit(layout, 'panel')).toEqual({ path: '', side: 'second' })
    expect(findGroupSplit(layout, 'b')).toEqual({ path: 'first', side: 'second' })
    expect(findGroupSplit(leaf('a'), 'a')).toBeNull()
  })
})

describe('rightmostLeafGroupId', () => {
  it('walks the second branch of horizontal splits', () => {
    expect(rightmostLeafGroupId(split(leaf('a'), split(leaf('b'), leaf('c'))))).toBe('c')
    expect(rightmostLeafGroupId(leaf('a'))).toBe('a')
  })
})

describe('pickNonPanelGroupId', () => {
  const groups = [
    { id: 'term', activeTabId: 't1' },
    { id: 'edit', activeTabId: 'e1' },
    { id: 'panel', activeTabId: 'c1' }
  ]
  const tabs = [
    { id: 't1', contentType: 'terminal' as const },
    { id: 'e1', contentType: 'editor' as const },
    { id: 'c1', contentType: 'agent-session' as const }
  ]

  it('prefers a group showing an editor', () => {
    expect(pickNonPanelGroupId(groups, tabs, 'panel')).toBe('edit')
  })

  it('falls back to any other group, and to null when only the panel exists', () => {
    expect(pickNonPanelGroupId(groups.slice(0, 1).concat(groups[2]), tabs, 'panel')).toBe('term')
    expect(pickNonPanelGroupId([groups[2]], tabs, 'panel')).toBeNull()
  })
})

describe('findGroupSplit with a side chat below the panel', () => {
  it('returns the left/right split holding the Claude column, not the up/down one', () => {
    const column: TabGroupLayoutNode = {
      type: 'split',
      direction: 'vertical',
      first: leaf('panel'),
      second: leaf('side')
    }
    expect(findGroupSplit(split(leaf('work'), column), 'panel')).toEqual({
      path: '',
      side: 'second'
    })
    expect(findGroupSplit(split(column, leaf('work')), 'panel')).toEqual({
      path: '',
      side: 'first'
    })
  })
})
