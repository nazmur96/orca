import type * as ClaudeAgentSdk from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { SettingsUpdate } from '../../../shared/rpc-contract/client-settings-params'
import { forkSettingsRuntime } from '../fork-settings-runtime'
import { toolText } from './orca-app-tool-text'

/** Workflow settings Claude may change. Excluded on purpose: permission modes and agent
 *  commands/args/env (self-escalation), sharing switches, credentials-like fields. */
export const CLAUDE_EDITABLE_SETTINGS = [
  'defaultTuiAgent',
  'disabledTuiAgents',
  'compactWorktreeCards',
  'experimentalNewWorktreeCardStyle',
  'defaultTaskSource',
  'defaultTaskViewPreset',
  'visibleTaskProviders',
  'machineName'
] as const

type Sdk = Pick<typeof ClaudeAgentSdk, 'tool'>

function pickEditable(settings: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    CLAUDE_EDITABLE_SETTINGS.filter((key) => key in settings).map((key) => [key, settings[key]])
  )
}

/** Validate one change against the allowlist and Orca's own settings schema. */
export function parseClaudeSettingChange(
  key: string,
  value: unknown
): { ok: true; update: Record<string, unknown> } | { ok: false; reason: string } {
  if (!CLAUDE_EDITABLE_SETTINGS.some((allowed) => allowed === key)) {
    return {
      ok: false,
      reason: `"${key}" is not a setting Claude may change. Editable: ${CLAUDE_EDITABLE_SETTINGS.join(', ')}.`
    }
  }
  const parsed = SettingsUpdate.safeParse({ [key]: value })
  return parsed.success
    ? { ok: true, update: parsed.data }
    : {
        ok: false,
        reason: `Invalid value for ${key}: ${parsed.error.issues[0]?.message ?? 'rejected'}`
      }
}

export function buildOrcaSettingsTools(sdk: Sdk) {
  return [
    sdk.tool(
      'get_orca_settings',
      `Read the Orca settings Claude may change: ${CLAUDE_EDITABLE_SETTINGS.join(', ')}.`,
      {},
      async () => {
        const runtime = forkSettingsRuntime()
        return runtime
          ? toolText(JSON.stringify(pickEditable(runtime.getClientSettings()), null, 2))
          : toolText('Orca settings are unavailable in this process.', true)
      }
    ),
    sdk.tool(
      'update_orca_setting',
      `Change one Orca setting. Only these keys are allowed: ${CLAUDE_EDITABLE_SETTINGS.join(', ')}. Confirm with the user first unless they asked for it.`,
      {
        key: z.string().min(1),
        value: z.union([z.string(), z.boolean(), z.array(z.string()), z.null()])
      },
      async ({ key, value }) => {
        const runtime = forkSettingsRuntime()
        if (!runtime) {
          return toolText('Orca settings are unavailable in this process.', true)
        }
        const change = parseClaudeSettingChange(key, value)
        if (!change.ok) {
          return toolText(change.reason, true)
        }
        const updated = await runtime.updateClientSettings(change.update)
        return toolText(`Updated ${key}. Now: ${JSON.stringify(pickEditable(updated))}`)
      }
    )
  ]
}
