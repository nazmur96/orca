import type { AgentSessionContinuationRequest } from '@/lib/agent-session-continuation'

type HandoffChat = { id: string; entityId: string; groupId: string; title: string }

type HandoffStatus = {
  prompt?: string
  lastAssistantMessage?: string
  providerSession?: { transcriptPath?: string | null } | null
}

/** Orca's handoff dialog, fed from a live Claude chat instead of a history record. */
export function buildClaudeChatHandoffRequest(
  chat: HandoffChat,
  status: HandoffStatus | undefined,
  worktreeId: string,
  workspacePath: string
): AgentSessionContinuationRequest {
  const lastAssistantMessage = status?.lastAssistantMessage?.trim() || null
  return {
    source: {
      sourceAgent: 'claude',
      capturedText: lastAssistantMessage ?? '',
      sourceTitle: chat.title,
      sourceWorkingDirectory: workspacePath,
      transcriptPath: status?.providerSession?.transcriptPath ?? null,
      lastPrompt: status?.prompt?.trim() || null,
      lastAssistantMessage
    },
    worktreeId,
    groupId: chat.groupId,
    workspacePath,
    launchSource: 'sidebar'
  }
}
