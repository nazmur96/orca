/** A file Claude changed since its last review: content before Claude's first edit and now (null = absent). */
export type ClaudeEdit = {
  path: string
  before: string | null
  current: string | null
  added: number
  removed: number
}

export type ResolveClaudeEditsRequest = {
  workspacePath: string
  action: 'keep' | 'undo'
  /** Workspace-relative paths; omitted means every pending edit. */
  paths?: string[]
}

/** Cmd+K: rewrite a selection with one quick Claude answer. */
export type ClaudeInlineEditRequest = {
  workspacePath: string
  filePath: string
  language: string
  instruction: string
  selection: string
  before: string
  after: string
  model?: string
}

export type ClaudeInlineEditResult =
  | { ok: true; replacement: string }
  | { ok: false; error: string }
