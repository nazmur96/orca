import type { editor } from 'monaco-editor'
import { editorShortcutMatches } from '@/components/editor/editor-shortcuts'
import { startInlineEdit, type InlineEditContext } from './inline-edit-widget'

/** Ctrl/Cmd+K in a code editor opens the Claude inline edit prompt (Monaco's Ctrl+K chords give way, as in Cursor). */
export function installInlineEditShortcut(
  codeEditor: editor.IStandaloneCodeEditor,
  context: InlineEditContext
): () => void {
  const target = codeEditor.getContainerDomNode()
  const onKeyDown = (event: KeyboardEvent): void => {
    if (
      event.repeat ||
      !codeEditor.hasTextFocus() ||
      !editorShortcutMatches('editor.inlineEdit', event)
    ) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    startInlineEdit(codeEditor, context)
  }
  target.addEventListener('keydown', onKeyDown, true)
  return () => target.removeEventListener('keydown', onKeyDown, true)
}
