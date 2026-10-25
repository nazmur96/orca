import type {
  EditorContextDiagnostic,
  EditorContextSelection,
  EditorContextSnapshot
} from './editor-context-types'

const OPEN = '<editor_context>'
const CLOSE = '</editor_context>'
const FILE_LINE = /^file: (.+) \(([^)]*)\), cursor line (\d+)$/
const SELECTION_LINE = /^selection: lines (\d+)-(\d+)( \(truncated\))?$/
const DIAGNOSTIC_LINE = /^- L(\d+) (error|warning)(?: (\S+))?: (.*)$/
const FENCE_OPEN = /^(`{3,})(\S*)$/

function fenceFor(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length))
  return '`'.repeat(Math.max(3, longest + 1))
}

function formatDiagnostic(d: EditorContextDiagnostic): string {
  return `- L${d.line} ${d.severity}${d.code ? ` ${d.code}` : ''}: ${d.message}`
}

export function formatEditorContextBlock(snapshot: EditorContextSnapshot): string {
  const lines = [
    OPEN,
    `file: ${snapshot.file} (${snapshot.language}), cursor line ${snapshot.cursorLine}`
  ]
  const { selection } = snapshot
  if (selection) {
    const fence = fenceFor(selection.text)
    lines.push(
      `selection: lines ${selection.startLine}-${selection.endLine}${selection.truncated ? ' (truncated)' : ''}`,
      `${fence}${snapshot.language}`,
      selection.text,
      fence
    )
  }
  if (snapshot.diagnostics.length > 0) {
    lines.push('diagnostics:', ...snapshot.diagnostics.map(formatDiagnostic))
  }
  lines.push(CLOSE)
  return lines.join('\n')
}

function parseSelection(
  lines: readonly string[],
  at: number
): { selection: EditorContextSelection; next: number } | null {
  const header = SELECTION_LINE.exec(lines[at] ?? '')
  const open = FENCE_OPEN.exec(lines[at + 1] ?? '')
  if (!header || !open) {
    return null
  }
  const close = lines.indexOf(open[1], at + 2)
  if (close === -1) {
    return null
  }
  return {
    selection: {
      startLine: Number(header[1]),
      endLine: Number(header[2]),
      text: lines.slice(at + 2, close).join('\n'),
      truncated: header[3] !== undefined
    },
    next: close + 1
  }
}

export function parseEditorContextBlock(
  text: string
): { snapshot: EditorContextSnapshot; body: string } | null {
  if (!text.startsWith(`${OPEN}\n`)) {
    return null
  }
  const end = text.indexOf(`\n${CLOSE}`)
  if (end === -1) {
    return null
  }
  const lines = text.slice(OPEN.length + 1, end).split('\n')
  const file = FILE_LINE.exec(lines[0] ?? '')
  if (!file) {
    return null
  }
  let at = 1
  let selection: EditorContextSelection | null = null
  const parsedSelection = parseSelection(lines, at)
  if (parsedSelection) {
    selection = parsedSelection.selection
    at = parsedSelection.next
  }
  const diagnostics: EditorContextDiagnostic[] = []
  if (lines[at] === 'diagnostics:') {
    for (const line of lines.slice(at + 1)) {
      const d = DIAGNOSTIC_LINE.exec(line)
      if (d) {
        diagnostics.push({
          line: Number(d[1]),
          severity: d[2] === 'error' ? 'error' : 'warning',
          message: d[4],
          ...(d[3] ? { code: d[3] } : {})
        })
      }
    }
  }
  const rest = text.slice(end + CLOSE.length + 1)
  return {
    snapshot: {
      file: file[1],
      language: file[2],
      cursorLine: Number(file[3]),
      selection,
      diagnostics
    },
    body: rest.startsWith('\n') ? rest.slice(1) : rest
  }
}

export function formatSelectionQuote(
  file: string,
  language: string,
  selection: { startLine: number; endLine: number; text: string }
): string {
  const fence = fenceFor(selection.text)
  return `${file}:${selection.startLine}-${selection.endLine}\n${fence}${language}\n${selection.text}\n${fence}\n`
}
