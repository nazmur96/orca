import * as monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'
import { useAppStore } from '@/store'
import { selectKnownWorktreeById } from '@/store/selectors'
import { claudeChangedLines } from './claude-edit-line-diff'
import { readClaudeEdit, subscribeClaudeEdits } from './claude-edits-store'

const REFRESH_DELAY_MS = 300

/** Green bars on lines Claude added or changed, red ticks where it removed lines, until kept or undone. */
export function installClaudeEditGutter(
  codeEditor: editor.IStandaloneCodeEditor,
  worktreeId: string,
  relativePath: string
): () => void {
  const marks = codeEditor.createDecorationsCollection()
  let timer: ReturnType<typeof setTimeout> | undefined

  const refresh = (): void => {
    const model = codeEditor.getModel()
    const workspacePath = selectKnownWorktreeById(useAppStore.getState(), worktreeId)?.path
    const edit = model && workspacePath ? readClaudeEdit(workspacePath, relativePath) : null
    const lines = model && edit ? claudeChangedLines(edit.before, model.getValue()) : null
    if (!model || !lines) {
      marks.clear()
      return
    }
    marks.set([
      ...lines.added.map((line) => ({
        range: new monaco.Range(line, 1, line, 1),
        options: { isWholeLine: true, linesDecorationsClassName: 'fork-claude-gutter-added' }
      })),
      ...lines.removedAfter.map((line) => ({
        range: new monaco.Range(Math.max(line, 1), 1, Math.max(line, 1), 1),
        options: {
          linesDecorationsClassName:
            line === 0 ? 'fork-claude-gutter-removed-above' : 'fork-claude-gutter-removed'
        }
      }))
    ])
  }

  const schedule = (): void => {
    clearTimeout(timer)
    timer = setTimeout(refresh, REFRESH_DELAY_MS)
  }

  const unsubscribe = subscribeClaudeEdits(schedule)
  const contentListener = codeEditor.onDidChangeModelContent(schedule)
  refresh()
  return () => {
    clearTimeout(timer)
    unsubscribe()
    contentListener.dispose()
    marks.clear()
  }
}
