import type { OrcaRuntimeService } from '../runtime/orca-runtime'

export type ForkSettingsRuntime = Pick<
  OrcaRuntimeService,
  'getClientSettings' | 'updateClientSettings'
>

let runtime: ForkSettingsRuntime | null = null

/** Every runtime host (desktop main and orcad) registers itself on construction so Claude's settings tools can reach it. */
export function registerForkSettingsRuntime(next: ForkSettingsRuntime): void {
  runtime = next
}

export function forkSettingsRuntime(): ForkSettingsRuntime | null {
  return runtime
}
