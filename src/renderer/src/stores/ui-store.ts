import { create } from 'zustand'
import type { AgentRole } from '../types/workflow'

interface ContextMenu {
  x: number
  y: number
  nodeId: string | null
  edgeId: string | null
}

export type CanvasMode = 'select' | 'pan' | 'place'
export type AppView = 'home' | 'canvas' | 'workshop'

interface ConfirmModalState {
  open: boolean
  action: 'close' | 'new' | 'load' | null
  onProceed?: () => void
}

interface UIState {
  theme: 'light' | 'dark'
  view: AppView
  selectedNodeIds: Set<string>
  selectedEdgeIds: Set<string>
  paletteCollapsed: boolean
  skillsPanelCollapsed: boolean
  promptPanelCollapsed: boolean
  controlGroups: Map<number, string[]>
  contextMenu: ContextMenu | null
  canvasMode: CanvasMode

  // Placement mode (Red Alert style)
  placementMode: boolean
  placementRole: AgentRole | null
  placementTemplateId: string | null

  // Agent config popup
  configPopupAgentId: string | null

  // Connection config popup
  configPopupConnectionId: string | null

  // Settings popup
  settingsOpen: boolean

  // Prompt modal
  promptModalOpen: boolean

  // Execution modal
  executionModalOpen: boolean

  // Agent manager popup
  agentManagerOpen: boolean

  // Command bar expanded view
  commandBarExpanded: boolean

  // Claude integration settings
  claudeIntegrationEnabled: boolean
  claudeApiKey: string

  // Confirm modal
  confirmModal: ConfirmModalState

  // Skill viewer
  skillViewerSkill: { name: string; path: string } | null

  // Backward compat: derived single selection
  readonly selectedNodeId: string | null

  toggleTheme: () => void
  toggleCommandBarExpanded: () => void

  // View navigation
  setView: (view: AppView) => void

  // Multi-selection operations
  selectNode: (id: string) => void
  toggleNodeSelection: (id: string) => void
  selectNodes: (ids: string[]) => void
  selectEdges: (ids: string[]) => void
  setSelection: (nodeIds: string[], edgeIds: string[]) => void
  clearSelection: () => void

  // Legacy compat
  setSelectedNode: (id: string | null) => void

  // Config popup
  openConfigPopup: (agentId: string) => void
  closeConfigPopup: () => void

  // Connection config popup
  openConnectionConfigPopup: (connectionId: string) => void
  closeConnectionConfigPopup: () => void

  // Settings popup
  toggleSettings: () => void

  // Prompt modal
  openPromptModal: () => void
  closePromptModal: () => void

  // Execution modal
  openExecutionModal: () => void
  closeExecutionModal: () => void

  // Agent manager popup
  openAgentManager: () => void
  closeAgentManager: () => void

  togglePalette: () => void
  toggleSkillsPanel: () => void
  togglePromptPanel: () => void
  expandRightPanels: () => void

  // Canvas mode
  setCanvasMode: (mode: CanvasMode) => void
  toggleCanvasMode: () => void

  // Placement mode
  enterPlacementMode: (role: AgentRole) => void
  enterPlacementModeCustom: (templateId: string) => void
  exitPlacementMode: () => void

  // Control groups
  saveControlGroup: (key: number) => void
  recallControlGroup: (key: number) => void

  // Context menu
  openContextMenu: (x: number, y: number, nodeId: string | null, edgeId: string | null) => void
  closeContextMenu: () => void

  // Confirm modal
  openConfirmModal: (action: ConfirmModalState['action'], onProceed?: () => void) => void
  closeConfirmModal: () => void

  // Skill viewer
  openSkillViewer: (name: string, path: string) => void
  closeSkillViewer: () => void

  // Claude integration settings
  setClaudeIntegrationEnabled: (enabled: boolean) => void
  setClaudeApiKey: (key: string) => void
}

const getInitialCommandBarExpanded = (): boolean => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('opaal-command-bar-expanded') === 'true'
  }
  return false
}

const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('opaal-theme')
    if (stored === 'light' || stored === 'dark') return stored
  }
  return 'dark'
}

const getInitialClaudeEnabled = (): boolean => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('opaal-claude-enabled') === 'true'
  }
  return false
}

const getInitialClaudeApiKey = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('opaal-claude-api-key') || ''
  }
  return ''
}

export const useUIStore = create<UIState>()((set, get) => ({
  theme: getInitialTheme(),
  view: 'home' as AppView,
  selectedNodeIds: new Set<string>(),
  selectedEdgeIds: new Set<string>(),
  paletteCollapsed: false,
  skillsPanelCollapsed: false,
  promptPanelCollapsed: false,
  controlGroups: new Map<number, string[]>(),
  contextMenu: null,
  canvasMode: 'select' as CanvasMode,

  // Placement mode
  placementMode: false,
  placementRole: null as AgentRole | null,
  placementTemplateId: null as string | null,

  // Popup state
  configPopupAgentId: null,
  configPopupConnectionId: null,
  settingsOpen: false,
  promptModalOpen: false,
  executionModalOpen: false,
  agentManagerOpen: false,
  commandBarExpanded: getInitialCommandBarExpanded(),
  claudeIntegrationEnabled: getInitialClaudeEnabled(),
  claudeApiKey: getInitialClaudeApiKey(),
  confirmModal: { open: false, action: null } as ConfirmModalState,
  skillViewerSkill: null,

  // Backward compat getter
  get selectedNodeId(): string | null {
    const ids = get().selectedNodeIds
    return ids.size === 1 ? Array.from(ids)[0] : null
  },

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('opaal-theme', next)
      document.documentElement.classList.toggle('dark', next === 'dark')
      document.documentElement.classList.toggle('light', next === 'light')
      return { theme: next }
    }),

  toggleCommandBarExpanded: () =>
    set((state) => {
      const next = !state.commandBarExpanded
      localStorage.setItem('opaal-command-bar-expanded', String(next))
      return { commandBarExpanded: next }
    }),

  // View navigation
  setView: (view) => set({ view }),

  // Single-select: clear others, select one, open config popup
  selectNode: (id) =>
    set(() => ({
      selectedNodeIds: new Set([id]),
      selectedEdgeIds: new Set<string>(),
      configPopupAgentId: id,
    })),

  // Toggle one node in/out of selection (shift-click)
  toggleNodeSelection: (id) =>
    set((state) => {
      const newIds = new Set(state.selectedNodeIds)
      if (newIds.has(id)) {
        newIds.delete(id)
      } else {
        newIds.add(id)
      }
      return {
        selectedNodeIds: newIds,
        selectedEdgeIds: new Set<string>(),
        // Close config popup on multi-select
        configPopupAgentId: newIds.size === 1 ? Array.from(newIds)[0] : null,
      }
    }),

  // Select a set of nodes (from marquee)
  selectNodes: (ids) =>
    set(() => {
      const newIds = new Set(ids)
      return {
        selectedNodeIds: newIds,
        selectedEdgeIds: new Set<string>(),
        // Only open popup for single-select
        configPopupAgentId: newIds.size === 1 ? Array.from(newIds)[0] : null,
      }
    }),

  selectEdges: (ids) =>
    set(() => ({
      selectedNodeIds: new Set<string>(),
      selectedEdgeIds: new Set(ids),
      configPopupAgentId: null,
    })),

  setSelection: (nodeIds, edgeIds) =>
    set(() => ({
      selectedNodeIds: new Set(nodeIds),
      selectedEdgeIds: new Set(edgeIds),
    })),

  // Clear all selection
  clearSelection: () =>
    set(() => ({
      selectedNodeIds: new Set<string>(),
      selectedEdgeIds: new Set<string>(),
      configPopupAgentId: null,
    })),

  // Legacy compat
  setSelectedNode: (id) => {
    if (id) {
      get().selectNode(id)
    } else {
      get().clearSelection()
    }
  },

  // Config popup
  openConfigPopup: (agentId) => set({ configPopupAgentId: agentId }),
  closeConfigPopup: () => set({ configPopupAgentId: null }),

  // Connection config popup
  openConnectionConfigPopup: (connectionId) => set({ configPopupConnectionId: connectionId }),
  closeConnectionConfigPopup: () => set({ configPopupConnectionId: null }),

  // Settings popup
  toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),

  // Prompt modal
  openPromptModal: () => set({ promptModalOpen: true }),
  closePromptModal: () => set({ promptModalOpen: false }),

  // Execution modal
  openExecutionModal: () => set({ executionModalOpen: true }),
  closeExecutionModal: () => set({ executionModalOpen: false }),

  // Agent manager popup
  openAgentManager: () => set({ agentManagerOpen: true }),
  closeAgentManager: () => set({ agentManagerOpen: false }),

  togglePalette: () => set((state) => ({ paletteCollapsed: !state.paletteCollapsed })),
  toggleSkillsPanel: () => set((state) => ({ skillsPanelCollapsed: !state.skillsPanelCollapsed })),
  togglePromptPanel: () => set((state) => ({ promptPanelCollapsed: !state.promptPanelCollapsed })),
  expandRightPanels: () => set({ skillsPanelCollapsed: false, promptPanelCollapsed: false }),

  // Canvas mode
  setCanvasMode: (mode) => set({ canvasMode: mode }),
  toggleCanvasMode: () =>
    set((state) => ({ canvasMode: state.canvasMode === 'select' ? 'pan' : 'select' })),

  // Placement mode: Red Alert style agent deployment
  enterPlacementMode: (role) =>
    set(() => ({
      placementMode: true,
      placementRole: role,
      placementTemplateId: null,
      canvasMode: 'place' as CanvasMode,
      selectedNodeIds: new Set<string>(),
      selectedEdgeIds: new Set<string>(),
      configPopupAgentId: null,
    })),

  enterPlacementModeCustom: (templateId) =>
    set(() => ({
      placementMode: true,
      placementRole: null,
      placementTemplateId: templateId,
      canvasMode: 'place' as CanvasMode,
      selectedNodeIds: new Set<string>(),
      selectedEdgeIds: new Set<string>(),
      configPopupAgentId: null,
    })),

  exitPlacementMode: () =>
    set(() => ({
      placementMode: false,
      placementRole: null,
      placementTemplateId: null,
      canvasMode: 'select' as CanvasMode,
    })),

  // Control groups: Ctrl+1-9 saves, Ctrl+Shift+1-9 recalls
  saveControlGroup: (key) =>
    set((state) => {
      const newGroups = new Map(state.controlGroups)
      newGroups.set(key, Array.from(state.selectedNodeIds))
      return { controlGroups: newGroups }
    }),

  recallControlGroup: (key) =>
    set((state) => {
      const ids = state.controlGroups.get(key)
      if (!ids || ids.length === 0) return state
      const newIds = new Set(ids)
      return {
        selectedNodeIds: newIds,
        selectedEdgeIds: new Set<string>(),
        configPopupAgentId: newIds.size === 1 ? Array.from(newIds)[0] : null,
      }
    }),

  // Context menu
  openContextMenu: (x, y, nodeId, edgeId) =>
    set({ contextMenu: { x, y, nodeId, edgeId } }),

  closeContextMenu: () =>
    set({ contextMenu: null }),

  // Confirm modal
  openConfirmModal: (action, onProceed) =>
    set({ confirmModal: { open: true, action, onProceed } }),

  closeConfirmModal: () =>
    set({ confirmModal: { open: false, action: null, onProceed: undefined } }),

  // Skill viewer
  openSkillViewer: (name, path) => set({ skillViewerSkill: { name, path } }),
  closeSkillViewer: () => set({ skillViewerSkill: null }),

  // Claude integration settings
  setClaudeIntegrationEnabled: (enabled) =>
    set(() => {
      localStorage.setItem('opaal-claude-enabled', String(enabled))
      return { claudeIntegrationEnabled: enabled }
    }),

  setClaudeApiKey: (key) =>
    set(() => {
      localStorage.setItem('opaal-claude-api-key', key)
      return { claudeApiKey: key }
    }),
}))
