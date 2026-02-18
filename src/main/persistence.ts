import Store from 'electron-store'

export interface RecentFile {
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

export interface CustomAgentTemplateData {
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

interface StoreSchema {
  recentFiles: RecentFile[]
  draft: DraftData | null
  customAgents: CustomAgentTemplateData[]
  hiddenDefaultRoles: string[]
  defaultRoleOrder: string[]
  unifiedOrder: string[]
}

const store = new Store<StoreSchema>({
  name: 'opaal-persistence',
  projectName: 'opaal',
  defaults: {
    recentFiles: [],
    draft: null,
    customAgents: [],
    hiddenDefaultRoles: [],
    defaultRoleOrder: [],
    unifiedOrder: [],
  },
})

// ── Recent Files ──

export function getRecentFiles(): RecentFile[] {
  return store.get('recentFiles')
}

export function addRecentFile(file: RecentFile): void {
  const existing = store.get('recentFiles')
  const filtered = existing.filter((f) => f.filePath !== file.filePath)
  const updated = [file, ...filtered].slice(0, 10)
  store.set('recentFiles', updated)
}

export function removeRecentFile(filePath: string): void {
  const existing = store.get('recentFiles')
  store.set(
    'recentFiles',
    existing.filter((f) => f.filePath !== filePath)
  )
}

export function clearRecentFiles(): void {
  store.set('recentFiles', [])
}

// ── Draft Auto-save ──

export function saveDraft(workflow: string): void {
  store.set('draft', {
    workflow,
    savedAt: new Date().toISOString(),
  })
}

export function getDraft(): DraftData | null {
  return store.get('draft')
}

export function clearDraft(): void {
  store.set('draft', null)
}

// ── Custom Agent Templates ──

export function getCustomAgents(): CustomAgentTemplateData[] {
  return store.get('customAgents')
}

export function saveCustomAgent(agent: CustomAgentTemplateData): void {
  const raw = store.get('customAgents')
  const existing = Array.isArray(raw) ? raw : []
  const filtered = existing.filter((a) => a.id !== agent.id)
  store.set('customAgents', [agent, ...filtered])
}

export function removeCustomAgent(id: string): void {
  const existing = store.get('customAgents')
  store.set('customAgents', existing.filter((a) => a.id !== id))
}

export function clearCustomAgents(): void {
  store.set('customAgents', [])
}

// ── Hidden Default Roles ──

export function getHiddenDefaultRoles(): string[] {
  return store.get('hiddenDefaultRoles')
}

export function setHiddenDefaultRoles(roles: string[]): void {
  store.set('hiddenDefaultRoles', roles)
}

export function clearHiddenDefaultRoles(): void {
  store.set('hiddenDefaultRoles', [])
}

// ── Default Role Order ──

export function getDefaultRoleOrder(): string[] {
  return store.get('defaultRoleOrder')
}

export function setDefaultRoleOrder(roles: string[]): void {
  store.set('defaultRoleOrder', roles)
}

export function clearDefaultRoleOrder(): void {
  store.set('defaultRoleOrder', [])
}

// ── Custom Agent Reorder ──

export function reorderCustomAgents(orderedIds: string[]): void {
  const agents = store.get('customAgents')
  const reordered: CustomAgentTemplateData[] = []
  for (const id of orderedIds) {
    const agent = agents.find((a) => a.id === id)
    if (agent) reordered.push(agent)
  }
  for (const agent of agents) {
    if (!orderedIds.includes(agent.id)) reordered.push(agent)
  }
  store.set('customAgents', reordered)
}

// ── Unified Order ──

export function getUnifiedOrder(): string[] {
  return store.get('unifiedOrder')
}

export function setUnifiedOrder(order: string[]): void {
  store.set('unifiedOrder', order)
}

export function clearUnifiedOrder(): void {
  store.set('unifiedOrder', [])
}
