import { useAppStore } from '@/store'
import { captureNativeChatComposerFocusIntent } from '@/components/native-chat/use-native-chat-composer-reveal-focus'
import {
  isClaudePanelHidden,
  readSavedEditorRatio,
  saveEditorRatio,
  setClaudePanelHidden
} from './claude-panel-registry'
import { findGroupSplit } from './claude-panel-layout'
import { editorRatioFor, nextPanelToggleAction, readSplitRatio } from './claude-panel-toggle'
import {
  CLAUDE_PANEL_EDITOR_RATIO,
  ensureClaudePanel,
  launchClaudeChatInPanel,
  liveClaudePanelGroupId
} from './ensure-claude-panel'

type PanelPlacement = { panel: string; path: string; side: 'first' | 'second'; editorShare: number }

function placement(worktreeId: string): PanelPlacement | null {
  const panel = liveClaudePanelGroupId(worktreeId)
  const layout = useAppStore.getState().layoutByWorktree[worktreeId]
  const split = panel && layout ? findGroupSplit(layout, panel) : null
  if (!panel || !layout || !split) {
    return null
  }
  const ratio = readSplitRatio(layout, split.path)
  return { panel, ...split, editorShare: split.side === 'second' ? ratio : 1 - ratio }
}

function setEditorShare(worktreeId: string, at: PanelPlacement, share: number): void {
  useAppStore.getState().setTabGroupSplitRatio(worktreeId, at.path, editorRatioFor(at.side, share))
}

/** A share the panel can come back to: never fully open or fully closed. */
function rememberShare(worktreeId: string, share: number): void {
  if (share > 0.05 && share < 0.95) {
    saveEditorRatio(worktreeId, share)
  }
}

function restoredShare(worktreeId: string): number {
  return readSavedEditorRatio(worktreeId) ?? CLAUDE_PANEL_EDITOR_RATIO
}

export function hideClaudePanel(worktreeId: string): void {
  const at = placement(worktreeId)
  if (at) {
    rememberShare(worktreeId, at.editorShare)
    setEditorShare(worktreeId, at, 1)
  }
  setClaudePanelHidden(true)
}

export function showClaudePanel(worktreeId: string): void {
  setClaudePanelHidden(false)
  const at = placement(worktreeId)
  if (at) {
    setEditorShare(worktreeId, at, restoredShare(worktreeId))
  } else {
    ensureClaudePanel(worktreeId)
  }
}

export function isClaudePanelMaximized(worktreeId: string): boolean {
  return (placement(worktreeId)?.editorShare ?? 1) < 0.02
}

/** Cursor's agent layout: Claude takes the whole width; again brings the editor back. */
export function toggleMaximizeClaudePanel(worktreeId: string): void {
  const at = placement(worktreeId)
  if (!at) {
    return
  }
  if (at.editorShare < 0.02) {
    setEditorShare(worktreeId, at, restoredShare(worktreeId))
  } else {
    rememberShare(worktreeId, at.editorShare)
    setEditorShare(worktreeId, at, 0)
  }
}

/** Hidden is one choice for all workspaces; apply it to whichever workspace is now on screen. */
export function syncClaudePanelVisibility(worktreeId: string): void {
  const at = placement(worktreeId)
  if (!at) {
    return
  }
  if (isClaudePanelHidden() && at.editorShare < 0.98) {
    rememberShare(worktreeId, at.editorShare)
    setEditorShare(worktreeId, at, 1)
  } else if (!isClaudePanelHidden() && at.editorShare > 0.98) {
    setEditorShare(worktreeId, at, restoredShare(worktreeId))
  }
}

export function focusClaudePanelComposer(worktreeId: string): void {
  const state = useAppStore.getState()
  const panel = liveClaudePanelGroupId(worktreeId)
  const group = panel ? state.groupsByWorktree[worktreeId]?.find((g) => g.id === panel) : null
  if (!panel || !group) {
    return
  }
  state.focusGroup(worktreeId, panel)
  if (group.activeTabId) {
    state.activateTab(group.activeTabId, { worktreeId })
    captureNativeChatComposerFocusIntent().request(group.activeTabId)
  } else {
    launchClaudeChatInPanel(worktreeId, panel)
  }
}

export function newClaudeChatInPanel(worktreeId: string): void {
  const panel = liveClaudePanelGroupId(worktreeId)
  if (panel) {
    launchClaudeChatInPanel(worktreeId, panel)
  }
}

function panelComposerFocused(worktreeId: string): boolean {
  const focused = document.activeElement
  const inComposer = Boolean(focused?.closest('[aria-label^="Ask anything"]'))
  const panel = liveClaudePanelGroupId(worktreeId)
  return (
    inComposer &&
    panel !== null &&
    useAppStore.getState().activeGroupIdByWorktree[worktreeId] === panel
  )
}

export function runClaudePanelToggle(worktreeId: string): void {
  const action = nextPanelToggleAction(isClaudePanelHidden(), panelComposerFocused(worktreeId))
  if (action === 'hide') {
    hideClaudePanel(worktreeId)
    return
  }
  if (action === 'show') {
    showClaudePanel(worktreeId)
  }
  focusClaudePanelComposer(worktreeId)
}
