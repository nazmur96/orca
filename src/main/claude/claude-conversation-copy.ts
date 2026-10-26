import { join } from 'node:path'
import { requireLegacyAgentSessionAccountHome } from '../../shared/agent-session-account-home'
import type { StructuredAgentSessionAdapter } from '../native-chat/agent-session-wire/structured-agent-session-adapter'
import { resolveSessionFilePath } from '../native-chat/session-file-resolver'
import { forkClaudeTranscript } from './claude-rewind-transcript'

/** Fork the whole Claude conversation into an unowned copy, e.g. for a side chat. */
export const claudeCopyConversation: NonNullable<
  StructuredAgentSessionAdapter['copyConversation']
> = async ({ providerSessionId, accountHome }) => {
  const claudeConfigDir = requireLegacyAgentSessionAccountHome(accountHome).path
  const sourcePath = await resolveSessionFilePath('claude', providerSessionId, {
    claudeProjectsDir: join(claudeConfigDir, 'projects'),
    strictErrors: true
  })
  if (!sourcePath) {
    throw new Error('The Claude conversation to copy was not found.')
  }
  const { sessionId, resumeCursor, filePath } = await forkClaudeTranscript(
    sourcePath,
    providerSessionId
  )
  // Without a message the SDK writes no copy, so there is nothing to continue from.
  if (!resumeCursor) {
    throw new Error('The Claude conversation has no messages to copy yet.')
  }
  return { sessionId, filePath }
}
