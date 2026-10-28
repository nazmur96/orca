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
