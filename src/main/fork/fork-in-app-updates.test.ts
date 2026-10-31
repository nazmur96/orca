import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const electron = vi.hoisted(() => ({ app: { isPackaged: true } }))
vi.mock('electron', () => electron)

import { inAppUpdatesEnabled } from './fork-in-app-updates'

// The unit setup opts upstream's updater tests in; these cases start from a real fork build.
const setupValue = process.env.ORCA_FORK_ALLOW_UPSTREAM_UPDATES
beforeEach(() => {
  delete process.env.ORCA_FORK_ALLOW_UPSTREAM_UPDATES
})
afterEach(() => {
  process.env.ORCA_FORK_ALLOW_UPSTREAM_UPDATES = setupValue
})

describe('inAppUpdatesEnabled', () => {
  it('keeps a packaged fork off the upstream release feed', () => {
    expect(inAppUpdatesEnabled()).toBe(false)
  })

  it('allows it only when asked for explicitly', () => {
    process.env.ORCA_FORK_ALLOW_UPSTREAM_UPDATES = '1'
    expect(inAppUpdatesEnabled()).toBe(true)
  })
})
