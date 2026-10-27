import { describe, expect, it } from 'vitest'
import type { TabGroupLayoutNode } from '../../../../shared/tab-types'
import { swapSplitAt } from './claude-panel-swap'

const leaf = (groupId: string): TabGroupLayoutNode => ({ type: 'leaf', groupId })

describe('swapSplitAt', () => {
  it('swaps the children of the split at a path and mirrors its ratio', () => {
    const layout: TabGroupLayoutNode = {
      type: 'split',
      direction: 'horizontal',
      ratio: 0.62,
      first: { type: 'split', direction: 'vertical', first: leaf('a'), second: leaf('b') },
      second: leaf('panel')
    }
    const swapped = swapSplitAt(layout, '')
    expect(swapped).toEqual({
      ...layout,
      ratio: 0.38,
      first: leaf('panel'),
      second: layout.type === 'split' ? layout.first : layout
    })
  })

  it('reaches nested splits and leaves other branches untouched', () => {
    const inner: TabGroupLayoutNode = {
      type: 'split',
      direction: 'horizontal',
      first: leaf('x'),
      second: leaf('y')
    }
    const layout: TabGroupLayoutNode = {
      type: 'split',
      direction: 'vertical',
      first: leaf('top'),
      second: inner
    }
    const swapped = swapSplitAt(layout, 'second')
    expect(swapped.type === 'split' && swapped.second).toEqual({
      ...inner,
      ratio: 0.5,
      first: leaf('y'),
      second: leaf('x')
    })
    expect(swapped.type === 'split' && swapped.first).toEqual(leaf('top'))
  })

  it('returns the layout unchanged for a path that is not a split', () => {
    expect(swapSplitAt(leaf('a'), '')).toEqual(leaf('a'))
  })
})
