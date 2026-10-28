const SHELL_LANGUAGES = new Set(['bash', 'sh', 'shell', 'zsh', 'console'])

export function isRunnableShellLanguage(language: string | undefined): boolean {
  return language ? SHELL_LANGUAGES.has(language.toLowerCase()) : false
}

/** The command a shell block asks for: `$ ` prompts dropped, trailing blank lines trimmed. */
export function commandFromCodeBlock(code: string): string | null {
  const command = code
    .split('\n')
    .map((line) => line.replace(/^\$ /, ''))
    .join('\n')
    .trimEnd()
  return command.trim() ? command : null
}
