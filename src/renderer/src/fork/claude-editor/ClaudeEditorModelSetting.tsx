import type { GlobalSettings } from '../../../../shared/global-settings-types'
import {
  CLAUDE_EDITOR_MODELS,
  claudeEditorModel,
  type ClaudeEditorModel
} from '../../../../shared/fork-claude-editor-model'
import { Card, CardContent } from '@/components/ui/card'
import { SearchableSetting } from '@/components/settings/SearchableSetting'
import {
  SettingsRow,
  SettingsSegmentedControl,
  SettingsSubsectionHeader
} from '@/components/settings/SettingsFormControls'
import { matchesSettingsSearch } from '@/components/settings/settings-search'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { getClaudeEditorModelSearchEntry } from './claude-editor-model-search'

const LABELS: Record<ClaudeEditorModel, () => string> = {
  haiku: () => translate('settings.chat.claudeEditorModel.haiku', 'Haiku'),
  sonnet: () => translate('settings.chat.claudeEditorModel.sonnet', 'Sonnet'),
  opus: () => translate('settings.chat.claudeEditorModel.opus', 'Opus')
}

/** Settings → Chat: which Claude model Cmd+K and editor suggestions run on. */
export function ClaudeEditorModelSetting({
  settings,
  updateSettings,
  forceVisible = false
}: {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void | Promise<void>
  forceVisible?: boolean
}): React.JSX.Element | null {
  const query = useAppStore((state) => state.settingsSearchQuery)
  const entry = getClaudeEditorModelSearchEntry()
  if (!forceVisible && !matchesSettingsSearch(query, [entry])) {
    return null
  }
  return (
    <section className="space-y-3">
      <SettingsSubsectionHeader title={entry.title} />
      <Card>
        <CardContent>
          <SearchableSetting
            {...entry}
            id={entry.targetSectionId}
            forceVisible
            className="max-w-none"
          >
            <SettingsRow
              label={translate('settings.chat.claudeEditorModel.label', 'Model')}
              description={entry.description}
              control={
                <SettingsSegmentedControl
                  ariaLabel={entry.title}
                  size="sm"
                  value={claudeEditorModel(settings.claudeEditorModel)}
                  onChange={(model) => void updateSettings({ claudeEditorModel: model })}
                  options={CLAUDE_EDITOR_MODELS.map((value) => ({
                    value,
                    label: LABELS[value]()
                  }))}
                />
              }
            />
          </SearchableSetting>
        </CardContent>
      </Card>
    </section>
  )
}
