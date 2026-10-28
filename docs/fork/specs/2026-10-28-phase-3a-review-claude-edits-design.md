# Phase 3a — Review Claude's edits (Keep / Undo)

Fork `nazmur96/orca`, branch `claude-first`. 2026-10-28. User delegated the
decisions ("do what you think best").

## Decisions

- **Baseline** = a file's content just before Claude first edits it (Cursor's
  behaviour), not git HEAD, so the user's own uncommitted work is never shown
  as Claude's.
- Scope: local structured Claude chats (main process). Edits made through
  Bash (`sed`, scripts) are not captured in v1.

## Main process — `src/main/fork/claude-edits/`

- `claude-edit-baselines.ts`: per workspace path, a map file → `{ before:
  string | null, sessionId, recordedAt }` (null = Claude created the file).
  Recorded once per file until kept or undone. Files over 2 MB or outside the
  workspace are skipped. In memory; a restart forgets pending reviews.
- `claudeEditHooks(cwd)`: SDK `PreToolUse` hook, matcher
  `Edit|MultiEdit|Write|NotebookEdit`, reads `file_path` / `notebook_path`
  from `tool_input` and records the baseline. Spread into the session options
  next to the Orca app tools in `claude-stream-json-connection.ts`.
- `listClaudeEdits(workspace)`: entries whose current content differs from the
  baseline (unchanged ones are dropped), with before/current text and +/−
  line counts.
- `keepClaudeEdits(workspace, paths?)` forgets baselines;
  `undoClaudeEdits(workspace, paths?)` writes the baseline back (deletes files
  Claude created), then forgets them.
- IPC `aiVault:listClaudeEdits`, `aiVault:resolveClaudeEdits`, registered next
  to the side-chat handler; preload + web stubs.

## Renderer — `src/renderer/src/fork/claude-edits/`

- `ClaudeEditsBar`: under the Claude panel's tab strip, shown while there are
  pending edits: `N files changed · Review · Keep all · Undo all` (Claude
  orange). Polls every 2.5 s while mounted.
- Review: a dialog with the file list (+/−) and a Monaco side-by-side diff of
  before vs now for the selected file, with per-file Keep / Undo.

## Testing

Unit (main): record once, skip outside/large files, new-file baseline, list
drops unchanged, keep, undo restores and deletes created files, hook extracts
paths. Prove it: ask Claude to edit `cart.ts` and create a file → bar shows 2
files → diff correct → Undo restores, Keep clears.

## Later (3a-2, 3b)

Inline gutter marks in the normal editor and per-hunk undo; Cmd+K inline edit
(Sonnet by default).
