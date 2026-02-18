import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Skills
  scanSkills: () => ipcRenderer.invoke('skills:scan'),

  // File operations
  saveWorkflow: (data: string, currentPath?: string) =>
    ipcRenderer.invoke('file:save', data, currentPath),
  loadWorkflow: () => ipcRenderer.invoke('file:load'),
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
