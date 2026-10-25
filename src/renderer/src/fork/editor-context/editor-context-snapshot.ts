import type {
  EditorContextDiagnostic,
  EditorContextEntry,
  EditorContextMarker,
  EditorContextSelection,
  EditorContextSnapshot
} from './editor-context-types'

export const EDITOR_CONTEXT_MAX_SELECTION_LINES = 200
export const EDITOR_CONTEXT_MAX_SELECTION_CHARS = 8000
export const EDITOR_CONTEXT_MAX_DIAGNOSTICS = 20

// Monaco MarkerSeverity values.
const SEVERITY_ERROR = 8
const SEVERITY_WARNING = 4

function trimSelection(
  selection: NonNullable<EditorContextEntry['selection']>
): EditorContextSelection {
  const lines = selection.text.split('\n')
  let text = lines.slice(0, EDITOR_CONTEXT_MAX_SELECTION_LINES).join('\n')
  let truncated = lines.length > EDITOR_CONTEXT_MAX_SELECTION_LINES
  if (text.length > EDITOR_CONTEXT_MAX_SELECTION_CHARS) {
    text = text.slice(0, EDITOR_CONTEXT_MAX_SELECTION_CHARS)
    truncated = true
  }
  return { startLine: selection.startLine, endLine: selection.endLine, text, truncated }
}

function toDiagnostic(marker: EditorContextMarker): EditorContextDiagnostic | null {
  const severity =
    marker.severity === SEVERITY_ERROR
      ? 'error'
      : marker.severity === SEVERITY_WARNING
        ? 'warning'
        : null
  if (!severity) {
    return null
  }
  const code = typeof marker.code === 'string' ? marker.code : marker.code?.value
  return {
    line: marker.startLineNumber,
    severity,
    message: marker.message,
    ...(code ? { code } : {})
  }
}

export function buildEditorContextSnapshot(
  entry: Pick<EditorContextEntry, 'file' | 'language' | 'cursorLine' | 'selection'>,
  markers: readonly EditorContextMarker[]
): EditorContextSnapshot {
  const diagnostics = markers
    .map(toDiagnostic)
    .filter((d): d is EditorContextDiagnostic => d !== null)
    .sort((a, b) => a.line - b.line)
    .slice(0, EDITOR_CONTEXT_MAX_DIAGNOSTICS)
  return {
    file: entry.file,
    language: entry.language,
    cursorLine: entry.cursorLine,
    selection: entry.selection ? trimSelection(entry.selection) : null,
    diagnostics
  }
}

export function editorContextLabel(snapshot: EditorContextSnapshot): string {
  const where = snapshot.selection
    ? `${snapshot.selection.startLine}–${snapshot.selection.endLine}`
    : `${snapshot.cursorLine}`
  const errors = snapshot.diagnostics.filter((d) => d.severity === 'error').length
  const suffix = errors === 0 ? '' : ` · ${errors} ${errors === 1 ? 'error' : 'errors'}`
  return `${snapshot.file}:${where}${suffix}`
}
