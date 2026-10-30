import { mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  claudeEditPathOf,
  keepClaudeEdits,
  listClaudeEdits,
  recordClaudeEditBaseline,
  resetClaudeEditBaselinesForTests,
  undoClaudeEdits
} from './claude-edit-baselines'

let ws: string

beforeEach(async () => {
  resetClaudeEditBaselinesForTests()
  ws = await mkdtemp(join(tmpdir(), 'claude-edits-'))
  await writeFile(join(ws, 'a.ts'), 'one\ntwo\n')
})
afterEach(async () => {
  await rm(ws, { recursive: true, force: true })
})

describe('claude edit baselines', () => {
  it('records the content before the first edit only and lists real changes', async () => {
    await recordClaudeEditBaseline(ws, 'a.ts', 's1')
    await writeFile(join(ws, 'a.ts'), 'one\nTWO\nthree\n')
    await recordClaudeEditBaseline(ws, join(ws, 'a.ts'), 's1')
    const edits = await listClaudeEdits(ws)
    expect(edits).toEqual([
      { path: 'a.ts', before: 'one\ntwo\n', current: 'one\nTWO\nthree\n', added: 2, removed: 1 }
    ])
  })

  it('drops files whose content is back to the baseline', async () => {
    await recordClaudeEditBaseline(ws, 'a.ts', 's1')
    expect(await listClaudeEdits(ws)).toEqual([])
  })

  it('treats a new file as created by Claude and undo deletes it', async () => {
    await recordClaudeEditBaseline(ws, 'new.ts', 's1')
    await writeFile(join(ws, 'new.ts'), 'x\n')
    expect((await listClaudeEdits(ws))[0]).toMatchObject({ path: 'new.ts', before: null, added: 1 })
    await undoClaudeEdits(ws, ['new.ts'])
    await expect(access(join(ws, 'new.ts'))).rejects.toThrow()
    expect(await listClaudeEdits(ws)).toEqual([])
  })

  it('undo restores the baseline; keep forgets it', async () => {
    await recordClaudeEditBaseline(ws, 'a.ts', 's1')
    await writeFile(join(ws, 'a.ts'), 'changed\n')
    await undoClaudeEdits(ws)
    expect(await readFile(join(ws, 'a.ts'), 'utf8')).toBe('one\ntwo\n')
    await recordClaudeEditBaseline(ws, 'a.ts', 's1')
    await writeFile(join(ws, 'a.ts'), 'changed again\n')
    await keepClaudeEdits(ws)
    expect(await listClaudeEdits(ws)).toEqual([])
    expect(await readFile(join(ws, 'a.ts'), 'utf8')).toBe('changed again\n')
  })

  it('ignores files outside the workspace', async () => {
    await recordClaudeEditBaseline(ws, '/etc/hosts', 's1')
    await recordClaudeEditBaseline(ws, '../escape.ts', 's1')
    expect(await listClaudeEdits(ws)).toEqual([])
  })
})

describe('claudeEditPathOf', () => {
  it('reads the edited path from file tools', () => {
    expect(claudeEditPathOf({ file_path: '/w/a.ts', old_string: 'x' })).toBe('/w/a.ts')
    expect(claudeEditPathOf({ notebook_path: '/w/n.ipynb' })).toBe('/w/n.ipynb')
    expect(claudeEditPathOf({ command: 'ls' })).toBeNull()
    expect(claudeEditPathOf(null)).toBeNull()
  })
})

describe('withClaudeEditHooks', () => {
  it('records a baseline when the PreToolUse hook sees a file edit, keeping existing hooks', async () => {
    const { withClaudeEditHooks } = await import('./claude-edit-hooks')
    const existing = { PreToolUse: [{ hooks: [] }] }
    const { hooks } = withClaudeEditHooks(existing, ws)
    expect(hooks.PreToolUse).toHaveLength(3)
    expect(hooks.PostToolUse).toHaveLength(1)
    const hook = hooks.PreToolUse?.[1]?.hooks[0]
    await hook?.(
      {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: join(ws, 'a.ts') },
        tool_use_id: 't1',
        session_id: 's1',
        transcript_path: '',
        cwd: ws
      },
      't1',
      { signal: new AbortController().signal }
    )
    await writeFile(join(ws, 'a.ts'), 'edited\n')
    expect((await listClaudeEdits(ws)).map((edit) => edit.path)).toEqual(['a.ts'])
  })
})

describe('writeReviewedClaudeEdit', () => {
  it('writes a partly reverted file only while it has a pending Claude baseline', async () => {
    const { writeReviewedClaudeEdit } = await import('./claude-edit-baselines')
    await recordClaudeEditBaseline(ws, 'a.ts', 's1')
    await writeFile(join(ws, 'a.ts'), 'one\nTWO\nthree\n')
    expect(await writeReviewedClaudeEdit(ws, 'a.ts', 'one\ntwo\nthree\n')).toBe(true)
    expect(await readFile(join(ws, 'a.ts'), 'utf8')).toBe('one\ntwo\nthree\n')
    expect(await listClaudeEdits(ws)).toMatchObject([{ path: 'a.ts', added: 1, removed: 0 }])
  })

  it('refuses files Claude has not edited or that lie outside the workspace', async () => {
    const { writeReviewedClaudeEdit } = await import('./claude-edit-baselines')
    expect(await writeReviewedClaudeEdit(ws, 'a.ts', 'x')).toBe(false)
    expect(await writeReviewedClaudeEdit(ws, '../evil.ts', 'x')).toBe(false)
    expect(await readFile(join(ws, 'a.ts'), 'utf8')).toBe('one\ntwo\n')
  })
})
