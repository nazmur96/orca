import { describe, expect, it } from 'vitest'
import { runClaudeInlineEdit } from './claude-inline-edit'

const request = {
  instruction: 'rename x to total',
  filePath: 'a.ts',
  language: 'typescript',
  selection: 'const x = 1',
  before: '',
  after: '',
  workspacePath: '/ws'
}

describe('runClaudeInlineEdit', () => {
  it('runs claude -p without tools or user settings, on Sonnet by default, and returns the replacement', async () => {
    const seen: { args?: string[]; cwd?: string } = {}
    const result = await runClaudeInlineEdit(request, async (args, cwd) => {
      seen.args = args
      seen.cwd = cwd
      return { code: 0, stdout: '<replacement>\nconst total = 1\n</replacement>', stderr: '' }
    })
    expect(result).toEqual({ ok: true, replacement: 'const total = 1' })
    expect(seen.cwd).toBe('/ws')
    expect(seen.args).toEqual(
      expect.arrayContaining(['-p', '--model', 'sonnet', '--tools', '', '--setting-sources'])
    )
  })

  it('reports CLI failures and missing replacements', async () => {
    expect(
      await runClaudeInlineEdit(request, async () => ({
        code: 1,
        stdout: '',
        stderr: 'not logged in'
      }))
    ).toEqual({
      ok: false,
      error: 'not logged in'
    })
    expect(
      (await runClaudeInlineEdit(request, async () => ({ code: 0, stdout: 'hmm', stderr: '' }))).ok
    ).toBe(false)
  })

  it('uses the requested model', async () => {
    let model = ''
    await runClaudeInlineEdit({ ...request, model: 'opus' }, async (args) => {
      model = args[args.indexOf('--model') + 1] ?? ''
      return { code: 0, stdout: '<replacement>y</replacement>', stderr: '' }
    })
    expect(model).toBe('opus')
  })
})
