import { ipcMain } from 'electron'
import {
  keepClaudeEdits,
  listClaudeEdits,
  undoClaudeEdits,
  writeReviewedClaudeEdit
} from './claude-edit-baselines'
import { runClaudeInlineEdit } from '../inline-edit/claude-inline-edit'
import { claudeEditorModel } from '../../../shared/fork-claude-editor-model'
import type { ClaudeInlineEditRequest } from '../../../shared/fork-claude-edits'

function parseInlineEditRequest(request: unknown): ClaudeInlineEditRequest | null {
  if (!request || typeof request !== 'object') {
    return null
  }
  const field = (key: string): string | null => {
    const value: unknown = Reflect.get(request, key)
    return typeof value === 'string' ? value : null
  }
  const [workspacePath, filePath, language, instruction, selection, before, after] = [
    'workspacePath',
    'filePath',
    'language',
    'instruction',
    'selection',
    'before',
    'after'
  ].map(field)
  if (
    workspacePath === null ||
    filePath === null ||
    language === null ||
    !instruction?.trim() ||
    selection === null ||
    before === null ||
    after === null
  ) {
    return null
  }
  return {
    workspacePath,
    filePath,
    language,
    instruction,
    selection,
    before,
    after,
    // Only the models the setting offers reach the CLI.
    model: claudeEditorModel(field('model'))
  }
}

function stringList(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined
}

/** Renderer access to the edit review: list pending Claude edits, keep or undo them. */
export function registerClaudeEditsHandlers(): void {
  ipcMain.handle('aiVault:writeReviewedClaudeEdit', async (_event, request: unknown) => {
    if (!request || typeof request !== 'object') {
      return false
    }
    const workspacePath: unknown = Reflect.get(request, 'workspacePath')
    const path: unknown = Reflect.get(request, 'path')
    const content: unknown = Reflect.get(request, 'content')
    return typeof workspacePath === 'string' &&
      typeof path === 'string' &&
      typeof content === 'string'
      ? writeReviewedClaudeEdit(workspacePath, path, content)
      : false
  })
  ipcMain.handle('aiVault:claudeInlineEdit', async (_event, request: unknown) => {
    const parsed = parseInlineEditRequest(request)
    return parsed
      ? runClaudeInlineEdit(parsed)
      : { ok: false, error: 'Invalid inline edit request.' }
  })
  ipcMain.handle('aiVault:listClaudeEdits', async (_event, workspacePath: unknown) =>
    typeof workspacePath === 'string' ? listClaudeEdits(workspacePath) : []
  )
  ipcMain.handle('aiVault:resolveClaudeEdits', async (_event, request: unknown) => {
    if (!request || typeof request !== 'object') {
      return
    }
    const workspacePath: unknown = Reflect.get(request, 'workspacePath')
    const action: unknown = Reflect.get(request, 'action')
    const paths = stringList(Reflect.get(request, 'paths'))
    if (typeof workspacePath !== 'string') {
      return
    }
    if (action === 'keep') {
      await keepClaudeEdits(workspacePath, paths)
    } else if (action === 'undo') {
      await undoClaudeEdits(workspacePath, paths)
    }
  })
}
