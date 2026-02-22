import { dialog, BrowserWindow } from 'electron'
import { readFile, writeFile } from 'fs/promises'

const OPAAL_FILTER = { name: 'Opaal Workflow', extensions: ['opaal'] }
const JSON_FILTER = { name: 'JSON', extensions: ['json'] }
const MD_FILTER = { name: 'Markdown', extensions: ['md'] }

export async function saveWorkflowDialog(
  win: BrowserWindow,
  data: string,
  currentPath?: string
): Promise<string | null> {
  if (currentPath) {
    await writeFile(currentPath, data, 'utf-8')
    return currentPath
  }

  const result = await dialog.showSaveDialog(win, {
    title: 'Save Workflow',
    defaultPath: 'workflow.opaal',
    filters: [OPAAL_FILTER, JSON_FILTER]
  })

  if (result.canceled || !result.filePath) return null

  await writeFile(result.filePath, data, 'utf-8')
  return result.filePath
}

export async function loadWorkflowDialog(
  win: BrowserWindow
): Promise<{ data: string; filePath: string } | null> {
  const result = await dialog.showOpenDialog(win, {
    title: 'Open Workflow',
    filters: [OPAAL_FILTER, JSON_FILTER],
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) return null

  const filePath = result.filePaths[0]
  const data = await readFile(filePath, 'utf-8')
  return { data, filePath }
}

export async function loadWorkflowByPath(
  filePath: string
): Promise<{ data: string; filePath: string } | null> {
  try {
    const data = await readFile(filePath, 'utf-8')
    return { data, filePath }
  } catch {
    return null
  }
}

export async function exportPromptDialog(
  win: BrowserWindow,
  promptText: string
): Promise<string | null> {
  const result = await dialog.showSaveDialog(win, {
    title: 'Export Prompt',
    defaultPath: 'CLAUDE.md',
    filters: [MD_FILTER]
  })

  if (result.canceled || !result.filePath) return null

  await writeFile(result.filePath, promptText, 'utf-8')
  return result.filePath
}
