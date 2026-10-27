import type { TabGroupLayoutNode } from '../../../../shared/tab-types'

/** Swap a split's two sides, keeping each side's width (the ratio is the first child's share). */
export function swapSplitAt(layout: TabGroupLayoutNode, path: string): TabGroupLayoutNode {
  if (layout.type !== 'split') {
    return layout
  }
  if (path === '') {
    return {
      ...layout,
      ratio: Math.round((1 - (layout.ratio ?? 0.5)) * 1000) / 1000,
      first: layout.second,
      second: layout.first
    }
  }
  const [head, ...rest] = path.split('.')
  if (head !== 'first' && head !== 'second') {
    return layout
  }
  return { ...layout, [head]: swapSplitAt(layout[head], rest.join('.')) }
}
