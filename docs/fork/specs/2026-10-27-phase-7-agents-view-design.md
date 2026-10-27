# Phase 7 — Agents view and workbench (Cursor 60% + Orca 40%)

Fork: `nazmur96/orca`, branch `claude-first`. Date: 2026-10-27.
Approved in the visual companion (`.superpowers/brainstorm/…/workbench-v4.html`,
`workbench-v5.html`).

## Goal

Opening the app should feel like Cursor's agent window, with Orca's workspaces
and multi-agent strengths kept:

```
[workspace + agents list] [Claude chat] [Workbench: Terminals | Files | Changes | Browser]
```

A second view, **Editor** (IDE ↗), is today's Phase 6 layout:
`[files/editor] [Claude panel]`.

## Views

|                    | Agents view (start screen)                 | Editor view          |
| ------------------ | ------------------------------------------ | -------------------- |
| Left               | Orca sidebar: workspaces with their agents | same, usually hidden |
| Middle/left column | Claude chat, ~38%                          | editor groups        |
| Right              | Workbench, ~62%                            | Claude panel, ~38%   |

- The app opens in the Agents view. The last view is remembered per workspace.
- **Switch:** title-bar buttons **Agents | IDE ↗**, shortcut `Ctrl+E` (Cursor's
  key). Voice dictation, which owns `Mod+E` upstream, moves to a free key chosen
  during planning.
- `Ctrl+B` (already Orca's sidebar toggle) shows/hides the agents list, like
  Cursor's "Show Sidebar".
- Switching never closes or moves tabs out of their sections; it changes which
  side the Claude panel sits on, the split ratio and whether the workbench shows
  its section bar.

## Workbench

The editor-area group becomes the workbench in the Agents view. Its tab strip
is split into **sections**, each with its own tab row, so terminals and files
never mix:

| Section      | Holds (tab content types)                | New items                                      |
| ------------ | ---------------------------------------- | ---------------------------------------------- |
| ›_ Terminals | `terminal` (shells, not agent chats)     | `＋`, `Ctrl+`` add a terminal here; `⫽` splits |
| Files        | `editor`, `diff`, `conflict-review`      | clicking a file in chat, Quick Open, file tree |
| Changes      | the workspace's changed files with diffs | Claude edits appear here                       |
| ◎ Browser    | `browser`                                | Claude's `open_preview`, links                 |

- The section bar shows counts (`Terminals 3`). Opening an item of a type
  switches to its section; a terminal never lands in Files and vice versa.
- `⤢` gives the workbench the full width (chat collapses), again restores.
- Mechanism: a section is a **filter on one group's tab strip** plus the rule
  "activate the most recent tab of the chosen section". No new tab store.
- Changes v1: list of changed files + Orca's existing diff viewer. Keep/Undo
  all arrives with Phase 3 (Cmd+K and inline accept/reject).
- Terminals started by Claude (`run_in_terminal`) are marked ✳.

## Chat column

- The Phase 6 Claude panel, placed left in the Agents view.
- File paths and commands in Claude's replies become links: a file opens in
  Files (at the line when given), a command offers "Run in terminal".
- The composer keeps Auto/Opus pills and gains a **Hand off ▾** pill (uses the
  existing `hand_off_to_agent` path).

## Look and feel (Cursor 60%)

- Claude-orange (`#D97757`) as the accent for the active section, focused tab
  border, primary buttons and the Claude dot; everything else uses Orca's
  existing tokens (no new greys).
- Left sidebar reads as an agents list: `＋ New agent` at the top; under each
  workspace its chats with a status word (working / needs you / done).
- Title bar: workspace name `orca-demo / main`, view switch, search hint.

## Delivery in four steps (each usable alone)

1. **Workbench sections** (Terminals / Files / Changes / Browser) in the editor
   area, both views.
2. **Agents view** layout + view switch + start in Agents view.
3. **Look and feel:** accent, agents-list sidebar polish, title bar.
4. **Clickable files/commands in chat** and the Hand off pill.

Each step gets its own short plan, tests, an in-app check, commit and push.

## Out of scope

Workspace rail as a separate column (Orca's sidebar already lists workspaces;
revisit after step 3), Keep/Undo all (Phase 3), Cursor's tiled multi-agent
grid.

## Risks

- Orca's tab and layout code is large and has strict line caps; sections must
  live in fork modules with one-line hooks, as in Phases 1 and 6.
- Hidden-window screenshots are unreliable; in-app checks use DOM geometry and
  a visible window at the end for the user.
