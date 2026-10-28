import { describe, expect, it } from 'vitest'
import { commandFromCodeBlock, isRunnableShellLanguage } from './chat-command'

describe('isRunnableShellLanguage', () => {
  it('accepts shell fences only', () => {
    for (const lang of ['bash', 'sh', 'shell', 'zsh', 'console', 'Bash']) {
      expect(isRunnableShellLanguage(lang)).toBe(true)
    }
    for (const lang of ['ts', 'python', 'json', undefined, '']) {
      expect(isRunnableShellLanguage(lang)).toBe(false)
    }
  })
})

describe('commandFromCodeBlock', () => {
  it('strips prompt markers and trailing blank lines', () => {
    expect(commandFromCodeBlock('$ pnpm test\n')).toBe('pnpm test')
    expect(commandFromCodeBlock('$ cd app\n$ pnpm dev\n\n')).toBe('cd app\npnpm dev')
  })

  it('leaves commands without prompts alone and rejects empty blocks', () => {
    expect(commandFromCodeBlock('git status')).toBe('git status')
    expect(commandFromCodeBlock('  \n')).toBeNull()
  })
})
