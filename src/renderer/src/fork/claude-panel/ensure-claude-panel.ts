import { useAppStore } from '@/store'
import { adoptAgentSessionLaunchVerdict } from '@/lib/agent-session-launch-plan'
import { newAgentLaunchRequestId } from '@/lib/agent-launch-request-id'
import { beginStructuredAgentSessionProvisionalLaunch } from '@/lib/agent-session/structured-agent-session-provisional-tab'
import { isStructuredTab } from '../../../../shared/structured-agent-session-tab'
import {
  isClaudePanelHidden,
  readClaudePanelGroupId,
  setClaudePanelGroupId
} from './claude-panel-registry'
import { findGroupSplit, rightmostLeafGroupId } from './claude-panel-layout'

/** Share of the width the editor side keeps when the panel is first created. */
export const CLAUDE_PANEL_EDITOR_RATIO = 0.62

const inFlight = new Set<string>()

export function liveClaudePanelGroupId(worktreeId: string): string | null {
  const groupId = readClaudePanelGroupId(worktreeId)
  const groups = useAppStore.getState().groupsByWorktree[worktreeId] ?? []
  return groupId && groups.some((group) => group.id === groupId) ? groupId : null
}

export function launchClaudeChatInPanel(worktreeId: string, groupId: string): void {
  const plan = adoptAgentSessionLaunchVerdict({
    route: 'structured-native-chat',
    requestId: newAgentLaunchRequestId(),
    agent: 'claude',
    worktreeId
  })
  const launch = beginStructuredAgentSessionProvisionalLaunch({
    plan,
    hooks: {},
    targetGroupId: groupId
  })
  if (!launch) {
    console.warn('[claude-panel] could not start a Claude chat in the panel')
  }
}

/** Claude chats outside the panel; Orca keeps the groups they leave, so the editor area stays. */
function movableClaudeChats(worktreeId: string, panelGroupId: string): string[] {
  return (useAppStore.getState().unifiedTabsByWorktree[worktreeId] ?? [])
    .filter(
      (tab) =>
        tab.groupId !== panelGroupId && isStructuredTab(tab) && tab.agentSessionAgent === 'claude'
    )
    .map((tab) => tab.id)
}

function applyInitialPanelWidth(worktreeId: string, panel: string): void {
  const state = useAppStore.getState()
  const layout = state.layoutByWorktree[worktreeId]
  const split = layout ? findGroupSplit(layout, panel) : null
  if (split) {
    state.setTabGroupSplitRatio(
      worktreeId,
      split.path,
      split.side === 'second' ? CLAUDE_PANEL_EDITOR_RATIO : 1 - CLAUDE_PANEL_EDITOR_RATIO
    )
  }
}

/** Give the workspace its Claude column on the right, once, unless the user hid the panel. */
export function ensureClaudePanel(worktreeId: string): void {
  if (isClaudePanelHidden() || inFlight.has(worktreeId) || liveClaudePanelGroupId(worktreeId)) {
    return
  }
  const state = useAppStore.getState()
  const layout = state.layoutByWorktree[worktreeId]
  if (!layout || (state.groupsByWorktree[worktreeId] ?? []).length === 0) {
    return
  }
  inFlight.add(worktreeId)
  try {
    const panel = state.createEmptySplitGroup(worktreeId, rightmostLeafGroupId(layout), 'right', {
      activate: false
    })
    if (!panel) {
      return
    }
    setClaudePanelGroupId(worktreeId, panel)
    const after = useAppStore.getState()
    const moving = movableClaudeChats(worktreeId, panel)
    for (const tabId of moving) {
      after.moveUnifiedTabToGroup(tabId, panel, { activate: true })
    }
    if (moving.length === 0) {
      launchClaudeChatInPanel(worktreeId, panel)
    }
    // Emptied groups are pruned after the moves, which rebuilds the split; size it once that settles.
    setTimeout(() => applyInitialPanelWidth(worktreeId, panel), 0)
  } finally {
    inFlight.delete(worktreeId)
  }
}
