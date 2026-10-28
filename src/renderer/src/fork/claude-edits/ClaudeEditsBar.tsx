import { useState } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import { FileDiff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { detectLanguage } from '@/lib/language-detect'
import { useDocumentDarkTheme } from '@/hooks/use-document-dark-theme'
import { useClaudePanelState } from '../claude-panel/claude-panel-registry'
import type { ClaudeEdit } from '../../../../shared/fork-claude-edits'
import { useClaudeEdits, type ClaudeEditsState } from './use-claude-edits'

function Counts({ edit }: { edit: Pick<ClaudeEdit, 'added' | 'removed'> }): React.JSX.Element {
  return (
    <span className="shrink-0 font-mono text-[11px]">
      <span className="text-status-success">+{edit.added}</span>{' '}
      <span className="text-destructive">−{edit.removed}</span>
    </span>
  )
}

function ReviewDialog({
  state,
  onClose
}: {
  state: ClaudeEditsState
  onClose: () => void
}): React.JSX.Element {
  const isDark = useDocumentDarkTheme()
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const selected = state.edits.find((edit) => edit.path === selectedPath) ?? state.edits[0]
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[80vh] max-w-[90vw] flex-col sm:max-w-[90vw]">
        <DialogTitle>
          {translate('components.claudeEdits.reviewTitle', 'Review Claude’s changes')}
        </DialogTitle>
        <div className="flex min-h-0 flex-1 gap-3">
          <div className="scrollbar-sleek flex w-64 shrink-0 flex-col gap-0.5 overflow-auto">
            {state.edits.map((edit) => (
              <button
                key={edit.path}
                type="button"
                onClick={() => setSelectedPath(edit.path)}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-accent',
                  edit.path === selected?.path && 'bg-accent'
                )}
              >
                <span className="truncate">
                  {edit.path}
                  {edit.before === null
                    ? ` ${translate('components.claudeEdits.newFile', '(new)')}`
                    : ''}
                </span>
                <Counts edit={edit} />
              </button>
            ))}
          </div>
          {selected ? (
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border">
                <DiffEditor
                  original={selected.before ?? ''}
                  modified={selected.current ?? ''}
                  language={detectLanguage(selected.path)}
                  theme={isDark ? 'vs-dark' : 'vs'}
                  options={{ readOnly: true, renderSideBySide: true, minimap: { enabled: false } }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void state.resolve('undo', [selected.path])}
                >
                  {translate('components.claudeEdits.undoFile', 'Undo this file')}
                </Button>
                <Button size="sm" onClick={() => void state.resolve('keep', [selected.path])}>
                  {translate('components.claudeEdits.keepFile', 'Keep this file')}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {translate('components.claudeEdits.nothingLeft', 'Nothing left to review.')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Cursor's "N files changed · Keep all · Undo all" bar, under the Claude panel's tab strip. */
export function ClaudeEditsBar({
  worktreeId,
  groupId
}: {
  worktreeId: string
  groupId: string
}): React.JSX.Element | null {
  const isPanel = useClaudePanelState().groupIdByWorktree[worktreeId] === groupId
  return isPanel ? <ClaudeEditsBarContent worktreeId={worktreeId} /> : null
}

function ClaudeEditsBarContent({ worktreeId }: { worktreeId: string }): React.JSX.Element | null {
  const state = useClaudeEdits(worktreeId)
  const [reviewing, setReviewing] = useState(false)
  if (state.edits.length === 0 && !reviewing) {
    return null
  }
  const totals = state.edits.reduce(
    (sum, edit) => ({ added: sum.added + edit.added, removed: sum.removed + edit.removed }),
    { added: 0, removed: 0 }
  )
  return (
    <div
      className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-2 py-1 text-xs"
      data-claude-edits-bar=""
    >
      <FileDiff className="size-3.5 shrink-0 text-primary" aria-hidden />
      <span className="truncate">
        {translate('components.claudeEdits.summary', '{{count}} files changed', {
          count: state.edits.length
        })}
      </span>
      <Counts edit={totals} />
      <span className="flex-1" />
      <Button variant="ghost" size="xs" onClick={() => setReviewing(true)}>
        {translate('components.claudeEdits.review', 'Review')}
      </Button>
      <Button variant="ghost" size="xs" onClick={() => void state.resolve('undo')}>
        {translate('components.claudeEdits.undoAll', 'Undo all')}
      </Button>
      <Button size="xs" onClick={() => void state.resolve('keep')}>
        {translate('components.claudeEdits.keepAll', 'Keep all')}
      </Button>
      {reviewing ? <ReviewDialog state={state} onClose={() => setReviewing(false)} /> : null}
    </div>
  )
}
