import type { TabGroupLayoutNode } from '../../../../shared/tab-types'

export type PanelToggleAction = 'show' | 'hide' | 'focus'

/** Ctrl+I, as in Cursor: bring the panel back, or put it away once you are already in it. */
export function nextPanelToggleAction(
  hidden: boolean,
  composerFocused: boolean
): PanelToggleAction {
  if (hidden) {
    return 'show'
  }
  return composerFocused ? 'hide' : 'focus'
}

export function readSplitRatio(layout: TabGroupLayoutNode, path: string): number {
  let node: TabGroupLayoutNode | undefined = layout
  for (const segment of path ? path.split('.') : []) {
    node =
      node?.type === 'split' && (segment === 'first' || segment === 'second')
        ? node[segment]
        : undefined
  }
  return node?.type === 'split' ? (node.ratio ?? 0.5) : 0.5
}

/** The split ratio is the first child's share; the panel may sit on either side. */
export function editorRatioFor(panelSide: 'first' | 'second', editorShare: number): number {
  return panelSide === 'second' ? editorShare : 1 - editorShare
}
