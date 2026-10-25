# Phase 1 — Claude at the center: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Claude the default structured-chat agent in the Orca fork and give it Cursor-style automatic knowledge of the editor (file, selection, cursor, diagnostics), plus `Ctrl+Shift+L` and `Shift+Tab` shortcuts.

**Architecture:** All new logic lives in `src/renderer/src/fork/editor-context/` as small pure modules (format/parse, snapshot, chat-tab pick, mode cycle) plus one tiny observable store and one React hook. Upstream files only receive call sites: `MonacoEditor.tsx` (tracking hook), `use-native-chat-structured-composer-send.ts` (prepend context), `NativeChatComposer.tsx` / `NativeChatComposerField.tsx` (chip + Shift+Tab), `NativeChatUserMessageRow.tsx` (transcript chip), keybinding definitions, and three default values.

**Tech Stack:** Electron 43, React 19, TypeScript, Monaco 0.55, zustand-backed `useAppStore`, vitest, sonner toasts, Orca `translate()` i18n.

**Spec:** `docs/fork/specs/2026-10-25-phase-1-claude-at-center-design.md`

## Global Constraints

- Every command runs inside the dev shell: prefix with `nix run ~/projects/orca -- -c '<cmd>'` (or work inside `nix develop`). Nothing is installed on the host.
- Repo rules (`AGENTS.md`): no type assertions except `as const` (unavoidable casts need a `SAFETY:` comment); comments only for "why", one line; no vague file names (`utils`, `helpers`); avoid low-value tests.
- All UI strings go through `translate(key, english, vars?)` from `@/i18n/i18n`; keys live under `components.native-chat.editorContext.*`.
- Electron UI validation: launch with `ORCA_BACKGROUND_LAUNCH=1`, never steal focus, verify with CDP screenshots.
- Before handoff: `pnpm check:changed --maxWorkers=2` passes.
- Defaults: `experimentalNativeChat: true`, `defaultTuiAgent: 'claude'`, `nativeChatPermissionMode: 'auto'`.
- Limits: selection ≤ 200 lines and ≤ 8,000 chars (`truncated` flag); ≤ 20 diagnostics, Error/Warning only.
- Shortcuts: `Mod+Shift+L` (editor scope) = add selection to chat; `Shift+Tab` in the native-chat composer = cycle permission mode. `Mod+;` stays free for Phase 2.
- Auto-context applies only to structured chats whose agent is `'claude'`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Structure

Create (all under `src/renderer/src/fork/editor-context/`):

| File                                   | Responsibility                                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `editor-context-types.ts`              | Shared types: entry, snapshot, selection, diagnostic, marker                                             |
| `editor-context-block.ts`              | Pure: format/parse the `<editor_context>` block; format a selection quote                                |
| `editor-context-block.test.ts`         | Round-trip + fence + quote tests                                                                         |
| `editor-context-snapshot.ts`           | Pure: entry + markers → trimmed snapshot; chip label                                                     |
| `editor-context-snapshot.test.ts`      | Trimming, marker filtering, label tests                                                                  |
| `editor-context-store.ts`              | Observable store: tracked editor per worktree, per-chat state (lastSent/skipNext/disabled) + React hooks |
| `editor-context-send.ts`               | `prepareEditorContext()` — decides whether/what to prepend, commit-on-accept                             |
| `editor-context-send.test.ts`          | Dedupe, skip, disabled, commit tests                                                                     |
| `use-editor-context-tracking.ts`       | React hook wiring a Monaco editor into the store + installing `Ctrl+Shift+L`                             |
| `editor-context-add-selection.ts`      | Pick the worktree's Claude chat tab, quote selection into its draft                                      |
| `editor-context-add-selection.test.ts` | Chat-tab pick tests                                                                                      |
| `permission-mode-cycle.ts`             | Pure next-mode + composer Shift+Tab handler                                                              |
| `permission-mode-cycle.test.ts`        | Cycle order tests                                                                                        |
| `EditorContextChip.tsx`                | Composer chip + transcript chip                                                                          |

Modify:

- `src/shared/default-global-settings.ts` — three defaults
- `src/shared/keybindings/types.ts` — add `'editor.addSelectionToChat'` to the action id union
- `src/shared/keybindings/definitions-core-3.ts` — add the definition after `editor.addReviewNote`
- `src/renderer/src/components/editor/MonacoEditor.tsx` — call `useEditorContextTracking`
- `src/renderer/src/components/native-chat/use-native-chat-structured-composer-send.ts` — prepend context, commit on accept
- `src/renderer/src/components/native-chat/NativeChatComposerField.tsx` — optional `contextChip` prop
- `src/renderer/src/components/native-chat/NativeChatComposer.tsx` — pass chip, wrap key handler
- `src/renderer/src/components/native-chat/NativeChatUserMessageRow.tsx` — render transcript chip
- `src/renderer/src/i18n/locales/*.json` — via `pnpm sync:localization-catalog`

---

### Task 1: Claude-first defaults

**Files:**

- Modify: `src/shared/default-global-settings.ts:131,139,192`
- Test: existing tests that assert the old defaults (found in Step 2)

**Interfaces:**

- Consumes: nothing
- Produces: new default values only

- [ ] **Step 1: Change the three defaults**

In `src/shared/default-global-settings.ts`:

```ts
    experimentalNativeChat: true,
```

```ts
    // New chats of agents on their own settings; others start in their agent permission.
    nativeChatPermissionMode: 'auto',
```

```ts
    defaultTuiAgent: 'claude',
```

- [ ] **Step 2: Run the affected tests**

Run: `nix run ~/projects/orca -- -c 'pnpm test:changed --maxWorkers=2'`
Expected: some tests FAIL because they relied on `experimentalNativeChat: false`, `nativeChatPermissionMode: 'full-access'` or `defaultTuiAgent: null`.

- [ ] **Step 3: Pin the old values in the failing tests' fixtures**

For each failing test, the test is about upstream behaviour, not about the fork's defaults. Where it builds settings from defaults (e.g. `buildDefaultSettings(...)` or `getDefaultSettings()`), add the old value explicitly to that test's settings object, e.g.:

```ts
const settings = { ...buildDefaultSettings(args), experimentalNativeChat: false }
```

Do not delete tests or loosen their assertions. If a test asserts the literal default value itself, update the expected literal to the new value.

- [ ] **Step 4: Re-run until green**

Run: `nix run ~/projects/orca -- -c 'pnpm test:changed --maxWorkers=2'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/default-global-settings.ts src
git commit -m "feat(fork): default to Claude structured chat in auto mode

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Context block format/parse

**Files:**

- Create: `src/renderer/src/fork/editor-context/editor-context-types.ts`
- Create: `src/renderer/src/fork/editor-context/editor-context-block.ts`
- Test: `src/renderer/src/fork/editor-context/editor-context-block.test.ts`

**Interfaces:**

- Produces:
  - types `EditorContextSnapshot`, `EditorContextSelection`, `EditorContextDiagnostic`, `EditorContextEntry`, `EditorContextMarker`
  - `formatEditorContextBlock(snapshot: EditorContextSnapshot): string`
  - `parseEditorContextBlock(text: string): { snapshot: EditorContextSnapshot; body: string } | null`
  - `formatSelectionQuote(file: string, language: string, selection: { startLine: number; endLine: number; text: string }): string`

- [ ] **Step 1: Write the types**

`editor-context-types.ts`:

```ts
export type EditorContextSelection = {
  startLine: number
  endLine: number
  text: string
  truncated: boolean
}

export type EditorContextDiagnostic = {
  line: number
  severity: 'error' | 'warning'
  message: string
  code?: string
}

export type EditorContextSnapshot = {
  file: string
  language: string
  cursorLine: number
  selection: EditorContextSelection | null
  diagnostics: readonly EditorContextDiagnostic[]
}

/** The subset of a Monaco marker the snapshot reads. */
export type EditorContextMarker = {
  startLineNumber: number
  severity: number
  message: string
  code?: string | { value: string }
}

/** The live state of the last-focused code editor in a worktree. */
export type EditorContextEntry = {
  owner: object
  file: string
  language: string
  cursorLine: number
  selection: { startLine: number; endLine: number; text: string } | null
  readMarkers: () => readonly EditorContextMarker[]
}
```

- [ ] **Step 2: Write the failing tests**

`editor-context-block.test.ts`:

`````ts
import { describe, expect, it } from 'vitest'
import {
  formatEditorContextBlock,
  formatSelectionQuote,
  parseEditorContextBlock
} from './editor-context-block'
import type { EditorContextSnapshot } from './editor-context-types'

const snapshot: EditorContextSnapshot = {
  file: 'src/api/user (v2).ts',
  language: 'typescript',
  cursorLine: 42,
  selection: { startLine: 42, endLine: 44, text: 'const a = 1\n```\nconst b = 2', truncated: true },
  diagnostics: [
    { line: 45, severity: 'error', message: "Type 'string' is not assignable.", code: 'TS2322' },
    { line: 50, severity: 'warning', message: 'Unused variable.' }
  ]
}

describe('editor context block', () => {
  it('round-trips a full snapshot and keeps the message body', () => {
    const text = `${formatEditorContextBlock(snapshot)}\nwhat does this do?`
    expect(parseEditorContextBlock(text)).toEqual({ snapshot, body: 'what does this do?' })
  })

  it('round-trips a snapshot without selection or diagnostics', () => {
    const bare = { ...snapshot, selection: null, diagnostics: [] }
    expect(parseEditorContextBlock(`${formatEditorContextBlock(bare)}\nhi`)).toEqual({
      snapshot: bare,
      body: 'hi'
    })
  })

  it('fences the selection longer than any backtick run inside it', () => {
    expect(formatEditorContextBlock(snapshot)).toContain('````typescript\n')
  })

  it('ignores text that does not start with a block', () => {
    expect(parseEditorContextBlock('hello <editor_context>')).toBeNull()
  })

  it('formats a selection quote with path, range and fence', () => {
    expect(
      formatSelectionQuote('a.ts', 'typescript', { startLine: 3, endLine: 4, text: 'x\ny' })
    ).toBe('a.ts:3-4\n```typescript\nx\ny\n```\n')
  })
})
`````

- [ ] **Step 3: Run to verify failure**

Run: `nix run ~/projects/orca -- -c 'pnpm test src/renderer/src/fork/editor-context/editor-context-block.test.ts'`
Expected: FAIL — cannot resolve `./editor-context-block`.

- [ ] **Step 4: Implement**

`editor-context-block.ts`:

```ts
import type {
  EditorContextDiagnostic,
  EditorContextSelection,
  EditorContextSnapshot
} from './editor-context-types'

const OPEN = '<editor_context>'
const CLOSE = '</editor_context>'
const FILE_LINE = /^file: (.+) \(([^)]*)\), cursor line (\d+)$/
const SELECTION_LINE = /^selection: lines (\d+)-(\d+)( \(truncated\))?$/
const DIAGNOSTIC_LINE = /^- L(\d+) (error|warning)(?: (\S+))?: (.*)$/
const FENCE_OPEN = /^(`{3,})(\S*)$/

function fenceFor(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length))
  return '`'.repeat(Math.max(3, longest + 1))
}

function formatDiagnostic(d: EditorContextDiagnostic): string {
  return `- L${d.line} ${d.severity}${d.code ? ` ${d.code}` : ''}: ${d.message}`
}

export function formatEditorContextBlock(snapshot: EditorContextSnapshot): string {
  const lines = [
    OPEN,
    `file: ${snapshot.file} (${snapshot.language}), cursor line ${snapshot.cursorLine}`
  ]
  const { selection } = snapshot
  if (selection) {
    const fence = fenceFor(selection.text)
    lines.push(
      `selection: lines ${selection.startLine}-${selection.endLine}${selection.truncated ? ' (truncated)' : ''}`,
      `${fence}${snapshot.language}`,
      selection.text,
      fence
    )
  }
  if (snapshot.diagnostics.length > 0) {
    lines.push('diagnostics:', ...snapshot.diagnostics.map(formatDiagnostic))
  }
  lines.push(CLOSE)
  return lines.join('\n')
}

function parseSelection(
  lines: readonly string[],
  at: number
): { selection: EditorContextSelection; next: number } | null {
  const header = SELECTION_LINE.exec(lines[at] ?? '')
  const open = FENCE_OPEN.exec(lines[at + 1] ?? '')
  if (!header || !open) {
    return null
  }
  const close = lines.indexOf(open[1], at + 2)
  if (close === -1) {
    return null
  }
  return {
    selection: {
      startLine: Number(header[1]),
      endLine: Number(header[2]),
      text: lines.slice(at + 2, close).join('\n'),
      truncated: header[3] !== undefined
    },
    next: close + 1
  }
}

export function parseEditorContextBlock(
  text: string
): { snapshot: EditorContextSnapshot; body: string } | null {
  if (!text.startsWith(`${OPEN}\n`)) {
    return null
  }
  const end = text.indexOf(`\n${CLOSE}`)
  if (end === -1) {
    return null
  }
  const lines = text.slice(OPEN.length + 1, end).split('\n')
  const file = FILE_LINE.exec(lines[0] ?? '')
  if (!file) {
    return null
  }
  let at = 1
  let selection: EditorContextSelection | null = null
  const parsedSelection = parseSelection(lines, at)
  if (parsedSelection) {
    selection = parsedSelection.selection
    at = parsedSelection.next
  }
  const diagnostics: EditorContextDiagnostic[] = []
  if (lines[at] === 'diagnostics:') {
    for (const line of lines.slice(at + 1)) {
      const d = DIAGNOSTIC_LINE.exec(line)
      if (d) {
        diagnostics.push({
          line: Number(d[1]),
          severity: d[2] === 'error' ? 'error' : 'warning',
          message: d[4],
          ...(d[3] ? { code: d[3] } : {})
        })
      }
    }
  }
  const rest = text.slice(end + CLOSE.length + 1)
  return {
    snapshot: {
      file: file[1],
      language: file[2],
      cursorLine: Number(file[3]),
      selection,
      diagnostics
    },
    body: rest.startsWith('\n') ? rest.slice(1) : rest
  }
}

export function formatSelectionQuote(
  file: string,
  language: string,
  selection: { startLine: number; endLine: number; text: string }
): string {
  const fence = fenceFor(selection.text)
  return `${file}:${selection.startLine}-${selection.endLine}\n${fence}${language}\n${selection.text}\n${fence}\n`
}
```

- [ ] **Step 5: Run to verify pass**

Run: `nix run ~/projects/orca -- -c 'pnpm test src/renderer/src/fork/editor-context/editor-context-block.test.ts'`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/fork/editor-context
git commit -m "feat(fork): editor context block format and parse

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Snapshot builder and chip label

**Files:**

- Create: `src/renderer/src/fork/editor-context/editor-context-snapshot.ts`
- Test: `src/renderer/src/fork/editor-context/editor-context-snapshot.test.ts`

**Interfaces:**

- Consumes: types from Task 2
- Produces:
  - `buildEditorContextSnapshot(entry: Pick<EditorContextEntry, "file" | "language" | "cursorLine" | "selection">, markers: readonly EditorContextMarker[]): EditorContextSnapshot`
  - `editorContextLabel(snapshot: EditorContextSnapshot): string`
  - constants `EDITOR_CONTEXT_MAX_SELECTION_LINES = 200`, `EDITOR_CONTEXT_MAX_SELECTION_CHARS = 8000`, `EDITOR_CONTEXT_MAX_DIAGNOSTICS = 20`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { buildEditorContextSnapshot, editorContextLabel } from './editor-context-snapshot'

const base = { file: 'a.ts', language: 'typescript', cursorLine: 3, selection: null }

describe('buildEditorContextSnapshot', () => {
  it('keeps errors and warnings only, sorted by line, capped at 20', () => {
    const markers = [
      { startLineNumber: 9, severity: 4, message: 'warn' },
      { startLineNumber: 2, severity: 8, message: 'err', code: { value: 'TS1' } },
      { startLineNumber: 5, severity: 2, message: 'info' },
      ...Array.from({ length: 30 }, (_, i) => ({
        startLineNumber: 100 + i,
        severity: 8,
        message: 'x'
      }))
    ]
    const { diagnostics } = buildEditorContextSnapshot(base, markers)
    expect(diagnostics).toHaveLength(20)
    expect(diagnostics[0]).toEqual({ line: 2, severity: 'error', message: 'err', code: 'TS1' })
    expect(diagnostics[1]).toEqual({ line: 9, severity: 'warning', message: 'warn' })
  })

  it('trims a selection to 200 lines and flags it', () => {
    const text = Array.from({ length: 250 }, (_, i) => `l${i}`).join('\n')
    const { selection } = buildEditorContextSnapshot(
      { ...base, selection: { startLine: 1, endLine: 250, text } },
      []
    )
    expect(selection?.text.split('\n')).toHaveLength(200)
    expect(selection?.truncated).toBe(true)
  })

  it('trims a selection to 8000 chars and flags it', () => {
    const { selection } = buildEditorContextSnapshot(
      { ...base, selection: { startLine: 1, endLine: 1, text: 'x'.repeat(9000) } },
      []
    )
    expect(selection?.text).toHaveLength(8000)
    expect(selection?.truncated).toBe(true)
  })
})

describe('editorContextLabel', () => {
  it('shows the selected range and error count', () => {
    const snapshot = buildEditorContextSnapshot(
      { ...base, selection: { startLine: 4, endLine: 9, text: 'x' } },
      [
        { startLineNumber: 5, severity: 8, message: 'e' },
        { startLineNumber: 6, severity: 4, message: 'w' }
      ]
    )
    expect(editorContextLabel(snapshot)).toBe('a.ts:4–9 · 1 error')
  })

  it('shows the cursor line without a selection', () => {
    expect(editorContextLabel(buildEditorContextSnapshot(base, []))).toBe('a.ts:3')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `nix run ~/projects/orca -- -c 'pnpm test src/renderer/src/fork/editor-context/editor-context-snapshot.test.ts'`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type {
  EditorContextDiagnostic,
  EditorContextEntry,
  EditorContextMarker,
  EditorContextSelection,
  EditorContextSnapshot
} from './editor-context-types'

export const EDITOR_CONTEXT_MAX_SELECTION_LINES = 200
export const EDITOR_CONTEXT_MAX_SELECTION_CHARS = 8000
export const EDITOR_CONTEXT_MAX_DIAGNOSTICS = 20

// Monaco MarkerSeverity values.
const SEVERITY_ERROR = 8
const SEVERITY_WARNING = 4

function trimSelection(
  selection: NonNullable<EditorContextEntry['selection']>
): EditorContextSelection {
  const lines = selection.text.split('\n')
  let text = lines.slice(0, EDITOR_CONTEXT_MAX_SELECTION_LINES).join('\n')
  let truncated = lines.length > EDITOR_CONTEXT_MAX_SELECTION_LINES
  if (text.length > EDITOR_CONTEXT_MAX_SELECTION_CHARS) {
    text = text.slice(0, EDITOR_CONTEXT_MAX_SELECTION_CHARS)
    truncated = true
  }
  return { startLine: selection.startLine, endLine: selection.endLine, text, truncated }
}

function toDiagnostic(marker: EditorContextMarker): EditorContextDiagnostic | null {
  const severity =
    marker.severity === SEVERITY_ERROR
      ? 'error'
      : marker.severity === SEVERITY_WARNING
        ? 'warning'
        : null
  if (!severity) {
    return null
  }
  const code = typeof marker.code === 'string' ? marker.code : marker.code?.value
  return {
    line: marker.startLineNumber,
    severity,
    message: marker.message,
    ...(code ? { code } : {})
  }
}

export function buildEditorContextSnapshot(
  entry: Pick<EditorContextEntry, 'file' | 'language' | 'cursorLine' | 'selection'>,
  markers: readonly EditorContextMarker[]
): EditorContextSnapshot {
  const diagnostics = markers
    .map(toDiagnostic)
    .filter((d): d is EditorContextDiagnostic => d !== null)
    .sort((a, b) => a.line - b.line)
    .slice(0, EDITOR_CONTEXT_MAX_DIAGNOSTICS)
  return {
    file: entry.file,
    language: entry.language,
    cursorLine: entry.cursorLine,
    selection: entry.selection ? trimSelection(entry.selection) : null,
    diagnostics
  }
}

export function editorContextLabel(snapshot: EditorContextSnapshot): string {
  const where = snapshot.selection
    ? `${snapshot.selection.startLine}–${snapshot.selection.endLine}`
    : `${snapshot.cursorLine}`
  const errors = snapshot.diagnostics.filter((d) => d.severity === 'error').length
  const suffix = errors === 0 ? '' : ` · ${errors} ${errors === 1 ? 'error' : 'errors'}`
  return `${snapshot.file}:${where}${suffix}`
}
```

- [ ] **Step 4: Run to verify pass**

Run: `nix run ~/projects/orca -- -c 'pnpm test src/renderer/src/fork/editor-context/editor-context-snapshot.test.ts'`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/fork/editor-context
git commit -m "feat(fork): editor context snapshot builder

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Store and send decision

**Files:**

- Create: `src/renderer/src/fork/editor-context/editor-context-store.ts`
- Create: `src/renderer/src/fork/editor-context/editor-context-send.ts`
- Test: `src/renderer/src/fork/editor-context/editor-context-send.test.ts`

**Interfaces:**

- Consumes: `buildEditorContextSnapshot` (Task 3), `formatEditorContextBlock` (Task 2), `EditorContextEntry` (Task 2)
- Produces:
  - store: `setEditorContextEntry(worktreeId: string, entry: EditorContextEntry): void`, `clearEditorContextEntry(worktreeId: string, owner: object): void`, `readEditorContextEntry(worktreeId: string): EditorContextEntry | null`, `readEditorContextChat(scopeKey: string): EditorContextChatState`, `updateEditorContextChat(scopeKey: string, patch: Partial<EditorContextChatState>): void`, `useEditorContextEntry(worktreeId: string | undefined): EditorContextEntry | null`, `useEditorContextChat(scopeKey: string): EditorContextChatState`, `resetEditorContextStoreForTests(): void`
  - type `EditorContextChatState = { lastSent: string | null; skipNext: boolean; disabled: boolean }`
  - `prepareEditorContext(scopeKey: string, worktreeId: string | undefined, text: string): { text: string; commit: () => void }`

- [ ] **Step 1: Write the store**

`editor-context-store.ts`:

```ts
import { useSyncExternalStore } from 'react'
import type { EditorContextEntry } from './editor-context-types'

export type EditorContextChatState = {
  lastSent: string | null
  skipNext: boolean
  disabled: boolean
}

const DEFAULT_CHAT: EditorContextChatState = { lastSent: null, skipNext: false, disabled: false }

const entries = new Map<string, EditorContextEntry>()
const chats = new Map<string, EditorContextChatState>()
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setEditorContextEntry(worktreeId: string, entry: EditorContextEntry): void {
  entries.set(worktreeId, entry)
  emit()
}

/** Only the editor that owns the entry may clear it, so closing a background tab keeps the focused one. */
export function clearEditorContextEntry(worktreeId: string, owner: object): void {
  if (entries.get(worktreeId)?.owner === owner) {
    entries.delete(worktreeId)
    emit()
  }
}

export function readEditorContextEntry(worktreeId: string): EditorContextEntry | null {
  return entries.get(worktreeId) ?? null
}

export function readEditorContextChat(scopeKey: string): EditorContextChatState {
  return chats.get(scopeKey) ?? DEFAULT_CHAT
}

export function updateEditorContextChat(
  scopeKey: string,
  patch: Partial<EditorContextChatState>
): void {
  chats.set(scopeKey, { ...readEditorContextChat(scopeKey), ...patch })
  emit()
}

export function useEditorContextEntry(worktreeId: string | undefined): EditorContextEntry | null {
  return useSyncExternalStore(subscribe, () =>
    worktreeId ? readEditorContextEntry(worktreeId) : null
  )
}

export function useEditorContextChat(scopeKey: string): EditorContextChatState {
  return useSyncExternalStore(subscribe, () => readEditorContextChat(scopeKey))
}

export function resetEditorContextStoreForTests(): void {
  entries.clear()
  chats.clear()
  listeners.clear()
}
```

- [ ] **Step 2: Write the failing send tests**

`editor-context-send.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prepareEditorContext } from './editor-context-send'
import {
  readEditorContextChat,
  resetEditorContextStoreForTests,
  setEditorContextEntry,
  updateEditorContextChat
} from './editor-context-store'

const owner = {}

function track(cursorLine = 3): void {
  setEditorContextEntry('wt', {
    owner,
    file: 'a.ts',
    language: 'typescript',
    cursorLine,
    selection: null,
    readMarkers: () => []
  })
}

describe('prepareEditorContext', () => {
  beforeEach(() => resetEditorContextStoreForTests())

  it('leaves text alone without a tracked editor', () => {
    expect(prepareEditorContext('chat', 'wt', 'hi').text).toBe('hi')
  })

  it('prepends the block and skips an unchanged snapshot after commit', () => {
    track()
    const first = prepareEditorContext('chat', 'wt', 'hi')
    expect(first.text).toMatch(
      /^<editor_context>\nfile: a\.ts \(typescript\), cursor line 3\n<\/editor_context>\nhi$/
    )
    first.commit()
    expect(prepareEditorContext('chat', 'wt', 'again').text).toBe('again')
    track(7)
    expect(prepareEditorContext('chat', 'wt', 'moved').text).toContain('cursor line 7')
  })

  it('re-sends when the first send was never committed', () => {
    track()
    prepareEditorContext('chat', 'wt', 'refused')
    expect(prepareEditorContext('chat', 'wt', 'retry').text).toContain('<editor_context>')
  })

  it('honours skip-next once and disabled always', () => {
    track()
    updateEditorContextChat('chat', { skipNext: true })
    const skipped = prepareEditorContext('chat', 'wt', 'a')
    expect(skipped.text).toBe('a')
    skipped.commit()
    expect(readEditorContextChat('chat').skipNext).toBe(false)
    updateEditorContextChat('chat', { disabled: true })
    expect(prepareEditorContext('chat', 'wt', 'b').text).toBe('b')
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `nix run ~/projects/orca -- -c 'pnpm test src/renderer/src/fork/editor-context/editor-context-send.test.ts'`
Expected: FAIL — `./editor-context-send` not found.

- [ ] **Step 4: Implement**

`editor-context-send.ts`:

```ts
import { formatEditorContextBlock } from './editor-context-block'
import { buildEditorContextSnapshot } from './editor-context-snapshot'
import {
  readEditorContextChat,
  readEditorContextEntry,
  updateEditorContextChat
} from './editor-context-store'

const NO_COMMIT = (): void => {}

/** State changes only on commit, so a refused send re-attaches the same context next time. */
export function prepareEditorContext(
  scopeKey: string,
  worktreeId: string | undefined,
  text: string
): { text: string; commit: () => void } {
  const chat = readEditorContextChat(scopeKey)
  if (chat.disabled || !worktreeId) {
    return { text, commit: NO_COMMIT }
  }
  if (chat.skipNext) {
    return { text, commit: () => updateEditorContextChat(scopeKey, { skipNext: false }) }
  }
  const entry = readEditorContextEntry(worktreeId)
  if (!entry) {
    return { text, commit: NO_COMMIT }
  }
  const snapshot = buildEditorContextSnapshot(entry, entry.readMarkers())
  const key = JSON.stringify(snapshot)
  if (key === chat.lastSent) {
    return { text, commit: NO_COMMIT }
  }
  return {
    text: `${formatEditorContextBlock(snapshot)}\n${text}`,
    commit: () => updateEditorContextChat(scopeKey, { lastSent: key })
  }
}
```

- [ ] **Step 5: Run to verify pass**

Run: `nix run ~/projects/orca -- -c 'pnpm test src/renderer/src/fork/editor-context/editor-context-send.test.ts'`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/fork/editor-context
git commit -m "feat(fork): editor context store and send decision

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Track Monaco editors and attach context on send

**Files:**

- Create: `src/renderer/src/fork/editor-context/use-editor-context-tracking.ts`
- Modify: `src/renderer/src/components/editor/MonacoEditor.tsx` (imports + one hook call after `useMonacoEditorMount`)
- Modify: `src/renderer/src/components/native-chat/use-native-chat-structured-composer-send.ts:108-125`

**Interfaces:**

- Consumes: store (Task 4), `prepareEditorContext` (Task 4)
- Produces: `useEditorContextTracking(args: { editor: editor.IStandaloneCodeEditor | null; worktreeId: string | undefined; relativePath: string; language: string; enabled: boolean }): void`

- [ ] **Step 1: Write the hook**

`use-editor-context-tracking.ts`:

```ts
import { useEffect } from 'react'
import * as monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'
import { clearEditorContextEntry, setEditorContextEntry } from './editor-context-store'
import { installAddSelectionToChatShortcut } from './editor-context-add-selection'

export function useEditorContextTracking({
  editor: codeEditor,
  worktreeId,
  relativePath,
  language,
  enabled
}: {
  editor: editor.IStandaloneCodeEditor | null
  worktreeId: string | undefined
  relativePath: string
  language: string
  enabled: boolean
}): void {
  useEffect(() => {
    if (!codeEditor || !worktreeId || !enabled) {
      return
    }
    const publish = (): void => {
      const model = codeEditor.getModel()
      const selection = codeEditor.getSelection()
      if (!model || !selection) {
        return
      }
      setEditorContextEntry(worktreeId, {
        owner: codeEditor,
        file: relativePath,
        language,
        cursorLine: selection.positionLineNumber,
        selection: selection.isEmpty()
          ? null
          : {
              startLine: selection.startLineNumber,
              endLine: selection.endLineNumber,
              text: model.getValueInRange(selection)
            },
        readMarkers: () => monaco.editor.getModelMarkers({ resource: model.uri })
      })
    }
    const subscriptions = [
      codeEditor.onDidFocusEditorText(publish),
      codeEditor.onDidChangeCursorSelection(() => {
        if (codeEditor.hasTextFocus()) {
          publish()
        }
      })
    ]
    if (codeEditor.hasTextFocus()) {
      publish()
    }
    const removeShortcut = installAddSelectionToChatShortcut(
      codeEditor.getContainerDomNode(),
      worktreeId
    )
    return () => {
      for (const subscription of subscriptions) {
        subscription.dispose()
      }
      removeShortcut()
      clearEditorContextEntry(worktreeId, codeEditor)
    }
  }, [codeEditor, worktreeId, relativePath, language, enabled])
}
```

(`installAddSelectionToChatShortcut` is created in Task 7; until then create `editor-context-add-selection.ts` with this stub so the build stays green, and Task 7 replaces it:)

```ts
export function installAddSelectionToChatShortcut(
  _target: HTMLElement,
  _worktreeId: string
): () => void {
  return () => {}
}
```

- [ ] **Step 2: Call it from MonacoEditor**

In `src/renderer/src/components/editor/MonacoEditor.tsx` add the import with the other local hooks:

```ts
import { useEditorContextTracking } from '@/fork/editor-context/use-editor-context-tracking'
```

and directly after the `const handleMount = useMonacoEditorMount({ ... })` call:

```ts
useEditorContextTracking({
  editor: mountedEditor,
  worktreeId,
  relativePath,
  language,
  enabled: !readOnly && !passiveMirror
})
```

Check `mountedEditor`'s declared type in this file; if it is `editor.IStandaloneCodeEditor | null` pass it as is, otherwise adapt the hook's parameter type to match it (no casts).

- [ ] **Step 3: Attach context in the structured send hook**

In `use-native-chat-structured-composer-send.ts` add:

```ts
import { prepareEditorContext } from '@/fork/editor-context/editor-context-send'
```

Replace the dispatch block (currently `const isCurrent = …` through the start of `.then(`) so it reads:

```ts
      const isCurrent = structuredTransport.capturePresentation()
      const submitted = readNativeChatComposerDraft(draftScopeKey)
      const context =
        agent === 'claude' && !hostCommand
          ? prepareEditorContext(draftScopeKey, structuredTransport.worktreeId, text)
          : null
      await dispatchNativeChatStructuredComposerText(
        structuredTransport,
        context?.text ?? text,
        attachments,
        promptSkillRefs(submitted.document)
      )
        .then(({ accepted, error, refusedWhile, revealsTranscript }) => {
          if (!hostCommand || isCurrent()) {
            structuredTransport.onError(error, refusedWhile ? { refusedWhile } : undefined)
          }
          if (!accepted) {
            return
          }
          context?.commit()
```

(keep everything after `if (!accepted) { return }` unchanged; only `context?.commit()` is inserted.)

- [ ] **Step 4: Typecheck and run the native-chat tests**

Run: `nix run ~/projects/orca -- -c 'pnpm tc && pnpm test src/renderer/src/components/native-chat src/renderer/src/fork'`
Expected: PASS. If a test of the send hook asserts the exact text passed to `transport.send`, it uses an agent other than `'claude'` or no tracked editor, so it still passes; if not, reset the store in that test with `resetEditorContextStoreForTests()`.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/fork src/renderer/src/components/editor/MonacoEditor.tsx src/renderer/src/components/native-chat/use-native-chat-structured-composer-send.ts
git commit -m "feat(fork): attach editor context to Claude chat messages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Composer and transcript chips

**Files:**

- Create: `src/renderer/src/fork/editor-context/EditorContextChip.tsx`
- Modify: `src/renderer/src/components/native-chat/NativeChatComposerField.tsx` (prop type, destructure, render)
- Modify: `src/renderer/src/components/native-chat/NativeChatComposer.tsx` (pass `contextChip`)
- Modify: `src/renderer/src/components/native-chat/NativeChatUserMessageRow.tsx` (parse + render)

**Interfaces:**

- Consumes: `useEditorContextEntry`, `useEditorContextChat`, `updateEditorContextChat` (Task 4); `buildEditorContextSnapshot`, `editorContextLabel` (Task 3); `parseEditorContextBlock` (Task 2)
- Produces: `EditorContextComposerChip({ scopeKey, worktreeId }: { scopeKey: string; worktreeId: string | undefined })`, `EditorContextTranscriptChip({ snapshot }: { snapshot: EditorContextSnapshot })`

- [ ] **Step 1: Write the chips**

`EditorContextChip.tsx`:

```tsx
import { FileCode, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { buildEditorContextSnapshot, editorContextLabel } from './editor-context-snapshot'
import {
  updateEditorContextChat,
  useEditorContextChat,
  useEditorContextEntry
} from './editor-context-store'
import type { EditorContextSnapshot } from './editor-context-types'

export function EditorContextComposerChip({
  scopeKey,
  worktreeId
}: {
  scopeKey: string
  worktreeId: string | undefined
}): React.JSX.Element | null {
  const entry = useEditorContextEntry(worktreeId)
  const chat = useEditorContextChat(scopeKey)
  if (!entry) {
    return null
  }
  if (chat.disabled) {
    return (
      <div className="mb-1 px-1">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="text-chat-foreground-faint"
          onClick={() => updateEditorContextChat(scopeKey, { disabled: false, lastSent: null })}
        >
          <FileCode className="size-3.5" aria-hidden />
          {translate('components.native-chat.editorContext.turnOn', 'Editor context off — turn on')}
        </Button>
      </div>
    )
  }
  const label = editorContextLabel(buildEditorContextSnapshot(entry, entry.readMarkers()))
  return (
    <div className="mb-1 flex items-center gap-0.5 px-1">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        aria-pressed={!chat.skipNext}
        title={translate(
          'components.native-chat.editorContext.toggleNext',
          'Include the editor context in the next message'
        )}
        className={cn('max-w-full min-w-0 shrink', chat.skipNext && 'line-through opacity-60')}
        onClick={() => updateEditorContextChat(scopeKey, { skipNext: !chat.skipNext })}
      >
        <FileCode className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        aria-label={translate(
          'components.native-chat.editorContext.turnOff',
          'Turn off editor context for this chat'
        )}
        onClick={() => updateEditorContextChat(scopeKey, { disabled: true })}
      >
        <X className="size-3" aria-hidden />
      </Button>
    </div>
  )
}

export function EditorContextTranscriptChip({
  snapshot
}: {
  snapshot: EditorContextSnapshot
}): React.JSX.Element {
  return (
    <details className="mb-1.5 text-xs text-chat-foreground-faint">
      <summary className="flex cursor-pointer items-center gap-1 select-none">
        <FileCode className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{editorContextLabel(snapshot)}</span>
      </summary>
      {snapshot.selection ? (
        <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-chat-composer-surface p-2 font-mono">
          {snapshot.selection.text}
        </pre>
      ) : null}
      {snapshot.diagnostics.length > 0 ? (
        <ul className="mt-1 list-disc pl-4">
          {snapshot.diagnostics.map((d) => (
            <li key={`${d.line}:${d.message}`}>
              {`L${d.line} ${d.severity}${d.code ? ` ${d.code}` : ''}: ${d.message}`}
            </li>
          ))}
        </ul>
      ) : null}
    </details>
  )
}
```

Before committing, check every class used (`text-chat-foreground-faint`, `bg-chat-composer-surface`) exists in `src/renderer/src/assets/main.css` or is already used elsewhere in `components/native-chat`; replace any that is not with the closest documented token (`docs/STYLEGUIDE.md`).

- [ ] **Step 2: Add the `contextChip` slot to the composer field**

In `NativeChatComposerField.tsx`:

- add to `NativeChatComposerFieldProps`: `contextChip?: React.ReactNode`
- add `contextChip` to the destructured parameters
- inside the bordered composer `<div className={cn('rounded-xl border border-chat-composer-border …')}>`, insert `{contextChip}` as its first child, immediately before `{imageAttachments.length > 0 ? (`.

- [ ] **Step 3: Pass the chip from the composer**

In `NativeChatComposer.tsx` import:

```ts
import { EditorContextComposerChip } from '@/fork/editor-context/EditorContextChip'
```

and add this prop to `<NativeChatComposerField …>`:

```tsx
        contextChip={
          agent === 'claude' && structuredTransport ? (
            <EditorContextComposerChip
              scopeKey={draftScopeKey}
              worktreeId={structuredTransport.worktreeId}
            />
          ) : undefined
        }
```

- [ ] **Step 4: Render the transcript chip**

In `NativeChatUserMessageRow.tsx` import:

```ts
import { parseEditorContextBlock } from '@/fork/editor-context/editor-context-block'
import { EditorContextTranscriptChip } from '@/fork/editor-context/EditorContextChip'
```

At the top of the `NativeChatUserMessageRow` body add:

```ts
const editorContext = parseEditorContextBlock(markdown)
const shownMarkdown = editorContext ? editorContext.body : markdown
```

Then in that component's JSX (not `UserMessageMeta`): replace every use of `markdown` with `shownMarkdown` (the `{markdown ? (` condition, the `NativeChatUserMessageFold` `markdown` prop, the `NativeChatMarkdown` `content` prop, the `data-native-chat-message-id` condition and the `UserMessageMeta markdown=` prop), and insert as the first child of the bubble `<div className={cn('max-w-[80%] text-sm', …)}>`:

```tsx
{
  editorContext ? <EditorContextTranscriptChip snapshot={editorContext.snapshot} /> : null
}
```

- [ ] **Step 5: Typecheck and test**

Run: `nix run ~/projects/orca -- -c 'pnpm tc && pnpm test src/renderer/src/components/native-chat src/renderer/src/fork'`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/fork src/renderer/src/components/native-chat
git commit -m "feat(fork): editor context chips in composer and transcript

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Ctrl+Shift+L — add selection to chat

**Files:**

- Modify: `src/shared/keybindings/types.ts` (action id union, next to `'editor.addReviewNote'`)
- Modify: `src/shared/keybindings/definitions-core-3.ts` (after the `editor.addReviewNote` entry)
- Modify (replace stub): `src/renderer/src/fork/editor-context/editor-context-add-selection.ts`
- Test: `src/renderer/src/fork/editor-context/editor-context-add-selection.test.ts`

**Interfaces:**

- Consumes: `readEditorContextEntry` (Task 4), `formatSelectionQuote` (Task 2); upstream `isStructuredTab` (`src/shared/structured-agent-session-tab.ts`), `appendToNativeChatComposerDraft` and `structuredAgentSessionDraftScopeKey` (`components/native-chat/native-chat-composer-draft-store.ts`), `editorShortcutMatches` (`components/editor/editor-shortcuts.ts`), `useAppStore().activateTab(tabId, { worktreeId })`
- Produces: `pickClaudeChatTab<T extends { id: string; entityId: string; contentType?: string; agentSessionAgent?: unknown }>(tabs: readonly T[]): T | null`, `installAddSelectionToChatShortcut(target: HTMLElement, worktreeId: string): () => void`

- [ ] **Step 1: Register the keybinding**

`types.ts` — add to the `KeybindingActionId` union right after `| 'editor.addReviewNote'`:

```ts
  | 'editor.addSelectionToChat'
```

`definitions-core-3.ts` — after the `editor.addReviewNote` object:

```ts
  {
    id: 'editor.addSelectionToChat',
    title: 'Add Selection to Chat',
    group: 'Editors',
    scope: 'editor',
    searchKeywords: ['shortcut', 'editor', 'selection', 'chat', 'claude', 'agent', 'context'],
    defaultBindings: platformBindings(['Mod+Shift+L'])
  },
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { pickClaudeChatTab } from './editor-context-add-selection'

const chat = (id: string, agent: string) => ({
  id,
  entityId: `s-${id}`,
  contentType: 'agent-session',
  agentSessionAgent: agent
})

describe('pickClaudeChatTab', () => {
  it('picks the last Claude structured chat', () => {
    const tabs = [
      chat('a', 'claude'),
      chat('b', 'codex'),
      chat('c', 'claude'),
      { id: 'f', entityId: 'x', contentType: 'editor' }
    ]
    expect(pickClaudeChatTab(tabs)?.id).toBe('c')
  })

  it('returns null without a Claude chat', () => {
    expect(pickClaudeChatTab([chat('b', 'codex')])).toBeNull()
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `nix run ~/projects/orca -- -c 'pnpm test src/renderer/src/fork/editor-context/editor-context-add-selection.test.ts'`
Expected: FAIL — `pickClaudeChatTab` is not exported.

- [ ] **Step 4: Implement (replaces the Task 5 stub)**

```ts
import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { editorShortcutMatches } from '@/components/editor/editor-shortcuts'
import {
  appendToNativeChatComposerDraft,
  structuredAgentSessionDraftScopeKey
} from '@/components/native-chat/native-chat-composer-draft-store'
import { isStructuredTab } from '../../../../shared/structured-agent-session-tab'
import { formatSelectionQuote } from './editor-context-block'
import { readEditorContextEntry } from './editor-context-store'

export function pickClaudeChatTab<
  T extends { id: string; entityId: string; contentType?: string; agentSessionAgent?: unknown }
>(tabs: readonly T[]): T | null {
  const claudeTabs = tabs.filter(
    (tab) => isStructuredTab(tab) && tab.agentSessionAgent === 'claude'
  )
  return claudeTabs.at(-1) ?? null
}

function addSelectionToChat(worktreeId: string): boolean {
  const entry = readEditorContextEntry(worktreeId)
  if (!entry?.selection) {
    return false
  }
  const state = useAppStore.getState()
  const tab = pickClaudeChatTab(state.unifiedTabsByWorktree[worktreeId] ?? [])
  if (!tab) {
    toast(
      translate(
        'components.native-chat.editorContext.noClaudeChat',
        'Open a Claude chat in this workspace to add the selection.'
      )
    )
    return true
  }
  appendToNativeChatComposerDraft(structuredAgentSessionDraftScopeKey(tab.entityId), {
    text: formatSelectionQuote(entry.file, entry.language, entry.selection)
  })
  state.activateTab(tab.id, { worktreeId })
  return true
}

export function installAddSelectionToChatShortcut(
  target: HTMLElement,
  worktreeId: string
): () => void {
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || !editorShortcutMatches('editor.addSelectionToChat', event)) {
      return
    }
    if (addSelectionToChat(worktreeId)) {
      event.preventDefault()
      event.stopPropagation()
    }
  }
  target.addEventListener('keydown', handleKeyDown, true)
  return () => target.removeEventListener('keydown', handleKeyDown, true)
}
```

If `unifiedTabsByWorktree` tab objects do not carry `entityId`/`contentType`/`agentSessionAgent` under exactly these names, read `src/renderer/src/lib/running-agent-targets.ts` (`deriveStructuredAgentSendTargets`) — it uses the same fields — and match it.

- [ ] **Step 5: Run tests (incl. keybinding suites)**

Run: `nix run ~/projects/orca -- -c 'pnpm tc && pnpm test src/renderer/src/fork src/shared/keybindings'`
Expected: PASS. If a keybinding conflict test flags `Mod+Shift+L` against Monaco's built-in "select all occurrences", that is intended (same choice as Cursor); add the id to that test's allowed editor overrides rather than changing the key.

- [ ] **Step 6: Commit**

```bash
git add src/shared/keybindings src/renderer/src/fork
git commit -m "feat(fork): Ctrl+Shift+L adds the editor selection to the Claude chat

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Shift+Tab cycles the permission mode

**Files:**

- Create: `src/renderer/src/fork/editor-context/permission-mode-cycle.ts`
- Test: `src/renderer/src/fork/editor-context/permission-mode-cycle.test.ts`
- Modify: `src/renderer/src/components/native-chat/NativeChatComposer.tsx` (wrap `handleKeyDown` passed to the field)

**Interfaces:**

- Consumes: upstream `AGENT_CHAT_PERMISSION_MODE_OPTION_ID`, `isAgentChatPermissionMode`, `AgentChatPermissionMode` (`src/shared/agent-chat-permission-mode.ts`); `SessionOptionDescriptor`, `SessionOptionsSurface` (`src/shared/native-chat-session-options.ts`); `runSessionOptionSurfaceCall` (`components/native-chat/native-chat-session-option-surface-call.ts`)
- Produces: `nextPermissionMode(current: AgentChatPermissionMode, modes: readonly AgentChatPermissionMode[]): AgentChatPermissionMode`, `cyclePermissionMode(surface: SessionOptionsSurface | null, snapshot: readonly SessionOptionDescriptor[]): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { nextPermissionMode } from './permission-mode-cycle'

describe('nextPermissionMode', () => {
  const all = ['ask', 'accept-edits', 'auto', 'full-access'] as const
  it('steps forward and wraps', () => {
    expect(nextPermissionMode('ask', all)).toBe('accept-edits')
    expect(nextPermissionMode('auto', all)).toBe('full-access')
    expect(nextPermissionMode('full-access', all)).toBe('ask')
  })
  it('only cycles through the modes the host offers', () => {
    expect(nextPermissionMode('accept-edits', ['ask', 'accept-edits'])).toBe('ask')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `nix run ~/projects/orca -- -c 'pnpm test src/renderer/src/fork/editor-context/permission-mode-cycle.test.ts'`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import {
  AGENT_CHAT_PERMISSION_MODE_OPTION_ID,
  isAgentChatPermissionMode,
  type AgentChatPermissionMode
} from '../../../../shared/agent-chat-permission-mode'
import type {
  SessionOptionDescriptor,
  SessionOptionsSurface
} from '../../../../shared/native-chat-session-options'
import { runSessionOptionSurfaceCall } from '@/components/native-chat/native-chat-session-option-surface-call'

const NO_PENDING_MARK = (): void => {}

export function nextPermissionMode(
  current: AgentChatPermissionMode,
  modes: readonly AgentChatPermissionMode[]
): AgentChatPermissionMode {
  const index = modes.indexOf(current)
  return modes[(index + 1) % modes.length] ?? current
}

/** Returns true when the key press was used to change the mode. */
export function cyclePermissionMode(
  surface: SessionOptionsSurface | null,
  snapshot: readonly SessionOptionDescriptor[]
): boolean {
  const descriptor = snapshot.find((entry) => entry.id === AGENT_CHAT_PERMISSION_MODE_OPTION_ID)
  if (!surface || !descriptor || descriptor.kind.type !== 'select' || !descriptor.settable) {
    return false
  }
  const current = descriptor.kind.currentValue
  if (!isAgentChatPermissionMode(current)) {
    return false
  }
  const modes = descriptor.kind.choices
    .map((choice) => choice.value)
    .filter(isAgentChatPermissionMode)
  const next = nextPermissionMode(current, modes)
  if (next === current) {
    return false
  }
  runSessionOptionSurfaceCall(next, NO_PENDING_MARK, () =>
    surface.setOption(AGENT_CHAT_PERMISSION_MODE_OPTION_ID, next)
  )
  return true
}
```

- [ ] **Step 4: Wire it into the composer**

In `NativeChatComposer.tsx` import:

```ts
import { cyclePermissionMode } from '@/fork/editor-context/permission-mode-cycle'
```

After `const handleKeyDown = useNativeChatComposerKeyDown({ … })` add:

```ts
const handleKeyDownWithModeCycle: typeof handleKeyDown = (event) => {
  if (
    event.key === 'Tab' &&
    event.shiftKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey &&
    cyclePermissionMode(sessionOptionsSurface, sessionOptionsSnapshot)
  ) {
    event.preventDefault()
    return
  }
  handleKeyDown(event)
}
```

and change the field prop to `onKeyDown={handleKeyDownWithModeCycle}`.

- [ ] **Step 5: Typecheck and test**

Run: `nix run ~/projects/orca -- -c 'pnpm tc && pnpm test src/renderer/src/fork src/renderer/src/components/native-chat'`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/fork src/renderer/src/components/native-chat/NativeChatComposer.tsx
git commit -m "feat(fork): Shift+Tab cycles the chat permission mode

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Catalogs, repo checks, Prove it

**Files:**

- Modify: `src/renderer/src/i18n/locales/*.json` (generated)

- [ ] **Step 1: Sync translation catalogs**

Run: `nix run ~/projects/orca -- -c 'pnpm sync:localization-catalog && pnpm sync:localization-runtime-catalog'`
Expected: the new `components.native-chat.editorContext.*` keys appear in `en.json` (and placeholders in other locales if the script does that). Then: `pnpm verify:localization-catalogs && pnpm verify:localization-extraction && pnpm verify:localization-coverage` → PASS. If coverage requires real translations for other locales, add the English text as the value, matching how other fork-new keys are handled by the script's output.

- [ ] **Step 2: Full changed-files check**

Run: `nix run ~/projects/orca -- -c 'pnpm check:changed --maxWorkers=2'`
Expected: PASS (format, lint, typecheck, affected tests, ratchets). Fix every finding in the fork files; do not add suppressions.

- [ ] **Step 3: Commit**

```bash
git add -A src
git commit -m "chore(fork): sync localization catalogs for editor context

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Prove it (manual, dev app)**

Run in background: `ORCA_BACKGROUND_LAUNCH=1 nix run ~/projects/orca -- -c 'pnpm dev'`. Drive and screenshot over CDP (port printed as `DevTools listening on ws://127.0.0.1:<port>`). In the dev app:

1. Add `~/projects/orca` as a project, open `src/renderer/src/fork/editor-context/editor-context-snapshot.ts`, select `editorContextLabel`. Composer chip shows `…/editor-context-snapshot.ts:<a>–<b>`.
2. Open a Claude chat (default agent), ask "what does this do?" without pasting. Pass: the answer is about `editorContextLabel`; the user bubble shows the chip, expandable to the selection.
3. Send a second message without moving the cursor. Pass: no chip on that bubble (dedupe).
4. Add `const n: number = 'x'` to a TS file, place the cursor there, ask "fix the error". Pass: Claude names that line.
5. Select code, press `Ctrl+Shift+L`. Pass: quote appears in the Claude composer.
6. Focus the composer, press `Shift+Tab` repeatedly. Pass: the mode pill cycles Ask → Accept edits → Auto → Full access.
7. Subscription check: in the session's init proof / logs, `apiKeyConfigured` is false and the token source is the Claude login.

Stop the dev app afterwards. Record results (pass/fail per item) in the final report.
