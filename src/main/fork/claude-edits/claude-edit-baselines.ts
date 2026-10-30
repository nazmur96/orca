import { readFile, rm, stat, writeFile } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import type { ClaudeEdit } from '../../../shared/fork-claude-edits'

type Baseline = { before: string | null; sessionId: string; recordedAt: number }

export type { ClaudeEdit }

const MAX_BASELINE_BYTES = 2 * 1024 * 1024

/** Workspace root → absolute file path → content before Claude's first edit. */
const byWorkspace = new Map<string, Map<string, Baseline>>()

function insideWorkspace(workspace: string, filePath: string): string | null {
  const root = resolve(workspace)
  const absolute = isAbsolute(filePath) ? resolve(filePath) : resolve(root, filePath)
  return absolute.startsWith(root + sep) ? absolute : null
}

async function readTextOrNull(path: string): Promise<string | null | undefined> {
  try {
    const info = await stat(path)
    if (info.size > MAX_BASELINE_BYTES) {
      return undefined
    }
    return await readFile(path, 'utf8')
  } catch (error) {
    // Missing means Claude is creating it; anything else leaves the file untracked.
    return error instanceof Error && 'code' in error && error.code === 'ENOENT' ? null : undefined
  }
}

/** Remember the file as it is now, unless Claude already edited it since the last keep/undo. */
export async function recordClaudeEditBaseline(
  workspace: string,
  filePath: string,
  sessionId: string
): Promise<void> {
  const absolute = insideWorkspace(workspace, filePath)
  if (!absolute) {
    return
  }
  const files = byWorkspace.get(resolve(workspace)) ?? new Map<string, Baseline>()
  if (files.has(absolute)) {
    return
  }
  const before = await readTextOrNull(absolute)
  if (before === undefined) {
    return
  }
  files.set(absolute, { before, sessionId, recordedAt: Date.now() })
  byWorkspace.set(resolve(workspace), files)
}

function linesOf(text: string | null): string[] {
  return text === null || text === '' ? [] : text.replace(/\n$/, '').split('\n')
}

/** Line-multiset counts: cheap, and exact enough for a "+3 −1" badge. */
function lineCounts(
  before: string | null,
  current: string | null
): { added: number; removed: number } {
  const beforeLines = linesOf(before)
  const currentLines = linesOf(current)
  const remaining = new Map<string, number>()
  for (const line of beforeLines) {
    remaining.set(line, (remaining.get(line) ?? 0) + 1)
  }
  let added = 0
  for (const line of currentLines) {
    const left = remaining.get(line) ?? 0
    if (left > 0) {
      remaining.set(line, left - 1)
    } else {
      added += 1
    }
  }
  const removed = [...remaining.values()].reduce((sum, count) => sum + count, 0)
  return { added, removed }
}

export async function listClaudeEdits(workspace: string): Promise<ClaudeEdit[]> {
  const root = resolve(workspace)
  const files = byWorkspace.get(root)
  if (!files) {
    return []
  }
  const edits: ClaudeEdit[] = []
  for (const [absolute, baseline] of files) {
    const current = await readTextOrNull(absolute)
    if (current === undefined || current === baseline.before) {
      continue
    }
    edits.push({
      path: relative(root, absolute),
      before: baseline.before,
      current,
      ...lineCounts(baseline.before, current)
    })
  }
  return edits.sort((a, b) => a.path.localeCompare(b.path))
}

function selected(workspace: string, paths: readonly string[] | undefined): [string, Baseline][] {
  const files = byWorkspace.get(resolve(workspace))
  if (!files) {
    return []
  }
  const wanted = paths ? new Set(paths.map((path) => insideWorkspace(workspace, path))) : null
  return [...files].filter(([absolute]) => !wanted || wanted.has(absolute))
}

export async function keepClaudeEdits(workspace: string, paths?: readonly string[]): Promise<void> {
  const files = byWorkspace.get(resolve(workspace))
  for (const [absolute] of selected(workspace, paths)) {
    files?.delete(absolute)
  }
}

export async function undoClaudeEdits(workspace: string, paths?: readonly string[]): Promise<void> {
  const files = byWorkspace.get(resolve(workspace))
  for (const [absolute, baseline] of selected(workspace, paths)) {
    await (baseline.before === null
      ? rm(absolute, { force: true })
      : writeFile(absolute, baseline.before, 'utf8'))
    files?.delete(absolute)
  }
}

/** The file an Edit/MultiEdit/Write/NotebookEdit call is about to change. */
export function claudeEditPathOf(toolInput: unknown): string | null {
  if (!toolInput || typeof toolInput !== 'object') {
    return null
  }
  const path: unknown =
    Reflect.get(toolInput, 'file_path') ?? Reflect.get(toolInput, 'notebook_path')
  return typeof path === 'string' && path ? path : null
}

export function resetClaudeEditBaselinesForTests(): void {
  byWorkspace.clear()
}

/** Per-block undo in the review dialog saves the partly reverted file; only files Claude edited. */
export async function writeReviewedClaudeEdit(
  workspace: string,
  filePath: string,
  content: string
): Promise<boolean> {
  const absolute = insideWorkspace(workspace, filePath)
  if (!absolute || !byWorkspace.get(resolve(workspace))?.has(absolute)) {
    return false
  }
  await writeFile(absolute, content, 'utf8')
  return true
}

/** Record a known "before" (e.g. from git, for Bash edits) unless the file already has one. */
export function recordClaudeEditBaselineContent(
  workspace: string,
  filePath: string,
  before: string | null,
  sessionId: string
): void {
  const absolute = insideWorkspace(workspace, filePath)
  if (!absolute) {
    return
  }
  const files = byWorkspace.get(resolve(workspace)) ?? new Map<string, Baseline>()
  if (!files.has(absolute)) {
    files.set(absolute, { before, sessionId, recordedAt: Date.now() })
    byWorkspace.set(resolve(workspace), files)
  }
}
