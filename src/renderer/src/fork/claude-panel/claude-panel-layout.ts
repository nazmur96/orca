import type { TabContentType, TabGroupLayoutNode } from '../../../../shared/tab-types'
import { isEditorTabContentType } from '@/store/slices/editor/tabs/editor-tab-content-type'

export function containsGroup(node: TabGroupLayoutNode, groupId: string): boolean {
  return node.type === 'leaf'
    ? node.groupId === groupId
    : containsGroup(node.first, groupId) || containsGroup(node.second, groupId)
}

/** The nearest left/right split whose side holds the group, as the `nodePath` Orca's ratio setter takes.
 *  Up/down splits (a side chat under the panel) are skipped: they live inside the Claude column. */
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
    if (!containsGroup(child, groupId)) {
      continue
    }
    const nearer = findGroupSplit(child, groupId, path ? `${path}.${side}` : side)
    if (nearer) {
      return nearer
    }
    return layout.direction === 'horizontal' ? { path, side } : null
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

function leafOrder(layout: TabGroupLayoutNode): string[] {
  return layout.type === 'leaf'
    ? [layout.groupId]
    : [...leafOrder(layout.first), ...leafOrder(layout.second)]
}

/** A Claude column the registry lost (e.g. it ran before the saved layout was restored).
 *  Side chats split below the panel, so the first Claude-only group in layout order is the panel. */
export function findAdoptablePanelGroupId(
  layout: TabGroupLayoutNode,
  tabs: readonly { groupId: string; contentType: TabContentType; agentSessionAgent?: unknown }[]
): string | null {
  for (const groupId of leafOrder(layout)) {
    const inGroup = tabs.filter((tab) => tab.groupId === groupId)
    if (
      inGroup.length > 0 &&
      inGroup.every(
        (tab) => tab.contentType === 'agent-session' && tab.agentSessionAgent === 'claude'
      )
    ) {
      return groupId
    }
  }
  return null
}
