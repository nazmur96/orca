import { translate } from '@/i18n/i18n'
import type { SettingsSearchEntry } from '@/components/settings/settings-search'

export function getClaudeEditorModelSearchEntry(): SettingsSearchEntry {
  return {
    title: translate('settings.chat.claudeEditorModel.title', 'Claude in the editor'),
    description: translate(
      'settings.chat.claudeEditorModel.description',
      'The model Cmd+K and editor suggestions use. Haiku is fastest, Opus is smartest.'
    ),
    keywords: ['cmd+k', 'ctrl+k', 'inline edit', 'model', 'haiku', 'sonnet', 'opus', 'suggestion'],
    targetSectionId: 'chat-claude-editor-model'
  }
}
