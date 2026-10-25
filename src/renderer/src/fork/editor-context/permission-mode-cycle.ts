import {
  AGENT_CHAT_PERMISSION_MODE_OPTION_ID,
  isAgentChatPermissionMode,
  type AgentChatPermissionMode
} from '../../../../shared/agent-chat-permission-mode'
import type {
  SessionOptionDescriptor,
  SessionOptionsSurface
} from '../../../../shared/native-chat-session-options'
import { runSessionOptionSurfaceCall } from '@/components/native-chat/native-chat-session-option-surface-call'

const NO_PENDING_MARK = (): void => {}

export function nextPermissionMode(
  current: AgentChatPermissionMode,
  modes: readonly AgentChatPermissionMode[]
): AgentChatPermissionMode {
  const index = modes.indexOf(current)
  return modes[(index + 1) % modes.length] ?? current
}

/** Returns true when the key press was used to change the mode. */
export function cyclePermissionMode(
  surface: SessionOptionsSurface | null,
  snapshot: readonly SessionOptionDescriptor[]
): boolean {
  const descriptor = snapshot.find((entry) => entry.id === AGENT_CHAT_PERMISSION_MODE_OPTION_ID)
  if (!surface || !descriptor || descriptor.kind.type !== 'select' || !descriptor.settable) {
    return false
  }
  const current = descriptor.kind.currentValue
  if (!isAgentChatPermissionMode(current)) {
    return false
  }
  const modes = descriptor.kind.choices
    .map((choice) => choice.value)
    .filter(isAgentChatPermissionMode)
  const next = nextPermissionMode(current, modes)
  if (next === current) {
    return false
  }
  runSessionOptionSurfaceCall(next, NO_PENDING_MARK, () =>
    surface.setOption(AGENT_CHAT_PERMISSION_MODE_OPTION_ID, next)
  )
  return true
}

/** Plain Shift+Tab in the composer cycles the mode, as in the Claude Code CLI. */
export function cyclePermissionModeOnKey(
  event: { key: string; shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean },
  surface: SessionOptionsSurface | null,
  snapshot: readonly SessionOptionDescriptor[]
): boolean {
  const plainShiftTab =
    event.key === 'Tab' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey
  return plainShiftTab && cyclePermissionMode(surface, snapshot)
}
