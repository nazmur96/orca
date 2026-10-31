import * as monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { selectKnownWorktreeById } from '@/store/selectors'
import { isImeOwnedKeyboardEvent } from '@/lib/ime-composition-keyboard-event'
import { claudeEditorModel } from '../../../../shared/fork-claude-editor-model'

export type InlineEditContext = { worktreeId: string; relativePath: string; language: string }

/** Settings → Chat → Claude in the editor. */
export function inlineEditModel(): string {
  return claudeEditorModel(useAppStore.getState().settings?.claudeEditorModel)
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) {
    node.textContent = text
  }
  return node
}

/** The whole lines the edit replaces: the selection, or the cursor's line when nothing is selected. */
function editRange(model: editor.ITextModel, selection: monaco.Selection): monaco.Range {
  return new monaco.Range(
    selection.startLineNumber,
    1,
    selection.endLineNumber,
    model.getLineMaxColumn(selection.endLineNumber)
  )
}

/** Cmd+K: ask, preview Claude's rewrite inline (old lines red, new code green), then accept or reject. */
export function startInlineEdit(
  codeEditor: editor.IStandaloneCodeEditor,
  context: InlineEditContext
): void {
  const model = codeEditor.getModel()
  const selection = codeEditor.getSelection()
  const workspacePath = selectKnownWorktreeById(useAppStore.getState(), context.worktreeId)?.path
  if (
    !model ||
    !selection ||
    !workspacePath ||
    codeEditor.getOption(monaco.editor.EditorOption.readOnly)
  ) {
    return
  }
  const range = editRange(model, selection)
  const lastLine = model.getLineCount()
  const selected = model.getValueInRange(range)
  const before = model.getValueInRange(new monaco.Range(1, 1, range.startLineNumber, 1))
  const after = model.getValueInRange(
    new monaco.Range(
      range.endLineNumber,
      range.endColumn,
      lastLine,
      model.getLineMaxColumn(lastLine)
    )
  )
  const zoneIds: string[] = []
  const marks = codeEditor.createDecorationsCollection([
    { range, options: { isWholeLine: true, className: 'fork-inline-edit-selected' } }
  ])
  let finished = false

  const prompt = element('div', 'fork-inline-edit-prompt')
  const input = element('input', 'fork-inline-edit-input')
  input.placeholder = translate(
    'components.inlineEdit.placeholder',
    'Edit with Claude… (Enter to send, Esc to cancel)'
  )
  const status = element('span', 'fork-inline-edit-status')
  prompt.append(input, status)

  const cleanup = (): void => {
    if (finished) {
      return
    }
    finished = true
    marks.clear()
    codeEditor.changeViewZones((zones) => zoneIds.forEach((id) => zones.removeZone(id)))
    codeEditor.focus()
  }

  const showPreview = (replacement: string): void => {
    marks.set([{ range, options: { isWholeLine: true, className: 'fork-inline-edit-removed' } }])
    const preview = element('div', 'fork-inline-edit-preview')
    preview.append(element('pre', 'fork-inline-edit-added', replacement || ' '))
    const actions = element('div', 'fork-inline-edit-actions')
    const accept = element(
      'button',
      'fork-inline-edit-accept',
      translate('components.inlineEdit.accept', 'Accept (Ctrl+Enter)')
    )
    const reject = element(
      'button',
      'fork-inline-edit-reject',
      translate('components.inlineEdit.reject', 'Reject (Esc)')
    )
    const apply = (): void => {
      codeEditor.pushUndoStop()
      codeEditor.executeEdits('claude-inline-edit', [{ range, text: replacement }])
      codeEditor.pushUndoStop()
      cleanup()
    }
    accept.addEventListener('click', apply)
    reject.addEventListener('click', cleanup)
    actions.append(accept, reject)
    preview.append(actions)
    const lineHeight = codeEditor.getOption(monaco.editor.EditorOption.lineHeight)
    codeEditor.changeViewZones((zones) => {
      zoneIds.push(
        zones.addZone({
          afterLineNumber: range.endLineNumber,
          heightInPx: (replacement.split('\n').length + 1) * lineHeight + 16,
          domNode: preview
        })
      )
    })
    const onKey = (event: KeyboardEvent): void => {
      if (finished) {
        window.removeEventListener('keydown', onKey, true)
        return
      }
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        apply()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        cleanup()
      }
    }
    window.addEventListener('keydown', onKey, true)
    status.textContent = ''
  }

  input.addEventListener('keydown', (event) => {
    event.stopPropagation()
    if (isImeOwnedKeyboardEvent(event)) {
      return
    }
    if (event.key === 'Escape') {
      cleanup()
    } else if (event.key === 'Enter' && input.value.trim() && !input.disabled) {
      input.disabled = true
      status.textContent = translate('components.inlineEdit.working', 'Claude is editing…')
      void window.api.aiVault
        .claudeInlineEdit({
          workspacePath,
          filePath: context.relativePath,
          language: context.language,
          instruction: input.value.trim(),
          selection: selected,
          before,
          after,
          model: inlineEditModel()
        })
        .then((result) => {
          if (finished) {
            return
          }
          if (result.ok) {
            showPreview(result.replacement)
          } else {
            input.disabled = false
            status.textContent = result.error
          }
        })
    }
  })

  codeEditor.changeViewZones((zones) => {
    zoneIds.push(
      zones.addZone({ afterLineNumber: range.startLineNumber - 1, heightInPx: 40, domNode: prompt })
    )
  })
  setTimeout(() => input.focus(), 0)
}
