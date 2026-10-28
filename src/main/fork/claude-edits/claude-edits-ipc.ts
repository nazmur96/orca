import { ipcMain } from 'electron'
import { keepClaudeEdits, listClaudeEdits, undoClaudeEdits } from './claude-edit-baselines'

function stringList(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined
}

/** Renderer access to the edit review: list pending Claude edits, keep or undo them. */
export function registerClaudeEditsHandlers(): void {
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
