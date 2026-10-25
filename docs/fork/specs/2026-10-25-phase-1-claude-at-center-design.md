# Phase 1 — Claude at the center

Fork: `nazmur96/orca`, branch `claude-first`. Upstream: `stablyai/orca`.
Date: 2026-10-25. Status: approved in chat, awaiting spec review.

## Goal

Make Claude the default, always-informed agent of Orca, the way Cursor's agent
is part of Cursor: you open a file, select code, ask a question, and Claude
already knows what you are looking at. No copy-paste, no terminal babysitting.

Handoff to other agents (Grok, Codex, …) stays exactly as upstream has it.

## What already exists upstream (no work)

- Structured Claude chat ("Chat UI", `src/renderer/src/components/native-chat`,
  `src/main/claude`) running the installed `claude` CLI through the Claude Agent
  SDK, so it uses the user's Claude subscription login.
- Permission-mode picker: `ask | accept-edits | auto | full-access`
  (`src/shared/agent-chat-permission-mode.ts`).
- Context usage ring (`NativeChatContextUsageRing.tsx`).
- "Add to chat" for text selected inside the chat transcript.

## A. Claude-first defaults

File: `src/shared/default-global-settings.ts` (values only, no new settings).

| Setting                    | Upstream        | Fork       |
| -------------------------- | --------------- | ---------- |
| `experimentalNativeChat`   | `false`         | `true`     |
| `defaultTuiAgent`          | `null`          | `'claude'` |
| `nativeChatPermissionMode` | `'full-access'` | `'auto'`   |

Defaults only fill settings the user has never set; anything chosen in
Settings keeps winning. Existing tests asserting the upstream defaults are
updated, not deleted.

## B. Automatic editor context

New code lives in `src/renderer/src/fork/editor-context/` so it rebases
cleanly. Upstream files get at most one-line hook calls.

### B1. Tracker — `editor-context-registry.ts`

- Keyed by worktree id. Holds the last-focused Monaco code editor in that
  worktree: workspace-relative file path, language id, cursor line, selection
  (start/end line + text, empty when nothing is selected).
- Fed by a hook (`useEditorContextTracking(editor, worktreeId, filePath)`)
  called once where Orca mounts its Monaco file editor. It listens to
  `onDidFocusEditorText`, `onDidChangeCursorSelection` and `onDidDispose`.
  Dispose clears the entry if it is the tracked editor.
- Diff editors, markdown rich editor and read-only viewers are not tracked.
- Plain module state plus a subscribe function (a small zustand store is fine
  if that is the repo's idiom); no persistence.

### B2. Snapshot — `editor-context-snapshot.ts`

Pure function `buildEditorContextSnapshot(entry, markers)` → snapshot or
`null`:

- `file`, `language`, `cursorLine`
- `selection`: lines + text, trimmed to 200 lines / 8,000 chars with a
  `truncated: true` flag
- `diagnostics`: that file's Monaco markers with severity Error or Warning,
  max 20, each `{ line, severity, message, code? }`, read via
  `monaco.editor.getModelMarkers({ resource })`

### B3. Wire format — `editor-context-block.ts`

Pure `formatEditorContextBlock(snapshot)` and `parseEditorContextBlock(text)`
(round-trip tested):

````text
<editor_context>
file: src/api/user.ts (typescript), cursor line 42
selection: lines 42-58
```ts
…selected code…
```
diagnostics:
- L45 error TS2322: Type 'string' is not assignable to type 'number'.
</editor_context>
````

The block is prepended to the user's message text. Dedupe: a hash of the
last-sent snapshot is kept per chat; an unchanged snapshot is not re-sent.

### B4. Composer chip — `EditorContextChip.tsx`

- Shown above the native-chat composer when the chat's worktree has a tracked
  editor: `📄 src/api/user.ts:42–58 · 2 errors` (no selection → `:42`).
- Click toggles "skip for the next message". `×` turns auto-context off for
  that chat (in-memory per chat; re-enable from the chip's ghost state).
- Hidden for non-Claude agents in Phase 1.

### B5. Send integration

One call in the native-chat send path
(`native-chat-runtime-send.ts` / `use-native-chat-interactive-send.ts`, the
exact site decided during planning): `withEditorContext(chatId, worktreeId,
text)` returns the text with the block prepended (or unchanged).

### B6. Transcript rendering

The user-message row detects a leading `<editor_context>` block via
`parseEditorContextBlock`, renders it as the same chip (expandable to show the
selection and diagnostics) and the remaining text as the message.

### B7. Add selection to chat — `Ctrl+Shift+L`

- New keybinding (editor scope) and editor context-menu item "Add selection
  to chat".
- Inserts a quoted reference (`src/api/user.ts:42-58` plus a fenced code
  block) into the worktree's active Claude chat composer through the existing
  draft-addition API, and focuses the composer. No active chat → opens a new
  Claude chat tab in that worktree first.

## C. Permission-mode shortcut

`Shift+Tab` while the native-chat composer is focused cycles
`ask → accept-edits → auto → full-access → ask`, same as the Claude Code CLI.
Composer-scoped, so Monaco's outdent is unaffected. Uses the existing mode
picker's setter.

Keys checked against `src/shared/keybindings`: `Ctrl+Shift+M` (new markdown
tab) and `Ctrl+L` (right sidebar) are taken; `Ctrl+Shift+L`, `Ctrl+;` (kept for
Phase 2 side chat) and composer `Shift+Tab` are free.

## Repo rules to respect

- All UI strings through `translate()` with catalog entries
  (`verify:localization-*`).
- Files under the max-lines ratchet; no `@ts-nocheck`.
- `pnpm lint` and `pnpm test` pass before calling the phase done.

## Error handling

- No tracked editor, disposed model, or markers unavailable → no block, no
  chip; sending never fails because of context.
- Remote/SSH worktrees: file path still known; if markers are unavailable,
  diagnostics are omitted.

## Testing

Unit (vitest): snapshot trimming and marker filtering; block format/parse
round-trip incl. code fences inside the selection; dedupe; mode cycle order.

Prove it (manual, `pnpm dev`):

1. Open a TS file, select a function, ask "what does this do?" without
   pasting — Claude answers about that exact code.
2. Introduce a type error, ask "fix the error" — Claude names the right line.
3. `Ctrl+Shift+L` quotes the selection into the composer.
4. `Shift+Tab` cycles the mode pill.
5. Session init proof shows subscription auth (no `ANTHROPIC_API_KEY`).

## Out of scope (later phases)

Side chat (P2), Cmd+K inline edit and inline accept/reject (P3), app-aware
tools (P4), review loop (P5), tab autocomplete (later/maybe).
