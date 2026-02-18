interface DetectedSkill {
  id: string
  name: string
  path: string
  description: string
}

interface RecentFileData {
  filePath: string
  name: string
  agentCount: number
  waveCount: number
  roleColors: string[]
  lastOpened: string
}

interface DraftData {
  workflow: string
  savedAt: string
}

interface CustomAgentTemplateData {
  id: string
  name: string
  role: string
  roleDescription: string
  skills: { id: string; name: string; source: 'detected' | 'manual' }[]
  outputDefinition: string
  instructions: string
  createdAt: string
  updatedAt: string
}

interface ElectronAPI {
  // Skills
  scanSkills: () => Promise<DetectedSkill[]>

  // File operations
  saveWorkflow: (data: string, currentPath?: string) => Promise<string | null>
  loadWorkflow: () => Promise<{ data: string; filePath: string } | null>
  exportPrompt: (promptText: string) => Promise<string | null>

  // Persistence: Recent files
  getRecentFiles: () => Promise<RecentFileData[]>
  addRecentFile: (file: RecentFileData) => Promise<void>
  removeRecentFile: (filePath: string) => Promise<void>
  clearRecentFiles: () => Promise<void>

  // Persistence: Draft auto-save
  saveDraft: (workflow: string) => Promise<void>
  getDraft: () => Promise<DraftData | null>
  clearDraft: () => Promise<void>

  // Persistence: Custom agent templates
  getCustomAgents: () => Promise<CustomAgentTemplateData[]>
  saveCustomAgent: (agent: CustomAgentTemplateData) => Promise<void>
  removeCustomAgent: (id: string) => Promise<void>
  clearCustomAgents: () => Promise<void>

  // Persistence: Hidden default roles
  getHiddenDefaultRoles: () => Promise<string[]>
  setHiddenDefaultRoles: (roles: string[]) => Promise<void>
  clearHiddenDefaultRoles: () => Promise<void>

  // Persistence: Default role order
  getDefaultRoleOrder: () => Promise<string[]>
  setDefaultRoleOrder: (roles: string[]) => Promise<void>
  clearDefaultRoleOrder: () => Promise<void>

  // Persistence: Custom agent reorder
  reorderCustomAgents: (orderedIds: string[]) => Promise<void>

  // Persistence: Unified order
  getUnifiedOrder: () => Promise<string[]>
  setUnifiedOrder: (order: string[]) => Promise<void>
  clearUnifiedOrder: () => Promise<void>

  // App lifecycle
  onBeforeClose: (callback: () => void) => () => void
  forceClose: () => void
}

declare interface Window {
  api: ElectronAPI
}
