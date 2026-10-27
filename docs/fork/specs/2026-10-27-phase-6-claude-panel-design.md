# Phase 6 — Permanent Claude panel

Fork: `nazmur96/orca`, branch `claude-first`. Date: 2026-10-27. Approved in chat.

## Goal

Make Claude a fixed part of the window, like Cursor's agent pane, instead of
one tab among files. Layout per workspace:

`[Projects sidebar] [Editor area] [Claude panel] [Files/Git sidebar]`

## Mechanism

The panel is an ordinary Orca split group that the fork marks as the
workspace's Claude panel. Chats keep rendering exactly as they do today; no
new chat surface. All new code lives in `src/renderer/src/fork/claude-panel/`.

- **Registry** (`claude-panel-registry.ts`): worktree → panel group id,
  persisted in `localStorage` (`orca-fork.claudePanel.v1`), plus a global
  `hidden` flag and the last editor-side ratio per worktree. A stored id only
  counts while that group is still in the workspace layout.
- **Ensure** (`ensure-claude-panel.ts`): when a workspace becomes active and
  the panel is not hidden and it has no live panel group:
  1. split right of the rightmost top-level group (`createEmptySplitGroup`,
     not activated);
  2. set that split's ratio so the editor side keeps 62%;
  3. move the workspace's existing Claude structured chats into it
     (`moveUnifiedTabToGroup`), else launch a new Claude chat into it
     (`beginStructuredAgentSessionProvisionalLaunch`, `targetGroupId`).
- **Files never land in the panel**: `resolveEditorOpenTargetGroupId` falls
  back to the most recent non-panel group when the active group is the panel.
  This covers every editor/diff/conflict open, including Claude's `open_file`.
- **Header actions** (`ClaudePanelHeaderActions.tsx`, rendered by
  `TabGroupPanel` only for the panel group): New Claude chat, History
  (`openAgentSessionHistoryModal`), Maximize/Restore (editor-side ratio 0 ↔
  saved), Hide.
- **Hide / show / focus**: `Ctrl+I` (new global keybinding
  `claudePanel.toggle`, `Mod+I`). Hidden → show and focus the panel composer;
  shown and composer focused → hide; shown otherwise → focus composer. Hide
  sets the editor-side ratio to 1 (panel collapses to its resize handle) and
  remembers the previous ratio.
- **Side chat in the panel** splits **down**, not right.
- **Controller** (`ClaudePanelController.tsx`): mounted once in
  `AppBackgroundServices`; runs ensure on workspace switch and installs the
  `Ctrl+I` listener.
- Other agents (terminal agents, Grok/Codex handoff) still open as editor-area
  tabs.

## Out of scope

Review bar / keep-all-undo-all and inline diffs (Phase 3), Cursor-3 style
multi-agent window.

## Error handling

Any failure to create the group or launch a chat leaves the layout as it was
and logs; the workspace stays usable. A user who closes the panel group
manually gets it back on the next workspace activation unless hidden.

## Testing

Unit: registry persistence and liveness, layout path lookup, non-panel
fallback in `resolveEditorOpenTargetGroupId`, Ctrl+I state machine.

Prove it (dev app, CDP):

1. Opening a workspace shows the Claude panel on the right with a chat.
2. Opening a file while the panel is focused puts the file in the editor area.
3. Claude's `open_file` opens in the editor area.
4. `Ctrl+I` hides, shows and focuses; Maximize/Restore work; state survives a
   restart.
5. `Ctrl+;` in the panel opens the side chat below.
