import { execFile } from 'node:child_process'

export type OrcaCliCall = (args: readonly string[]) => Promise<{ ok: boolean; output: string }>

const CLI_TIMEOUT_MS = 30_000

/** Run this app's `orca` CLI with the session's env, the same one the session's own shell gets. */
export function createOrcaCliCall(
  env: Readonly<Record<string, string | undefined>>,
  cwd: string
): OrcaCliCall | null {
  const command = env.ORCA_CLI_COMMAND
  // Windows launchers are .cmd files that need a shell; tool arguments must never reach one.
  if (!command || process.platform === 'win32') {
    return null
  }
  return (args) =>
    new Promise((resolve) => {
      execFile(
        command,
        [...args, '--json'],
        { env: { ...env }, cwd, timeout: CLI_TIMEOUT_MS, maxBuffer: 1024 * 1024 },
        (error, stdout, stderr) => {
          resolve({ ok: !error, output: (stdout || stderr || String(error ?? '')).trim() })
        }
      )
    })
}
