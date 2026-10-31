import * as monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { selectKnownWorktreeById } from '@/store/selectors'
import { editorShortcutMatches } from '@/components/editor/editor-shortcuts'
import { inlineEditModel, type InlineEditContext } from './inline-edit-widget'
import {
  fitSuggestionToCursor,
  samePlace,
  suggestionAt,
  type ClaudeSuggestion,
  type SuggestionPlace
} from './claude-suggest-state'

const INSTRUCTION = [
  'Write the code that most likely comes next at the cursor, which is the empty selection.',
  'Finish the current line and continue for up to 12 lines where the next step is clear.',
  'Never repeat code that is already before or after the cursor.',
  'If nothing is clearly next, reply with an empty replacement.'
].join(' ')

let pending: ClaudeSuggestion | null = null
let providerInstalled = false

/** Ghost text comes from Monaco's own inline suggestions, so Tab accepts and Esc dismisses. */
function ensureProvider(): void {
  if (providerInstalled) {
    return
  }
  providerInstalled = true
  monaco.languages.registerInlineCompletionsProvider('*', {
    provideInlineCompletions: (model, position) => {
      const suggestion = suggestionAt(pending, {
        uri: model.uri.toString(),
        version: model.getVersionId(),
        line: position.lineNumber,
        column: position.column
      })
      return {
        items: suggestion
          ? [
              {
                insertText: suggestion.text,
                range: new monaco.Range(
                  suggestion.line,
                  suggestion.column,
                  suggestion.line,
                  suggestion.column
                )
              }
            ]
          : []
      }
    },
    disposeInlineCompletions: () => {}
  })
}

function showThinking(codeEditor: editor.IStandaloneCodeEditor, position: monaco.Position) {
  return codeEditor.createDecorationsCollection([
    {
      range: new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column
      ),
      options: {
        // An empty range at the cursor shows nothing without this.
        showIfCollapsed: true,
        after: {
          content: translate('components.claudeSuggest.thinking', ' Claude is thinking…'),
          inlineClassName: 'fork-claude-suggest-thinking'
        }
      }
    }
  ])
}

/** Ask Claude for what comes next at the cursor and show it as ghost text. */
export async function requestClaudeSuggestion(
  codeEditor: editor.IStandaloneCodeEditor,
  context: InlineEditContext
): Promise<void> {
  const model = codeEditor.getModel()
  const position = codeEditor.getPosition()
  const workspacePath = selectKnownWorktreeById(useAppStore.getState(), context.worktreeId)?.path
  if (!model || !position || !workspacePath) {
    return
  }
  ensureProvider()
  const placeNow = (): SuggestionPlace => ({
    uri: model.uri.toString(),
    version: model.getVersionId(),
    line: codeEditor.getPosition()?.lineNumber ?? -1,
    column: codeEditor.getPosition()?.column ?? -1
  })
  const asked = placeNow()
  const offset = model.getOffsetAt(position)
  const text = model.getValue()
  const thinking = showThinking(codeEditor, position)
  const result = await window.api.aiVault
    .claudeInlineEdit({
      workspacePath,
      filePath: context.relativePath,
      language: context.language,
      instruction: INSTRUCTION,
      selection: '',
      before: text.slice(0, offset),
      after: text.slice(offset),
      model: inlineEditModel()
    })
    .finally(() => thinking.clear())
  // Typing or moving on while Claude thought means the answer no longer fits; drop it.
  if (!result.ok || !result.replacement.trim() || !samePlace(asked, placeNow())) {
    return
  }
  const linePrefix = model.getLineContent(asked.line).slice(0, asked.column - 1)
  pending = { ...asked, text: fitSuggestionToCursor(result.replacement, linePrefix) }
  codeEditor.trigger('claude-suggest', 'editor.action.inlineSuggest.trigger', {})
}

/** Alt+\ in a code editor asks Claude for a suggestion at the cursor. */
export function installClaudeSuggestShortcut(
  codeEditor: editor.IStandaloneCodeEditor,
  context: InlineEditContext
): () => void {
  const target = codeEditor.getContainerDomNode()
  const onKeyDown = (event: KeyboardEvent): void => {
    if (
      event.repeat ||
      !codeEditor.hasTextFocus() ||
      !editorShortcutMatches('editor.claudeSuggest', event)
    ) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    void requestClaudeSuggestion(codeEditor, context)
  }
  target.addEventListener('keydown', onKeyDown, true)
  return () => target.removeEventListener('keydown', onKeyDown, true)
}
