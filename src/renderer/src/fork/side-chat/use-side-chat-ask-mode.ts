import { useEffect } from 'react'
import { structuredAgentSessionIdOfDraftScope } from '@/components/native-chat/native-chat-composer-draft-store'
import { runSessionOptionSurfaceCall } from '@/components/native-chat/native-chat-session-option-surface-call'
import { AGENT_CHAT_PERMISSION_MODE_OPTION_ID } from '../../../../shared/agent-chat-permission-mode'
import type {
  SessionOptionDescriptor,
  SessionOptionsSurface
} from '../../../../shared/native-chat-session-options'
import { markSideChatAskModeApplied, useSideChatLink } from './side-chat-registry'

const NO_PENDING_MARK = (): void => {}

/** A new chat starts in the host's mode; a side chat switches itself to Ask once its options load. */
export function useSideChatAskMode(
  scopeKey: string,
  surface: SessionOptionsSurface | null,
  snapshot: readonly SessionOptionDescriptor[]
): void {
  const sessionId = structuredAgentSessionIdOfDraftScope(scopeKey)
  const link = useSideChatLink(sessionId ?? '')
  const descriptor = snapshot.find((entry) => entry.id === AGENT_CHAT_PERMISSION_MODE_OPTION_ID)
  const current = descriptor?.kind.type === 'select' ? descriptor.kind.currentValue : undefined
  const settable = descriptor?.settable === true
  useEffect(() => {
    if (!sessionId || !link?.askModePending || !surface || !settable || current === undefined) {
      return
    }
    markSideChatAskModeApplied(sessionId)
    if (current !== 'ask') {
      runSessionOptionSurfaceCall('ask', NO_PENDING_MARK, () =>
        surface.setOption(AGENT_CHAT_PERMISSION_MODE_OPTION_ID, 'ask')
      )
    }
  }, [sessionId, link?.askModePending, surface, settable, current])
}
