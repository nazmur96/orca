import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  afterBashCommand,
  beforeBashCommand,
  resetBashEditTrackingForTests
} from './claude-bash-edits'
import { listClaudeEdits, resetClaudeEditBaselinesForTests } from './claude-edit-baselines'

let ws: string
const git = (...args: string[]) => execFileSync('git', args, { cwd: ws, stdio: 'pipe' })

beforeEach(async () => {
  resetClaudeEditBaselinesForTests()
  resetBashEditTrackingForTests()
  ws = await mkdtemp(join(tmpdir(), 'claude-bash-edits-'))
  git('init', '-q')
  await writeFile(join(ws, 'clean.ts'), 'clean\n')
  await writeFile(join(ws, 'dirty.ts'), 'committed\n')
  git('add', '.')
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init')
  await writeFile(join(ws, 'dirty.ts'), 'user edit\n')
})
afterEach(async () => {
  await rm(ws, { recursive: true, force: true })
})

describe('Bash edits', () => {
  it('baselines files a shell command changed: clean from HEAD, dirty from before the command, new as created', async () => {
    await beforeBashCommand(ws, 'tool-1')
    await new Promise((resolve) => setTimeout(resolve, 20))
    await writeFile(join(ws, 'clean.ts'), 'clean\nbash\n')
    await writeFile(join(ws, 'dirty.ts'), 'user edit\nbash\n')
    await writeFile(join(ws, 'made.ts'), 'new\n')
    await afterBashCommand(ws, 'tool-1', 's1')
    const edits = await listClaudeEdits(ws)
    expect(edits.map((edit) => [edit.path, edit.before])).toEqual([
      ['clean.ts', 'clean\n'],
      ['dirty.ts', 'user edit\n'],
      ['made.ts', null]
    ])
  })

  it('ignores files the command did not touch, including earlier user edits', async () => {
    await beforeBashCommand(ws, 'tool-2')
    await afterBashCommand(ws, 'tool-2', 's1')
    expect(await listClaudeEdits(ws)).toEqual([])
  })

  it('does nothing outside a git repository', async () => {
    const plain = await mkdtemp(join(tmpdir(), 'claude-bash-plain-'))
    await beforeBashCommand(plain, 'tool-3')
    await writeFile(join(plain, 'x.ts'), 'x\n')
    await afterBashCommand(plain, 'tool-3', 's1')
    expect(await listClaudeEdits(plain)).toEqual([])
    await rm(plain, { recursive: true, force: true })
  })
})
