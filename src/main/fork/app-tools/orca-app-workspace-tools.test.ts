import { describe, expect, it } from 'vitest'
import { findProjectWorktree, summarizeProjectWorktrees } from './orca-app-workspace-tools'

const wt = (repoId: string, path: string, displayName: string, branch = 'refs/heads/main') => ({
  id: `${repoId}::${path}`,
  repoId,
  path,
  displayName,
  branch
})

const listJson = JSON.stringify({
  ok: true,
  result: {
    worktrees: [
      wt('repo-a', '/p/a', 'main'),
      wt('repo-a', '/p/a-feature', 'feature', 'refs/heads/feature'),
      wt('repo-b', '/p/b', 'main'),
      wt('repo-b', '/p/b-feature', 'feature')
    ]
  }
})

describe('findProjectWorktree', () => {
  it('matches the name within the chat’s own project only', () => {
    expect(findProjectWorktree(listJson, '/p/a', 'feature')).toEqual({
      ok: true,
      worktree: {
        id: 'repo-a::/p/a-feature',
        path: '/p/a-feature',
        name: 'feature',
        branch: 'feature'
      },
      isCurrent: false
    })
  })

  it('flags the workspace the chat runs in', () => {
    const found = findProjectWorktree(listJson, '/p/a/', 'main')
    expect(found.ok && found.isCurrent).toBe(true)
  })

  it('reports an unknown name and a chat outside any project', () => {
    expect(findProjectWorktree(listJson, '/p/a', 'nope').ok).toBe(false)
    expect(findProjectWorktree(listJson, '/elsewhere', 'main').ok).toBe(false)
    expect(findProjectWorktree('not json', '/p/a', 'main').ok).toBe(false)
  })
})

describe('summarizeProjectWorktrees', () => {
  it('lists only this project, marking the current workspace', () => {
    expect(summarizeProjectWorktrees(listJson, '/p/a')).toBe(
      '- main (branch main) /p/a  ← this chat\n- feature (branch feature) /p/a-feature'
    )
  })
})
