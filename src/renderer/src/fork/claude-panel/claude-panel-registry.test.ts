import { beforeEach, describe, expect, it } from 'vitest'
import {
  isClaudePanelHidden,
  readClaudePanelGroupId,
  readSavedEditorRatio,
  resetClaudePanelRegistryForTests,
  saveEditorRatio,
  setClaudePanelGroupId,
  setClaudePanelHidden
} from './claude-panel-registry'

describe('claude panel registry', () => {
  beforeEach(() => resetClaudePanelRegistryForTests())

  it('remembers the panel group per workspace and forgets it on null', () => {
    setClaudePanelGroupId('wt-a', 'g1')
    expect(readClaudePanelGroupId('wt-a')).toBe('g1')
    expect(readClaudePanelGroupId('wt-b')).toBeNull()
    setClaudePanelGroupId('wt-a', null)
    expect(readClaudePanelGroupId('wt-a')).toBeNull()
  })

  it('keeps the hidden flag and the editor ratio', () => {
    expect(isClaudePanelHidden()).toBe(false)
    setClaudePanelHidden(true)
    expect(isClaudePanelHidden()).toBe(true)
    expect(readSavedEditorRatio('wt-a')).toBeNull()
    saveEditorRatio('wt-a', 0.7)
    expect(readSavedEditorRatio('wt-a')).toBe(0.7)
  })

  it('works when storage is unavailable', () => {
    setClaudePanelGroupId('wt-a', 'g1')
    expect(readClaudePanelGroupId('wt-a')).toBe('g1')
  })
})
