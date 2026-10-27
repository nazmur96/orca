import type * as ClaudeAgentSdk from '@anthropic-ai/claude-agent-sdk'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { OrcaCliCall } from './orca-cli-call'
import { toolText } from './orca-app-tool-text'

type Sdk = Pick<typeof ClaudeAgentSdk, 'tool'>

const AGENT_ID = /^[a-z][a-z0-9-]{0,31}$/

type ProjectWorktree = { id: string; path: string; name: string; branch: string }

type ListedWorktree = ProjectWorktree & { repoId: string }

function listedWorktrees(listJson: string): ListedWorktree[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(listJson)
  } catch {
    return []
  }
  const result = parsed && typeof parsed === 'object' ? Reflect.get(parsed, 'result') : null
  const rows = result && typeof result === 'object' ? Reflect.get(result, 'worktrees') : null
  if (!Array.isArray(rows)) {
    return []
  }
  return rows.flatMap((row: unknown) => {
    if (!row || typeof row !== 'object') {
      return []
    }
    const field = (key: string): string => {
      const value: unknown = Reflect.get(row, key)
      return typeof value === 'string' ? value : ''
    }
    const [id, repoId, path] = [field('id'), field('repoId'), field('path')]
    return id && repoId && path
      ? [
          {
            id,
            repoId,
            path: resolve(path),
            name: field('displayName'),
            branch: field('branch').replace(/^refs\/heads\//, '')
          }
        ]
      : []
  })
}

/** The chat's own project, found by the workspace whose path is the chat's cwd. */
function projectOf(
  rows: readonly ListedWorktree[],
  cwd: string
): { repoId: string; currentPath: string } | null {
  const current = rows.find((row) => row.path === resolve(cwd))
  return current ? { repoId: current.repoId, currentPath: current.path } : null
}

/** Names are only unique per project (every repo has a "main"), so look up within the chat's project. */
export function findProjectWorktree(
  listJson: string,
  cwd: string,
  name: string
): { ok: true; worktree: ProjectWorktree; isCurrent: boolean } | { ok: false; reason: string } {
  const rows = listedWorktrees(listJson)
  const project = projectOf(rows, cwd)
  if (!project) {
    return { ok: false, reason: 'This chat is not running in an Orca workspace.' }
  }
  const match = rows.find((row) => row.repoId === project.repoId && row.name === name)
  if (!match) {
    return { ok: false, reason: `No workspace named ${name} in this project.` }
  }
  const { repoId: _repoId, ...worktree } = match
  return { ok: true, worktree, isCurrent: match.path === project.currentPath }
}

export function summarizeProjectWorktrees(listJson: string, cwd: string): string {
  const rows = listedWorktrees(listJson)
  const project = projectOf(rows, cwd)
  if (!project) {
    return 'This chat is not running in an Orca workspace.'
  }
  return rows
    .filter((row) => row.repoId === project.repoId)
    .map(
      (row) =>
        `- ${row.name} (branch ${row.branch}) ${row.path}${row.path === project.currentPath ? '  ← this chat' : ''}`
    )
    .join('\n')
}

export function buildOrcaWorkspaceTools(sdk: Sdk, call: OrcaCliCall, cwd: string) {
  return [
    sdk.tool(
      'list_worktrees',
      'List the Orca workspaces (git worktrees) of this project.',
      {},
      async () => {
        const result = await call(['worktree', 'list'])
        return result.ok
          ? toolText(summarizeProjectWorktrees(result.output, cwd))
          : toolText(`Orca could not list workspaces: ${result.output}`, true)
      }
    ),
    sdk.tool(
      'create_worktree',
      'Create a new Orca workspace (git worktree) for a separate task, optionally starting an agent in it with a prompt.',
      {
        name: z.string().min(1).max(80),
        base_branch: z.string().min(1).optional(),
        agent: z.string().regex(AGENT_ID).optional(),
        prompt: z.string().min(1).optional()
      },
      async ({ name, base_branch, agent, prompt }) => {
        const result = await call([
          'worktree',
          'create',
          '--name',
          name,
          ...(base_branch ? ['--base-branch', base_branch] : []),
          ...(agent ? ['--agent', agent] : []),
          ...(prompt ? ['--prompt', prompt] : [])
        ])
        return result.ok
          ? toolText(`Created workspace ${name}.\n${result.output}`)
          : toolText(`Orca could not create it: ${result.output}`, true)
      }
    ),
    sdk.tool(
      'remove_worktree',
      'Remove an Orca workspace (git worktree) by name. Never removes the workspace this chat runs in. Confirm with the user first.',
      { name: z.string().min(1) },
      async ({ name }) => {
        const listed = await call(['worktree', 'list'])
        if (!listed.ok) {
          return toolText(`Orca could not list workspaces: ${listed.output}`, true)
        }
        const found = findProjectWorktree(listed.output, cwd, name)
        if (!found.ok) {
          return toolText(found.reason, true)
        }
        if (found.isCurrent) {
          return toolText('Refusing to remove the workspace this chat is running in.', true)
        }
        const removed = await call(['worktree', 'rm', '--worktree', `id:${found.worktree.id}`])
        return removed.ok
          ? toolText(`Removed workspace ${name}.`)
          : toolText(`Orca could not remove it: ${removed.output}`, true)
      }
    ),
    sdk.tool(
      'hand_off_to_agent',
      'Hand the current task to another agent (e.g. codex, grok, gemini) in this workspace. Write a self-contained handoff: goal, what is done, what is left, key files.',
      {
        agent: z.string().regex(AGENT_ID),
        handoff: z.string().min(20)
      },
      async ({ agent, handoff }) => {
        const result = await call([
          'agent',
          'launch',
          '--agent',
          agent,
          '--worktree',
          `path:${cwd}`,
          '--prompt',
          handoff,
          '--focus'
        ])
        return result.ok
          ? toolText(`Handed off to ${agent}; it opened in a new tab.`)
          : toolText(`Orca could not start ${agent}: ${result.output}`, true)
      }
    )
  ]
}
