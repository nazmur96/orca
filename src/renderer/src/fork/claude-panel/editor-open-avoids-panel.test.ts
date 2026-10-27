import { beforeEach, describe, expect, it } from 'vitest'
import type { Tab, TabContentType, TabGroup } from '../../../../shared/tab-types'
import { resolveEditorOpenTargetGroupId } from '@/store/slices/editor/tabs/editor-open-target-group'
import { resetClaudePanelRegistryForTests, setClaudePanelGroupId } from './claude-panel-registry'

function tab(id: string, groupId: string, contentType: TabContentType): Tab {
  return {
    id,
    entityId: id,
    groupId,
    worktreeId: 'wt',
    contentType,
    label: id,
    customLabel: null,
    color: null,
    sortOrder: 0,
    createdAt: 0
  }
}

function group(id: string, activeTabId: string): TabGroup {
  return { id, worktreeId: 'wt', activeTabId, tabOrder: [activeTabId] }
}

const state = {
  activeGroupIdByWorktree: { wt: 'panel' },
  groupsByWorktree: { wt: [group('edit', 'e1'), group('panel', 'c1')] },
  unifiedTabsByWorktree: { wt: [tab('e1', 'edit', 'editor'), tab('c1', 'panel', 'agent-session')] }
}

describe('opening a file while the Claude panel is focused', () => {
  beforeEach(() => resetClaudePanelRegistryForTests())

  it('opens it in the editor area, not the panel', () => {
    setClaudePanelGroupId('wt', 'panel')
    expect(resolveEditorOpenTargetGroupId(state, 'wt')).toBe('edit')
  })

  it('leaves a group that is not the panel alone', () => {
    expect(resolveEditorOpenTargetGroupId(state, 'wt')).toBe('panel')
  })
})
