/** Claude model behind the editor's own Claude features: Cmd+K and suggestions. */
export type ClaudeEditorModel = 'haiku' | 'sonnet' | 'opus'

export const CLAUDE_EDITOR_MODELS: readonly ClaudeEditorModel[] = ['haiku', 'sonnet', 'opus']

/** Sonnet by default: editor edits are small and speed matters. */
export function claudeEditorModel(value: unknown): ClaudeEditorModel {
  return CLAUDE_EDITOR_MODELS.find((model) => model === value) ?? 'sonnet'
}
