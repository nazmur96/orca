import type { TabContentType } from '../../../../shared/tab-types'

export type WorkbenchSection = 'terminals' | 'files' | 'changes' | 'browser'

export const WORKBENCH_SECTIONS: readonly WorkbenchSection[] = [
  'terminals',
  'files',
  'changes',
  'browser'
]

export function sectionOfContentType(contentType: TabContentType): WorkbenchSection {
  switch (contentType) {
    case 'terminal':
    case 'agent-session':
      return 'terminals'
    case 'diff':
    case 'check-details':
      return 'changes'
    case 'browser':
    case 'simulator':
      return 'browser'
    case 'editor':
    case 'conflict-review':
      return 'files'
  }
}

type SectionTab = { id: string; contentType: TabContentType }

type WorkbenchLists<T, A, E, B> = {
  terminalTabs: readonly T[]
  agentSessionItems: readonly A[]
  editorItems: readonly E[]
  browserItems: readonly B[]
}

/** The tab bar takes one list per kind; a section passes only its own kinds through. */
export function filterWorkbenchLists<T, A, E extends { tabId: string }, B>(
  lists: WorkbenchLists<T, A, E, B>,
  groupTabs: readonly SectionTab[],
  section: WorkbenchSection
): WorkbenchLists<T, A, E, B> {
  const sectionOfTab = new Map(
    groupTabs.map((tab) => [tab.id, sectionOfContentType(tab.contentType)])
  )
  return {
    terminalTabs: section === 'terminals' ? lists.terminalTabs : [],
    agentSessionItems: section === 'terminals' ? lists.agentSessionItems : [],
    editorItems: lists.editorItems.filter(
      (item) => (sectionOfTab.get(item.tabId) ?? 'files') === section
    ),
    browserItems: section === 'browser' ? lists.browserItems : []
  }
}

export function sectionCounts(groupTabs: readonly SectionTab[]): Record<WorkbenchSection, number> {
  const counts: Record<WorkbenchSection, number> = {
    terminals: 0,
    files: 0,
    changes: 0,
    browser: 0
  }
  for (const tab of groupTabs) {
    counts[sectionOfContentType(tab.contentType)] += 1
  }
  return counts
}

/** The newest tab of a section in this group, by the group's recency list. */
export function latestTabInSection(
  groupTabs: readonly SectionTab[],
  recentTabIds: readonly string[],
  section: WorkbenchSection
): string | null {
  const inSection = new Set(
    groupTabs
      .filter((tab) => sectionOfContentType(tab.contentType) === section)
      .map((tab) => tab.id)
  )
  for (let index = recentTabIds.length - 1; index >= 0; index -= 1) {
    const tabId = recentTabIds[index]
    if (tabId && inSection.has(tabId)) {
      return tabId
    }
  }
  return groupTabs.find((tab) => inSection.has(tab.id))?.id ?? null
}
