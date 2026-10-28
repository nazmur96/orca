import { spawn } from 'node:child_process'
import {
  buildInlineEditPrompt,
  parseInlineEditReplacement,
  type InlineEditRequest
} from './claude-inline-edit-prompt'

export type InlineEditRun = InlineEditRequest & { workspacePath: string; model?: string }

export type InlineEditResult = { ok: true; replacement: string } | { ok: false; error: string }

type CliRun = (
  args: string[],
  cwd: string
) => Promise<{ code: number | null; stdout: string; stderr: string }>

const TIMEOUT_MS = 90_000

/** stdin is closed on purpose: `claude -p` otherwise waits 3 s for piped input. */
const runClaudeCli: CliRun = (args, cwd) =>
  new Promise((resolve) => {
    const child = spawn('claude', args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => child.kill('SIGTERM'), TIMEOUT_MS)
    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()))
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()))
    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({ code: null, stdout, stderr: error.message })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, stdout, stderr })
    })
  })

/** One quick answer from Claude for a Cmd+K edit; user settings are skipped (hooks made it ~2x slower). */
export async function runClaudeInlineEdit(
  request: InlineEditRun,
  run: CliRun = runClaudeCli
): Promise<InlineEditResult> {
  const args = [
    '-p',
    buildInlineEditPrompt(request),
    '--model',
    request.model || 'sonnet',
    '--tools',
    '',
    '--no-session-persistence',
    '--setting-sources',
    '',
    '--output-format',
    'text'
  ]
  const result = await run(args, request.workspacePath)
  if (result.code !== 0) {
    return { ok: false, error: (result.stderr || result.stdout).trim() || 'Claude did not answer.' }
  }
  const replacement = parseInlineEditReplacement(result.stdout)
  return replacement === null
    ? { ok: false, error: 'Claude answered without a replacement.' }
    : { ok: true, replacement }
}
