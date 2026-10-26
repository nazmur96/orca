import type { SessionStoreEntry } from '@anthropic-ai/claude-agent-sdk'
import { createReadStream } from 'node:fs'
import { rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { AgentSessionRewindFork } from '../../shared/agent-session-rewind'
import { durableWriteTempPath, renameDurable, writeTempFileDurable } from '../durable-file-write'
import { splitTranscriptStreamLines } from '../native-chat/transcript-stream-lines'
import { loadClaudeAgentSdk } from './claude-stream-json-connection'

function isTranscriptEntry(value: unknown): value is SessionStoreEntry {
  return (
    typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string'
  )
}

function parseTranscriptEntry(line: string): SessionStoreEntry | undefined {
  try {
    const entry: unknown = JSON.parse(line)
    return isTranscriptEntry(entry) ? entry : undefined
  } catch {
    return undefined
  }
}

/** Use Claude's fork implementation for branch selection, compaction and UUID remapping; no cut point copies it all. */
export async function forkClaudeTranscript(
  sourcePath: string,
  sourceSessionId: string,
  upToMessageId?: string
): Promise<{ sessionId: string; resumeCursor: string | undefined; filePath: string }> {
  const { forkSession } = await loadClaudeAgentSdk()
  let resumeCursor: string | undefined
  const result = await forkSession(sourceSessionId, {
    ...(upToMessageId ? { upToMessageId } : {}),
    // Pin reads and writes to the resolved account without mutating process.env.
    sessionStore: {
      load: async () => {
        const entries: SessionStoreEntry[] = []
        for await (const { line } of splitTranscriptStreamLines(createReadStream(sourcePath))) {
          if (!line.trim()) {
            continue
          }
          const entry = parseTranscriptEntry(line)
          // Tolerate crash-torn lines like the SDK reader.
          if (entry) {
            entries.push(entry)
          }
        }
        return entries
      },
      append: async (key, entries) => {
        resumeCursor = entries.findLast(
          (entry) => entry.type === 'assistant' || entry.type === 'user'
        )?.uuid
        if (!resumeCursor) {
<<<<<<< HEAD
          // Metadata alone uses the same fresh launch as a rewind with no parent.
          return
=======
          throw new Error('claude fork is missing its resume point')
>>>>>>> 5ba87200e (feat(fork): copy Claude chat conversations for side chats)
        }
        const destination = join(dirname(sourcePath), `${key.sessionId}.jsonl`)
        const temporary = durableWriteTempPath(destination)
        try {
          await writeTempFileDurable(
            temporary,
            `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`,
            0o600
          )
          await renameDurable(temporary, destination)
        } finally {
          await rm(temporary, { force: true })
        }
      }
    }
  })
<<<<<<< HEAD
  return resumeCursor
    ? { ...fork, sessionId: result.sessionId, resumeCursor, materialized: true }
    : {
        sessionId: fork.sessionId,
        sourceSessionId: fork.sourceSessionId,
        replacesSessionId: fork.replacesSessionId,
        materialized: true
      }
=======
  return {
    sessionId: result.sessionId,
    resumeCursor,
    filePath: join(dirname(sourcePath), `${result.sessionId}.jsonl`)
  }
}

export async function materializeClaudeRewindTranscript(
  sourcePath: string,
  fork: AgentSessionRewindFork
): Promise<AgentSessionRewindFork> {
  if (!fork.throughEntryId) {
    return { ...fork, materialized: true }
  }
  const { sessionId, resumeCursor } = await forkClaudeTranscript(
    sourcePath,
    fork.sourceSessionId,
    fork.throughEntryId
  )
  return { ...fork, sessionId, resumeCursor, materialized: true }
>>>>>>> 5ba87200e (feat(fork): copy Claude chat conversations for side chats)
}
