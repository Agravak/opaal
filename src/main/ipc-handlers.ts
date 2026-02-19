import { ipcMain, BrowserWindow } from 'electron'
import { scanSkills, readSkillContent } from './skills-scanner'
import { writeSkillContent, createSkillDirectory, deleteSkillDirectory, validateSkillContent } from './skill-operations'
import { saveWorkflowDialog, loadWorkflowDialog, exportPromptDialog } from './file-operations'
import { detectClaudeCli, launchClaudeCode, type LaunchOptions } from './claude-integration'
import { checkSdkAvailability, runWorkflow, stopWorkflow, type RunOptions } from './claude-sdk-runner'
import {
  getRecentFiles,
  addRecentFile,
  removeRecentFile,
  clearRecentFiles,
  saveDraft,
  getDraft,
  clearDraft,
  getCustomAgents,
  saveCustomAgent,
  removeCustomAgent,
  clearCustomAgents,
  getHiddenDefaultRoles,
  setHiddenDefaultRoles,
  clearHiddenDefaultRoles,
  getDefaultRoleOrder,
  setDefaultRoleOrder,
  clearDefaultRoleOrder,
  reorderCustomAgents,
  getUnifiedOrder,
  setUnifiedOrder,
  clearUnifiedOrder,
  type RecentFile,
  type CustomAgentTemplateData,
} from './persistence'

let mainWindowRef: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow): void {
  mainWindowRef = win
}

export function registerIpcHandlers(): void {
  // Skills scanning
  ipcMain.handle('skills:scan', async () => {
    return await scanSkills()
  })

  ipcMain.handle('skills:read-content', async (_event, skillPath: string) => {
    return await readSkillContent(skillPath)
  })

  ipcMain.handle('skills:write-content', async (_event, skillPath: string, content: string) => {
    try {
      await writeSkillContent(skillPath, content)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('skills:create-directory', async (_event, skillName: string) => {
    try {
      const path = await createSkillDirectory(skillName)
      return { success: true, path }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('skills:delete', async (_event, skillPath: string) => {
    try {
      await deleteSkillDirectory(skillPath)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('skills:validate', async (_event, content: string) => {
    return validateSkillContent(content)
  })

  // File operations
  ipcMain.handle('file:save', async (event, data: string, currentPath?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null
    return await saveWorkflowDialog(win, data, currentPath)
  })

  ipcMain.handle('file:load', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null
    return await loadWorkflowDialog(win)
  })

  ipcMain.handle('file:export-prompt', async (event, promptText: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null
    return await exportPromptDialog(win, promptText)
  })

  // Persistence: Recent files
  ipcMain.handle('persistence:get-recent', () => {
    return getRecentFiles()
  })

  ipcMain.handle('persistence:add-recent', (_event, file: RecentFile) => {
    addRecentFile(file)
  })

  ipcMain.handle('persistence:remove-recent', (_event, filePath: string) => {
    removeRecentFile(filePath)
  })

  ipcMain.handle('persistence:clear-recent', () => {
    clearRecentFiles()
  })

  // Persistence: Draft auto-save
  ipcMain.handle('persistence:save-draft', (_event, workflow: string) => {
    saveDraft(workflow)
  })

  ipcMain.handle('persistence:get-draft', () => {
    return getDraft()
  })

  ipcMain.handle('persistence:clear-draft', () => {
    clearDraft()
  })

  // Persistence: Custom agent templates
  ipcMain.handle('persistence:get-custom-agents', () => {
    return getCustomAgents()
  })

  ipcMain.handle('persistence:save-custom-agent', (_event, agent: CustomAgentTemplateData) => {
    saveCustomAgent(agent)
  })

  ipcMain.handle('persistence:remove-custom-agent', (_event, id: string) => {
    removeCustomAgent(id)
  })

  ipcMain.handle('persistence:clear-custom-agents', () => {
    clearCustomAgents()
  })

  // Persistence: Hidden default roles
  ipcMain.handle('persistence:get-hidden-roles', () => {
    return getHiddenDefaultRoles()
  })

  ipcMain.handle('persistence:set-hidden-roles', (_event, roles: string[]) => {
    setHiddenDefaultRoles(roles)
  })

  ipcMain.handle('persistence:clear-hidden-roles', () => {
    clearHiddenDefaultRoles()
  })

  // Persistence: Default role order
  ipcMain.handle('persistence:get-role-order', () => {
    return getDefaultRoleOrder()
  })

  ipcMain.handle('persistence:set-role-order', (_event, roles: string[]) => {
    setDefaultRoleOrder(roles)
  })

  ipcMain.handle('persistence:clear-role-order', () => {
    clearDefaultRoleOrder()
  })

  // Persistence: Custom agent reorder
  ipcMain.handle('persistence:reorder-custom-agents', (_event, orderedIds: string[]) => {
    reorderCustomAgents(orderedIds)
  })

  // Persistence: Unified order
  ipcMain.handle('persistence:get-unified-order', () => {
    return getUnifiedOrder()
  })

  ipcMain.handle('persistence:set-unified-order', (_event, order: string[]) => {
    setUnifiedOrder(order)
  })

  ipcMain.handle('persistence:clear-unified-order', () => {
    clearUnifiedOrder()
  })

  // Claude Code integration
  ipcMain.handle('claude:detect', async () => {
    return await detectClaudeCli()
  })

  ipcMain.handle('claude:launch', async (_event, prompt: string, options?: LaunchOptions) => {
    return await launchClaudeCode(prompt, options)
  })

  // Claude settings
  ipcMain.handle('claude:set-api-key', (_event, key: string) => {
    if (key) {
      process.env.ANTHROPIC_API_KEY = key
    }
  })

  // Claude Agent SDK execution
  ipcMain.handle('claude:check-sdk', async () => {
    return await checkSdkAvailability()
  })

  ipcMain.handle('claude:run', async (event, prompt: string, options?: RunOptions) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return { success: false, error: 'No window found' }
    return await runWorkflow(win, prompt, options)
  })

  ipcMain.handle('claude:stop', () => {
    return stopWorkflow()
  })

  // App: Force close (bypasses beforeunload guard)
  ipcMain.on('app:force-close', () => {
    if (mainWindowRef) {
      mainWindowRef.destroy()
    }
  })
}
