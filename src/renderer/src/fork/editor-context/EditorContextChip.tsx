import { FileCode, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { buildEditorContextSnapshot, editorContextLabel } from './editor-context-snapshot'
import {
  updateEditorContextChat,
  useEditorContextChat,
  useEditorContextChatWorktree,
  useEditorContextEntry
} from './editor-context-store'
import type { EditorContextSnapshot } from './editor-context-types'

export function EditorContextComposerChip({
  scopeKey,
  worktreeId
}: {
  scopeKey: string
  worktreeId: string | undefined
}): React.JSX.Element | null {
  const entry = useEditorContextEntry(worktreeId)
  const chat = useEditorContextChat(scopeKey)
  if (!entry) {
    return null
  }
  if (chat.disabled) {
    return (
      <div className="mb-1 px-1">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => updateEditorContextChat(scopeKey, { disabled: false, lastSent: null })}
        >
          <FileCode className="size-3.5" aria-hidden />
          <span className="text-chat-foreground-faint">
            {translate(
              'components.native-chat.editorContext.turnOn',
              'Editor context off — turn on'
            )}
          </span>
        </Button>
      </div>
    )
  }
  const label = editorContextLabel(buildEditorContextSnapshot(entry, entry.readMarkers()))
  return (
    <div className="mb-1 flex items-center gap-0.5 px-1">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        aria-pressed={!chat.skipNext}
        title={translate(
          'components.native-chat.editorContext.toggleNext',
          'Include the editor context in the next message'
        )}
        className="max-w-full min-w-0 shrink"
        onClick={() => updateEditorContextChat(scopeKey, { skipNext: !chat.skipNext })}
      >
        <FileCode className="size-3.5 shrink-0" aria-hidden />
        <span className={cn('truncate', chat.skipNext && 'line-through opacity-60')}>{label}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        aria-label={translate(
          'components.native-chat.editorContext.turnOff',
          'Turn off editor context for this chat'
        )}
        onClick={() => updateEditorContextChat(scopeKey, { disabled: true })}
      >
        <X className="size-3" aria-hidden />
      </Button>
    </div>
  )
}

export function EditorContextTranscriptChip({
  snapshot
}: {
  snapshot: EditorContextSnapshot
}): React.JSX.Element {
  return (
    <details className="mb-1.5 text-xs text-chat-foreground-faint">
      <summary className="flex cursor-pointer items-center gap-1 select-none">
        <FileCode className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{editorContextLabel(snapshot)}</span>
      </summary>
      {snapshot.selection ? (
        <pre className="scrollbar-sleek mt-1 max-h-48 overflow-auto rounded-md bg-chat-composer-surface p-2 font-mono">
          {snapshot.selection.text}
        </pre>
      ) : null}
      {snapshot.diagnostics.length > 0 ? (
        <ul className="mt-1 list-disc pl-4">
          {snapshot.diagnostics.map((d) => (
            <li key={`${d.line}:${d.message}`}>
              {`L${d.line} ${d.severity}${d.code ? ` ${d.code}` : ''}: ${d.message}`}
            </li>
          ))}
        </ul>
      ) : null}
    </details>
  )
}

/** Only Claude chats bound to a worktree by the structured send path get editor context. */
export function ClaudeComposerContextChip({
  agent,
  scopeKey
}: {
  agent: string | undefined
  scopeKey: string
}): React.JSX.Element | null {
  const worktreeId = useEditorContextChatWorktree(scopeKey)
  if (agent !== 'claude' || !worktreeId) {
    return null
  }
  return <EditorContextComposerChip scopeKey={scopeKey} worktreeId={worktreeId} />
}
