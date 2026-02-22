import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Skills
  scanSkills: () => ipcRenderer.invoke('skills:scan'),
  readSkillContent: (skillPath: string) => ipcRenderer.invoke('skills:read-content', skillPath),
  writeSkillContent: (skillPath: string, content: string) =>
    ipcRenderer.invoke('skills:write-content', skillPath, content),
  createSkillDirectory: (skillName: string) =>
    ipcRenderer.invoke('skills:create-directory', skillName),
  deleteSkill: (skillPath: string) =>
    ipcRenderer.invoke('skills:delete', skillPath),
  validateSkillContent: (content: string) =>
    ipcRenderer.invoke('skills:validate', content),

  // File operations
  saveWorkflow: (data: string, currentPath?: string) =>
    ipcRenderer.invoke('file:save', data, currentPath),
  loadWorkflow: () => ipcRenderer.invoke('file:load'),
  loadWorkflowByPath: (filePath: string) =>
    ipcRenderer.invoke('file:load-path', filePath),
  exportPrompt: (promptText: string) =>
    ipcRenderer.invoke('file:export-prompt', promptText),

  // Persistence: Recent files
  getRecentFiles: () => ipcRenderer.invoke('persistence:get-recent'),
  addRecentFile: (file: unknown) => ipcRenderer.invoke('persistence:add-recent', file),
  removeRecentFile: (filePath: string) => ipcRenderer.invoke('persistence:remove-recent', filePath),
  clearRecentFiles: () => ipcRenderer.invoke('persistence:clear-recent'),

  // Persistence: Draft auto-save
  saveDraft: (workflow: string) => ipcRenderer.invoke('persistence:save-draft', workflow),
  getDraft: () => ipcRenderer.invoke('persistence:get-draft'),
  clearDraft: () => ipcRenderer.invoke('persistence:clear-draft'),

  // Persistence: Custom agent templates
  getCustomAgents: () => ipcRenderer.invoke('persistence:get-custom-agents'),
  saveCustomAgent: (agent: unknown) => ipcRenderer.invoke('persistence:save-custom-agent', agent),
  removeCustomAgent: (id: string) => ipcRenderer.invoke('persistence:remove-custom-agent', id),
  clearCustomAgents: () => ipcRenderer.invoke('persistence:clear-custom-agents'),

  // Persistence: Hidden default roles
  getHiddenDefaultRoles: () => ipcRenderer.invoke('persistence:get-hidden-roles'),
  setHiddenDefaultRoles: (roles: string[]) => ipcRenderer.invoke('persistence:set-hidden-roles', roles),
  clearHiddenDefaultRoles: () => ipcRenderer.invoke('persistence:clear-hidden-roles'),

  // Persistence: Default role order
  getDefaultRoleOrder: () => ipcRenderer.invoke('persistence:get-role-order'),
  setDefaultRoleOrder: (roles: string[]) => ipcRenderer.invoke('persistence:set-role-order', roles),
  clearDefaultRoleOrder: () => ipcRenderer.invoke('persistence:clear-role-order'),

  // Persistence: Custom agent reorder
  reorderCustomAgents: (orderedIds: string[]) => ipcRenderer.invoke('persistence:reorder-custom-agents', orderedIds),

  // Persistence: Unified order
  getUnifiedOrder: () => ipcRenderer.invoke('persistence:get-unified-order'),
  setUnifiedOrder: (order: string[]) => ipcRenderer.invoke('persistence:set-unified-order', order),
  clearUnifiedOrder: () => ipcRenderer.invoke('persistence:clear-unified-order'),

  // Claude Code integration
  detectClaudeCli: () => ipcRenderer.invoke('claude:detect'),
  launchClaudeCode: (prompt: string, options?: unknown) =>
    ipcRenderer.invoke('claude:launch', prompt, options),

  // Claude settings
  setClaudeApiKey: (key: string) => ipcRenderer.invoke('claude:set-api-key', key),

  // Claude Agent SDK execution
  checkClaudeSdk: () => ipcRenderer.invoke('claude:check-sdk'),
  runClaudeWorkflow: (prompt: string, options?: unknown) =>
    ipcRenderer.invoke('claude:run', prompt, options),
  stopClaudeWorkflow: () => ipcRenderer.invoke('claude:stop'),

  // SDK message listeners (main -> renderer)
  onClaudeMessage: (callback: (event: unknown, data: unknown) => void) => {
    ipcRenderer.on('claude:message', callback as (...args: unknown[]) => void)
    return () => { ipcRenderer.removeListener('claude:message', callback as (...args: unknown[]) => void) }
  },
  onClaudeComplete: (callback: (event: unknown, data: unknown) => void) => {
    ipcRenderer.on('claude:complete', callback as (...args: unknown[]) => void)
    return () => { ipcRenderer.removeListener('claude:complete', callback as (...args: unknown[]) => void) }
  },
  onClaudeError: (callback: (event: unknown, data: unknown) => void) => {
    ipcRenderer.on('claude:error', callback as (...args: unknown[]) => void)
    return () => { ipcRenderer.removeListener('claude:error', callback as (...args: unknown[]) => void) }
  },
  onClaudeStopped: (callback: (event: unknown, data: unknown) => void) => {
    ipcRenderer.on('claude:stopped', callback as (...args: unknown[]) => void)
    return () => { ipcRenderer.removeListener('claude:stopped', callback as (...args: unknown[]) => void) }
  },

  // App lifecycle
  onBeforeClose: (callback: () => void) => {
    ipcRenderer.on('app:before-close', callback)
    return () => { ipcRenderer.removeListener('app:before-close', callback) }
  },
  forceClose: () => ipcRenderer.send('app:force-close'),
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
}
