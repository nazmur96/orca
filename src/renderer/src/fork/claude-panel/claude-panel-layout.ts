import type { TabContentType, TabGroupLayoutNode } from '../../../../shared/tab-types'
import { isEditorTabContentType } from '@/store/slices/editor/tabs/editor-tab-content-type'

/** The split that directly holds a group's leaf, as the `nodePath` Orca's ratio setter takes. */
export function findGroupSplit(
  layout: TabGroupLayoutNode,
  groupId: string,
  path = ''
): { path: string; side: 'first' | 'second' } | null {
  if (layout.type === 'leaf') {
    return null
  }
  for (const side of ['first', 'second'] as const) {
    const child = layout[side]
    if (child.type === 'leaf' && child.groupId === groupId) {
      return { path, side }
    }
    const found = findGroupSplit(child, groupId, path ? `${path}.${side}` : side)
    if (found) {
      return found
    }
  }
  return null
}

export function rightmostLeafGroupId(layout: TabGroupLayoutNode): string {
  if (layout.type === 'leaf') {
    return layout.groupId
  }
  return rightmostLeafGroupId(layout.direction === 'horizontal' ? layout.second : layout.first)
}

/** Where a file goes when the user is looking at the Claude panel: an editor group if one shows. */
export function pickNonPanelGroupId(
  groups: readonly { id: string; activeTabId?: string | null }[],
  tabs: readonly { id: string; contentType: TabContentType }[],
  panelGroupId: string
): string | null {
  const others = groups.filter((group) => group.id !== panelGroupId)
  const showsEditor = others.find((group) => {
    const active = tabs.find((tab) => tab.id === group.activeTabId)
    return active ? isEditorTabContentType(active.contentType) : false
  })
  return (showsEditor ?? others[0])?.id ?? null
}
