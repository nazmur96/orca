# Phase 4 — Claude knows the app

Fork: `nazmur96/orca`, branch `claude-first`. Date: 2026-10-26. Status: approved in chat, built.

## Goal

Claude in Orca behaves like Cursor's agent: it knows it lives inside the IDE,
operates the app with tools whose effects the user sees, and can answer "how do
I … in this app?" from Orca's own docs.

## What every structured Claude chat gets

An in-process MCP server `orca` (Agent SDK `createSdkMcpServer`), added in
`openClaudeStreamJsonConnection` so main chats and side chats both get it:

| Tool                               | Effect                                               | Approval               |
| ---------------------------------- | ---------------------------------------------------- | ---------------------- |
| `open_file(path, line?)`           | Opens the file at the line and brings the user to it | none                   |
| `show_diff(path)`                  | Opens the file's diff view                           | none                   |
| `open_changed_files()`             | Opens every git-changed file                         | none                   |
| `open_preview(url)`                | Opens an http(s) URL in Orca's browser               | none                   |
| `run_in_terminal(command, title?)` | New terminal tab running the command                 | chat's permission mode |
| `search_orca_docs(query)`          | Ranked excerpts from Orca's user docs                | none                   |

The read-only tools are pre-approved with `allowedTools` (an Orca-owned flag users
cannot pass themselves). `run_in_terminal` goes through the chat's mode.

The MCP server's `instructions` tell Claude it is Orca's built-in agent and when
to use each tool. Orca's `claude_code` system-prompt preset is untouched, so
CLAUDE.md, skills and hooks behave as before.

## How tools act

Each tool runs this app's `orca` CLI (`ORCA_CLI_COMMAND`) with `--json`, using
the session's own child env and cwd, scoped with `--worktree path:<cwd>`. This
reuses the CLI's validation and works on desktop and `orcad` alike, at about
0.3 s per call. Arguments go to `execFile` (no shell); Windows (`.cmd`
launcher needs a shell) gets no app tools for now.

Docs: `docs/site/content/docs` in dev, `resources/fork-docs` when packaged
(electron-builder `forkDocsResources`). Search drops frontmatter, imports and
stop words; ranks by query-term coverage, then dampened counts, titles weighted.

## Deviations from the chat design

- `list_open_tabs` dropped: the CLI has no editor-tab listing, and Phase 1's
  editor context already tells Claude the open file. `open_changed_files` added.
- The "you live in Orca" note is MCP server `instructions`, not a system-prompt
  append, to leave Orca's prompt contract alone.

## Out of scope

Settings changes, worktree management and agent handoff as tools (the bundled
`orca-cli` skill still covers them); Windows support.

## Verified

Unit: docs search ranking, prose stripping. Dev app (transcript
`mcp__orca__*` calls): `open_file` → "Opened src/price.ts at line 5." and the
editor showed it; `search_orca_docs` → "Tabs, panes & split layouts";
`run_in_terminal` → new terminal tab (0 → 1). Code: `src/main/fork/app-tools/`.
