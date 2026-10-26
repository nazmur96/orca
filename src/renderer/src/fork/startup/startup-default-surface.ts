import {
  emptyWorkspaceDefaultChatAwaitsDetection,
  loadEmptyWorkspaceDefaultChatDetection,
  openDefaultAgentChatInEmptyWorkspace
} from '@/lib/empty-workspace-default-agent-chat'

/** Fork: an empty workspace restored at startup opens the default agent chat (Cursor's agent view); the shell is the fallback. */
export async function seedStartupDefaultSurface(
  worktreeId: string,
  createShell: () => void,
  isCurrent: () => boolean
): Promise<void> {
  if (emptyWorkspaceDefaultChatAwaitsDetection(worktreeId)) {
    await loadEmptyWorkspaceDefaultChatDetection(worktreeId)
  }
  if (!isCurrent()) {
    return
  }
  const chat = openDefaultAgentChatInEmptyWorkspace(worktreeId, () => {
    createShell()
    return true
  })
  if (!chat) {
    createShell()
  }
}
