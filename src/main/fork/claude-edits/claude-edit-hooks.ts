import type { HookCallbackMatcher, HookEvent } from '@anthropic-ai/claude-agent-sdk'
import { claudeEditPathOf, recordClaudeEditBaseline } from './claude-edit-baselines'

type SdkHooks = Partial<Record<HookEvent, HookCallbackMatcher[]>>

const FILE_EDIT_TOOLS = 'Edit|MultiEdit|Write|NotebookEdit'

/** Snapshot each file just before Claude's first edit, so the user can review and undo it. */
export function withClaudeEditHooks(
  existing: SdkHooks | undefined,
  cwd: string
): { hooks: SdkHooks } {
  const snapshot: HookCallbackMatcher = {
    matcher: FILE_EDIT_TOOLS,
    hooks: [
      async (input) => {
        if (input.hook_event_name === 'PreToolUse') {
          const path = claudeEditPathOf(input.tool_input)
          if (path) {
            await recordClaudeEditBaseline(cwd, path, input.session_id)
          }
        }
        return {}
      }
    ]
  }
  return { hooks: { ...existing, PreToolUse: [...(existing?.PreToolUse ?? []), snapshot] } }
}
