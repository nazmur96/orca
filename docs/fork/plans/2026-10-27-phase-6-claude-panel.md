# Phase 6 — Claude panel: Implementation Plan

**Spec:** `docs/fork/specs/2026-10-27-phase-6-claude-panel-design.md`
**Constraints:** Phase 1 plan's Global Constraints apply (FHS dev shell, AGENTS.md rules, translate(), max-lines caps, `check:code-quality:changed` before commit).

All new files under `src/renderer/src/fork/claude-panel/`.

### Task 1 — Registry (TDD)

`claude-panel-registry.ts` + test. API: `readClaudePanelGroupId(worktreeId)`,
`setClaudePanelGroupId(worktreeId, groupId | null)`, `isClaudePanelHidden()`,
`setClaudePanelHidden(hidden)`, `readSavedEditorRatio(worktreeId)`,
`saveEditorRatio(worktreeId, ratio)`, `useClaudePanelState()`,
`resetClaudePanelRegistryForTests()`. localStorage key
`orca-fork.claudePanel.v1`, every access in try/catch.

### Task 2 — Layout helpers (TDD)

`claude-panel-layout.ts` + test, pure:
`findGroupSplit(layout, groupId)` → `{ path, side }` of the split holding the
leaf; `isLivePanelGroup(state, worktreeId, groupId)`;
`pickNonPanelGroupId(groups, tabs, panelGroupId)` (prefer a group whose active
tab is an editor, else first non-panel group).

### Task 3 — Keep files out of the panel

In `store/slices/editor/tabs/editor-open-target-group.ts`
`resolveEditorOpenTargetGroupId`: after `activeGroup` is resolved, if it is the
live panel group return `pickNonPanelGroupId(...) ?? activeGroup.id`. Extend
the existing test file with one case.

### Task 4 — Ensure + controller

`ensure-claude-panel.ts` (create split right of rightmost top-level group, set
editor ratio 0.62, move Claude chats in or launch one) and
`ClaudePanelController.tsx` (ensure on `activeWorktreeId` change). Mount in
`app-shell/AppBackgroundServices.tsx`.

### Task 5 — Header actions + Ctrl+I

`ClaudePanelHeaderActions.tsx` rendered in `TabGroupPanel.tsx` before
`TabBarQuickCommandsButton`. Keybinding `claudePanel.toggle` (`Mod+I`, global)
in `definitions-core-4.ts` + `types.ts`; listener in the controller;
`claude-panel-toggle.ts` pure state machine (TDD).

### Task 6 — Side chat splits down in the panel

`fork/side-chat/open-side-chat.ts`: direction `'down'` when the source group
is the panel.

### Task 7 — Catalogs, gates, prove it, push

`pnpm sync:localization-catalog`, `check:code-quality:changed`, the five
spec drills in the dev app, commit, push.
