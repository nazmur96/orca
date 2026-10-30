import { execFile } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { recordClaudeEditBaselineContent } from './claude-edit-baselines'

type PendingCommand = { startedAt: number; dirtyBefore: Map<string, string | null> }

const MAX_FILE_BYTES = 2 * 1024 * 1024
const pending = new Map<string, PendingCommand>()

function git(cwd: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    execFile('git', args, { cwd, maxBuffer: 8 * 1024 * 1024 }, (error, stdout) =>
      resolve(error ? null : stdout)
    )
  })
}

/** Modified tracked files and new untracked ones, relative to the workspace; null outside git. */
async function changedPaths(cwd: string): Promise<string[] | null> {
  const out = await git(cwd, ['ls-files', '-m', '-o', '--exclude-standard', '-z'])
  return out === null ? null : [...new Set(out.split('\0').filter(Boolean))]
}

async function readSmall(path: string): Promise<string | null> {
  try {
    return (await stat(path)).size > MAX_FILE_BYTES ? null : await readFile(path, 'utf8')
  } catch {
    return null
  }
}

/** Before a Bash call: remember the time and the content of files that already had uncommitted edits. */
export async function beforeBashCommand(cwd: string, toolUseId: string): Promise<void> {
  const startedAt = Date.now()
  const dirty = await changedPaths(cwd)
  if (!dirty) {
    return
  }
  const dirtyBefore = new Map<string, string | null>()
  for (const path of dirty) {
    dirtyBefore.set(path, await readSmall(join(cwd, path)))
  }
  pending.set(toolUseId, { startedAt, dirtyBefore })
}

/** After it: files git now reports as changed and written during the call get a baseline. */
export async function afterBashCommand(
  cwd: string,
  toolUseId: string,
  sessionId: string
): Promise<void> {
  const command = pending.get(toolUseId)
  pending.delete(toolUseId)
  const changed = command ? await changedPaths(cwd) : null
  if (!command || !changed) {
    return
  }
  for (const path of changed) {
    const info = await stat(join(cwd, path)).catch(() => null)
    // A little slack for coarse filesystem timestamps.
    if (!info || info.mtimeMs < command.startedAt - 50) {
      continue
    }
    const before = command.dirtyBefore.has(path)
      ? (command.dirtyBefore.get(path) ?? null)
      : await git(cwd, ['show', `HEAD:./${path}`])
    recordClaudeEditBaselineContent(cwd, path, before, sessionId)
  }
}

export function resetBashEditTrackingForTests(): void {
  pending.clear()
}
