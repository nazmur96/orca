import { agentSessionProviderHandleChainHead } from '../../shared/agent-session-provider-handle'
import { LOCAL_EXECUTION_HOST_ID } from '../../shared/execution-host'
import { copyStructuredChatRecordConversation } from '../ai-vault/structured-chat-conversation-copy'
import { getStructuredAgentSessionHost } from '../native-chat/agent-session-wire/structured-agent-session-registry'
import { structuredAgentRuntimeRegistration } from '../runtime/structured-agent-runtime-registrations'

export type SideChatSource = { sessionId: string; workspaceId: string }

function isSideChatSource(value: unknown): value is SideChatSource {
  return (
    typeof value === 'object' &&
    value !== null &&
    'sessionId' in value &&
    typeof value.sessionId === 'string' &&
    value.sessionId.length > 0 &&
    'workspaceId' in value &&
    typeof value.workspaceId === 'string' &&
    value.workspaceId.length > 0
  )
}

/** An unowned copy of a local Claude chat's conversation, for a side chat to resume. */
export async function copyChatForSideChat(source: unknown): Promise<{ sessionId: string }> {
  if (!isSideChatSource(source)) {
    throw new Error('Invalid side chat source.')
  }
  const record = getStructuredAgentSessionHost()?.deps.store.getRecord(source.sessionId)
  const registration = record && structuredAgentRuntimeRegistration(record.provider)
  const head = record && agentSessionProviderHandleChainHead(record.providerHandleChain)
  if (
    !record ||
    !registration ||
    !head ||
    record.provider !== 'claude' ||
    record.location.workspaceId !== source.workspaceId ||
    record.location.executionHostId !== LOCAL_EXECUTION_HOST_ID
  ) {
    throw new Error('This chat cannot be forked into a side chat.')
  }
  const result = await copyStructuredChatRecordConversation(
    record,
    registration.sessionHistory.rowSessionId(head)
  )
  if (!result.forkedSession) {
    throw new Error('Claude returned no copy of this chat.')
  }
  return { sessionId: result.forkedSession.sessionId }
}
