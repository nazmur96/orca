import { describe, expect, it } from 'vitest'
import { editorRatioFor, nextPanelToggleAction, readSplitRatio } from './claude-panel-toggle'
import type { TabGroupLayoutNode } from '../../../../shared/tab-types'

describe('nextPanelToggleAction (Ctrl+I)', () => {
  it('shows a hidden panel, hides a focused one, focuses an unfocused one', () => {
    expect(nextPanelToggleAction(true, false)).toBe('show')
    expect(nextPanelToggleAction(false, true)).toBe('hide')
    expect(nextPanelToggleAction(false, false)).toBe('focus')
  })
})

describe('split ratio helpers', () => {
  const layout: TabGroupLayoutNode = {
    type: 'split',
    direction: 'horizontal',
    ratio: 0.6,
    first: {
      type: 'split',
      direction: 'vertical',
      first: { type: 'leaf', groupId: 'a' },
      second: { type: 'leaf', groupId: 'b' }
    },
    second: { type: 'leaf', groupId: 'panel' }
  }

  it('reads a split ratio by path, defaulting to one half', () => {
    expect(readSplitRatio(layout, '')).toBe(0.6)
    expect(readSplitRatio(layout, 'first')).toBe(0.5)
  })

  it('converts the editor share into the split ratio for either side', () => {
    expect(editorRatioFor('second', 0.7)).toBe(0.7)
    expect(editorRatioFor('first', 0.7)).toBeCloseTo(0.3)
  })
})
