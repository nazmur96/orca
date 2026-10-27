import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { adoptAgentSessionLaunchVerdict } from '@/lib/agent-session-launch-plan'
import { newAgentLaunchRequestId } from '@/lib/agent-launch-request-id'
import { beginStructuredAgentSessionProvisionalLaunch } from '@/lib/agent-session/structured-agent-session-provisional-tab'
import { captureNativeChatComposerFocusIntent } from '@/components/native-chat/use-native-chat-composer-reveal-focus'
import { resolveUnifiedTabLabel } from '../../../../shared/tab-title-resolution'
import { linkSideChat } from './side-chat-registry'
import { readClaudePanelGroupId } from '../claude-panel/claude-panel-registry'

export type SideChatSource = {
  tabId: string
  worktreeId: string
  groupId: string
  sessionId: string
}

function notifyOpenFailed(): false {
  toast.error(
    translate('components.native-chat.sideChat.openFailed', 'Could not open a side chat.')
  )
  return false
}

/** An unowned copy of the conversation, so resuming it never shares a writer with the main chat. */
async function forkConversation(source: SideChatSource): Promise<string | null> {
  try {
    const copy = await window.api.aiVault.copyChatForSideChat({
      sessionId: source.sessionId,
      workspaceId: source.worktreeId
    })
    return copy.sessionId
  } catch (error) {
    console.error('Side chat fork failed', error)
    return null
  }
}

function labelSideChat(source: SideChatSource, sideSessionId: string): void {
  const state = useAppStore.getState()
  const tabs = state.unifiedTabsByWorktree[source.worktreeId] ?? []
  const sideTab = tabs.find((tab) => tab.entityId === sideSessionId)
  const mainTab = tabs.find((tab) => tab.id === source.tabId)
  if (!sideTab) {
    return
  }
  const name = mainTab ? resolveUnifiedTabLabel(mainTab, false) : ''
  state.setTabCustomLabel(
    sideTab.id,
    name
      ? translate('components.native-chat.sideChat.tabLabel', 'Side chat · {{name}}', { name })
      : translate('components.native-chat.sideChat.tabLabelBare', 'Side chat')
  )
}

/** Fork the chat into a new split on its right, its composer then switches it to Ask for approval. */
export async function openSideChat(source: SideChatSource): Promise<boolean> {
  const focusIntent = captureNativeChatComposerFocusIntent()
  const forkedSessionId = await forkConversation(source)
  const groupId = forkedSessionId
    ? useAppStore
        .getState()
        .createEmptySplitGroup(
          source.worktreeId,
          source.groupId,
          readClaudePanelGroupId(source.worktreeId) === source.groupId ? 'down' : 'right'
        )
    : null
  if (!forkedSessionId || !groupId) {
    focusIntent.cancel()
    return notifyOpenFailed()
  }
  const closePane = (): void => {
    useAppStore.getState().closeEmptyGroup(source.worktreeId, groupId)
  }
  const plan = adoptAgentSessionLaunchVerdict({
    route: 'structured-native-chat',
    requestId: newAgentLaunchRequestId(),
    agent: 'claude',
    worktreeId: source.worktreeId,
    resumeFrom: { providerSessionId: forkedSessionId }
  })
  const launch = beginStructuredAgentSessionProvisionalLaunch({
    plan,
    hooks: {},
    focusIntent,
    targetGroupId: groupId
  })
  if (!launch) {
    closePane()
    return notifyOpenFailed()
  }
  const settlement = await launch.settlement
  if (settlement.kind !== 'structured') {
    closePane()
    return settlement.kind === 'failed' && settlement.notified ? false : notifyOpenFailed()
  }
  labelSideChat(source, settlement.sessionId)
  linkSideChat(settlement.sessionId, {
    mainTabId: source.tabId,
    mainSessionId: source.sessionId,
    worktreeId: source.worktreeId,
    askModePending: true
  })
  return true
}
