import type { HookCallbackMatcher, HookEvent } from '@anthropic-ai/claude-agent-sdk'
import { claudeEditPathOf, recordClaudeEditBaseline } from './claude-edit-baselines'
import { afterBashCommand, beforeBashCommand } from './claude-bash-edits'

type SdkHooks = Partial<Record<HookEvent, HookCallbackMatcher[]>>

const FILE_EDIT_TOOLS = 'Edit|MultiEdit|Write|NotebookEdit'

/** Snapshot files before Claude changes them (file tools directly, Bash via git), for Keep/Undo review. */
export function withClaudeEditHooks(
  existing: SdkHooks | undefined,
  cwd: string
): { hooks: SdkHooks } {
  const fileTools: HookCallbackMatcher = {
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
  const bashBefore: HookCallbackMatcher = {
    matcher: 'Bash',
    hooks: [
      async (input) => {
        if (input.hook_event_name === 'PreToolUse') {
          await beforeBashCommand(cwd, input.tool_use_id)
        }
        return {}
      }
    ]
  }
  const bashAfter: HookCallbackMatcher = {
    matcher: 'Bash',
    hooks: [
      async (input) => {
        if (
          input.hook_event_name === 'PostToolUse' ||
          input.hook_event_name === 'PostToolUseFailure'
        ) {
          await afterBashCommand(cwd, input.tool_use_id, input.session_id)
        }
        return {}
      }
    ]
  }
  return {
    hooks: {
      ...existing,
      PreToolUse: [...(existing?.PreToolUse ?? []), fileTools, bashBefore],
      PostToolUse: [...(existing?.PostToolUse ?? []), bashAfter],
      PostToolUseFailure: [...(existing?.PostToolUseFailure ?? []), bashAfter]
    }
  }
}
