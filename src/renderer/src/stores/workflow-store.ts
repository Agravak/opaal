import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { Workflow, AgentNode, Column, Connection, AgentRole, SkillReference, WorkflowSettings } from '../types/workflow'
import type { CustomAgentTemplate } from '../types/custom-agent'
import { recalculateAutoConnections } from '../lib/auto-connect'

const COLUMN_WIDTH = 340
const COLUMN_GAP = 80
const CARD_HEIGHT = 256
const CARD_GAP = 24
const MAX_HISTORY = 50

function connectionPairKey(sourceId: string, targetId: string): string {
  return `${sourceId}:${targetId}`
}

interface ClipboardData {
  agents: AgentNode[]
  connections: Connection[]
}

interface WorkflowState {
  workflow: Workflow
  filePath: string | null
  dirty: boolean
  clipboard: ClipboardData | null

  // History
  past: Workflow[]
  future: Workflow[]
  undo: () => void
  redo: () => void

  // Column operations
  addColumn: (name?: string) => string
  removeColumn: (id: string) => void
  renameColumn: (id: string, name: string) => void

  // Agent operations
  addAgent: (columnId: string, role?: AgentRole) => string
  removeAgent: (id: string) => void
  updateAgent: (id: string, patch: Partial<AgentNode>) => void
  moveAgentToColumn: (agentId: string, columnId: string) => void

  // Agent from template
  addAgentFromTemplate: (columnId: string, template: CustomAgentTemplate) => string

  // Agent at specific position (placement mode)
  addAgentAtPosition: (columnId: string, role: AgentRole, position: { x: number; y: number }) => string
  addAgentFromTemplateAtPosition: (columnId: string, template: CustomAgentTemplate, position: { x: number; y: number }) => string

  // Skill operations
  addSkillToAgent: (agentId: string, skill: SkillReference) => void
  removeSkillFromAgent: (agentId: string, skillId: string) => void

  // Connection operations
  addConnection: (sourceId: string, targetId: string, type?: 'auto' | 'manual') => void
  removeConnection: (id: string) => void
  updateConnection: (id: string, patch: Partial<Connection>) => void

  // Clipboard operations
  copyAgents: (agentIds: string[]) => void
  pasteAgents: (offset?: { x: number; y: number }) => string[]
  duplicateAgents: (agentIds: string[]) => string[]

  // Settings
  updateSettings: (patch: Partial<WorkflowSettings>) => void

  // Workflow metadata
  setWorkflowName: (name: string) => void
  setWorkflowDescription: (desc: string) => void

  // File operations
  loadWorkflow: (workflow: Workflow, filePath?: string) => void
  resetWorkflow: () => void
  setFilePath: (path: string | null) => void
  markClean: () => void
}

function createEmptyWorkflow(): Workflow {
  return {
    id: uuid(),
    name: 'Untitled Workflow',
    description: '',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    columns: [],
    agents: [],
    connections: [],
    settings: {
      preamble: '',
      executionMode: 'parallel-columns',
      includePermissions: true,
      includeDeliverables: true,
      autoConnectionExclusions: [],
      nativeMode: false,
    },
    metadata: {
      viewport: { x: 0, y: 0, zoom: 1 }
    }
  }
}

function calcAgentPosition(columns: Column[], columnId: string, agents: AgentNode[]): { x: number; y: number } {
  const col = columns.find(c => c.id === columnId)
  if (!col) return { x: 0, y: 0 }

  const colAgents = agents.filter(a => a.columnId === columnId)
  const x = col.order * (COLUMN_WIDTH + COLUMN_GAP) + 40
  const y = colAgents.length * (CARD_HEIGHT + CARD_GAP) + 80
  return { x, y }
}

/** Given an X position on the canvas, find the nearest column by center distance */
function findNearestColumn(columns: Column[], x: number): Column | null {
  if (columns.length === 0) return null
  let nearest: Column | null = null
  let minDist = Infinity
  for (const col of columns) {
    const colCenterX = col.order * (COLUMN_WIDTH + COLUMN_GAP) + 40 + COLUMN_WIDTH / 2
    const dist = Math.abs(x - colCenterX)
    if (dist < minDist) { minDist = dist; nearest = col }
  }
  return nearest
}

/** Get the canonical left-edge X coordinate for a column */
function getColumnX(col: Column): number {
  return col.order * (COLUMN_WIDTH + COLUMN_GAP) + 40
}

/** Push current state onto history and recalculate auto-connections */
function withHistory(state: WorkflowState, newWorkflow: Workflow): Partial<WorkflowState> {
  const withAutoConns = {
    ...newWorkflow,
    connections: recalculateAutoConnections(newWorkflow)
  }
  return {
    workflow: withAutoConns,
    dirty: true,
    past: [...state.past.slice(-(MAX_HISTORY - 1)), state.workflow],
    future: []
  }
}

export const useWorkflowStore = create<WorkflowState>()((set, get) => ({
  workflow: createEmptyWorkflow(),
  filePath: null,
  dirty: false,
  clipboard: null,
  past: [],
  future: [],

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state
      const prev = state.past[state.past.length - 1]
      return {
        workflow: prev,
        past: state.past.slice(0, -1),
        future: [state.workflow, ...state.future.slice(0, MAX_HISTORY - 1)],
        dirty: true
      }
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state
      const next = state.future[0]
      return {
        workflow: next,
        past: [...state.past, state.workflow],
        future: state.future.slice(1),
        dirty: true
      }
    }),

  addColumn: (name?: string) => {
    const id = uuid()
    set((state) => {
      const order = state.workflow.columns.length
      const newCol: Column = {
        id,
        name: name || `Wave ${order + 1}`,
        order
      }
      const newWorkflow = {
        ...state.workflow,
        columns: [...state.workflow.columns, newCol],
        updatedAt: new Date().toISOString()
      }
      return withHistory(state, newWorkflow)
    })
    return id
  },

  removeColumn: (id) =>
    set((state) => {
      const newWorkflow = {
        ...state.workflow,
        columns: state.workflow.columns
          .filter(c => c.id !== id)
          .map((c, i) => ({ ...c, order: i })),
        agents: state.workflow.agents.filter(a => a.columnId !== id),
        updatedAt: new Date().toISOString()
      }
      return withHistory(state, newWorkflow)
    }),

  renameColumn: (id, name) =>
    set((state) => {
      const newWorkflow = {
        ...state.workflow,
        columns: state.workflow.columns.map(c =>
          c.id === id ? { ...c, name } : c
        ),
        updatedAt: new Date().toISOString()
      }
      return withHistory(state, newWorkflow)
    }),

  addAgent: (columnId, role = 'custom') => {
    const id = uuid()
    set((state) => {
      const position = calcAgentPosition(state.workflow.columns, columnId, state.workflow.agents)
      const meta = {
        architect: { name: 'Architect Agent', desc: 'Designs system architecture and plans' },
        developer: { name: 'Developer Agent', desc: 'Implements code and features' },
        reviewer: { name: 'Reviewer Agent', desc: 'Reviews and validates outputs' },
        tester: { name: 'Tester Agent', desc: 'Tests and validates quality' },
        documenter: { name: 'Documenter Agent', desc: 'Creates documentation and guides' },
        researcher: { name: 'Researcher Agent', desc: 'Investigates and gathers information' },
        powerpoint_presentation_builder: { name: 'PowerPoint Presentation Builder', desc: '' },
        blog_post_writer: { name: 'Blog Post Writer', desc: '' },
        excel_expert: { name: 'Excel Expert', desc: '' },
        newsletter_writer: { name: 'Newsletter Writer', desc: '' },
        seo_content_optimizer: { name: 'SEO Content Optimizer', desc: '' },
        meeting_notes_summarizer: { name: 'Meeting Notes Summarizer', desc: '' },
        research_brief_writer: { name: 'Research Brief Writer', desc: '' },
        social_media_caption_writer: { name: 'Social Media Caption Writer', desc: '' },
        custom: { name: 'Custom Agent', desc: 'Define this agent\'s role' }
      }

      const newAgent: AgentNode = {
        id,
        columnId,
        name: meta[role].name,
        role,
        roleDescription: meta[role].desc,
        skills: [],
        outputDefinition: '',
        instructions: '',
        position
      }
      const newWorkflow = {
        ...state.workflow,
        agents: [...state.workflow.agents, newAgent],
        updatedAt: new Date().toISOString()
      }
      return withHistory(state, newWorkflow)
    })
    return id
  },

  addAgentFromTemplate: (columnId, template) => {
    const id = uuid()
    set((state) => {
      const position = calcAgentPosition(state.workflow.columns, columnId, state.workflow.agents)
      const newAgent: AgentNode = {
        id,
        columnId,
        name: template.name,
        role: template.role,
        roleDescription: template.roleDescription,
        skills: [...template.skills],
        outputDefinition: template.outputDefinition,
        instructions: template.instructions,
        position,
      }
      const newWorkflow = {
        ...state.workflow,
        agents: [...state.workflow.agents, newAgent],
        updatedAt: new Date().toISOString(),
      }
      return withHistory(state, newWorkflow)
    })
    return id
  },

  addAgentAtPosition: (columnId, role = 'custom', position) => {
    const id = uuid()
    set((state) => {
      const meta: Record<string, { name: string; desc: string }> = {
        architect: { name: 'Architect Agent', desc: 'Designs system architecture and plans' },
        developer: { name: 'Developer Agent', desc: 'Implements code and features' },
        reviewer: { name: 'Reviewer Agent', desc: 'Reviews and validates outputs' },
        tester: { name: 'Tester Agent', desc: 'Tests and validates quality' },
        documenter: { name: 'Documenter Agent', desc: 'Creates documentation and guides' },
        researcher: { name: 'Researcher Agent', desc: 'Investigates and gathers information' },
        powerpoint_presentation_builder: { name: 'PowerPoint Presentation Builder', desc: '' },
        blog_post_writer: { name: 'Blog Post Writer', desc: '' },
        excel_expert: { name: 'Excel Expert', desc: '' },
        newsletter_writer: { name: 'Newsletter Writer', desc: '' },
        seo_content_optimizer: { name: 'SEO Content Optimizer', desc: '' },
        meeting_notes_summarizer: { name: 'Meeting Notes Summarizer', desc: '' },
        research_brief_writer: { name: 'Research Brief Writer', desc: '' },
        social_media_caption_writer: { name: 'Social Media Caption Writer', desc: '' },
        custom: { name: 'Custom Agent', desc: 'Define this agent\'s role' }
      }
      const roleMeta = meta[role] || meta.custom
      const newAgent: AgentNode = {
        id, columnId,
        name: roleMeta.name, role,
        roleDescription: roleMeta.desc,
        skills: [], outputDefinition: '', instructions: '',
        position,
      }
      const newWorkflow = {
        ...state.workflow,
        agents: [...state.workflow.agents, newAgent],
        updatedAt: new Date().toISOString()
      }
      return withHistory(state, newWorkflow)
    })
    return id
  },

  addAgentFromTemplateAtPosition: (columnId, template, position) => {
    const id = uuid()
    set((state) => {
      const newAgent: AgentNode = {
        id, columnId,
        name: template.name,
        role: template.role,
        roleDescription: template.roleDescription,
        skills: [...template.skills],
        outputDefinition: template.outputDefinition,
        instructions: template.instructions,
        position,
      }
      const newWorkflow = {
        ...state.workflow,
        agents: [...state.workflow.agents, newAgent],
        updatedAt: new Date().toISOString(),
      }
      return withHistory(state, newWorkflow)
    })
    return id
  },

  removeAgent: (id) =>
    set((state) => {
      const newWorkflow = {
        ...state.workflow,
        agents: state.workflow.agents.filter(a => a.id !== id),
        connections: state.workflow.connections.filter(
          c => c.sourceAgentId !== id && c.targetAgentId !== id
        ),
        updatedAt: new Date().toISOString()
      }
      return withHistory(state, newWorkflow)
    }),

  updateAgent: (id, patch) =>
    set((state) => {
      const newWorkflow = {
        ...state.workflow,
        agents: state.workflow.agents.map(a =>
          a.id === id ? { ...a, ...patch } : a
        ),
        updatedAt: new Date().toISOString()
      }
      // Don't push to undo for position changes (too noisy from dragging)
      if (patch.position && Object.keys(patch).length === 1) {
        return {
          workflow: {
            ...newWorkflow,
            connections: recalculateAutoConnections(newWorkflow)
          },
          dirty: true
        }
      }
      return withHistory(state, newWorkflow)
    }),

  moveAgentToColumn: (agentId, columnId) =>
    set((state) => {
      const position = calcAgentPosition(state.workflow.columns, columnId, state.workflow.agents.filter(a => a.id !== agentId))
      const newWorkflow = {
        ...state.workflow,
        agents: state.workflow.agents.map(a =>
          a.id === agentId ? { ...a, columnId, position } : a
        ),
        updatedAt: new Date().toISOString()
      }
      return withHistory(state, newWorkflow)
    }),

  addSkillToAgent: (agentId, skill) =>
    set((state) => {
      const newWorkflow = {
        ...state.workflow,
        agents: state.workflow.agents.map(a =>
          a.id === agentId
            ? { ...a, skills: [...a.skills.filter(s => s.id !== skill.id), skill] }
            : a
        ),
        updatedAt: new Date().toISOString()
      }
      return withHistory(state, newWorkflow)
    }),

  removeSkillFromAgent: (agentId, skillId) =>
    set((state) => {
      const newWorkflow = {
        ...state.workflow,
        agents: state.workflow.agents.map(a =>
          a.id === agentId
            ? { ...a, skills: a.skills.filter(s => s.id !== skillId) }
            : a
        ),
        updatedAt: new Date().toISOString()
      }
      return withHistory(state, newWorkflow)
    }),

  addConnection: (sourceId, targetId, type = 'manual') => {
    set((state) => {
      const exists = state.workflow.connections.some(
        c => c.sourceAgentId === sourceId && c.targetAgentId === targetId
      )
      if (exists) return state

      const pairKey = connectionPairKey(sourceId, targetId)
      const conn: Connection = {
        id: uuid(),
        sourceAgentId: sourceId,
        targetAgentId: targetId,
        type
      }
      const newWorkflow = {
        ...state.workflow,
        connections: [...state.workflow.connections, conn],
        settings: {
          ...state.workflow.settings,
          autoConnectionExclusions: (state.workflow.settings.autoConnectionExclusions ?? [])
            .filter((key) => key !== pairKey)
        },
        updatedAt: new Date().toISOString()
      }
      return withHistory(state, newWorkflow)
    })
  },

  removeConnection: (id) =>
    set((state) => {
      const conn = state.workflow.connections.find(c => c.id === id)
      if (!conn) return state

      const pairKey = connectionPairKey(conn.sourceAgentId, conn.targetAgentId)
      const exclusions = new Set(state.workflow.settings.autoConnectionExclusions ?? [])
      exclusions.add(pairKey)

      const newWorkflow = {
        ...state.workflow,
        connections: state.workflow.connections.filter(c => c.id !== id),
        settings: {
          ...state.workflow.settings,
          autoConnectionExclusions: Array.from(exclusions)
        },
        updatedAt: new Date().toISOString()
      }
      return withHistory(state, newWorkflow)
    }),

  updateConnection: (id, patch) =>
    set((state) => {
      const newWorkflow = {
        ...state.workflow,
        connections: state.workflow.connections.map(c =>
          c.id === id ? { ...c, ...patch } : c
        ),
        updatedAt: new Date().toISOString()
      }
      return withHistory(state, newWorkflow)
    }),

  // Copy selected agents and their inter-connections to clipboard
  copyAgents: (agentIds) =>
    set((state) => {
      const idSet = new Set(agentIds)
      const agents = state.workflow.agents
        .filter(a => idSet.has(a.id))
        .map(a => ({ ...a })) // shallow clone

      const connections = state.workflow.connections
        .filter(c => idSet.has(c.sourceAgentId) && idSet.has(c.targetAgentId))
        .map(c => ({ ...c }))

      return { clipboard: { agents, connections } }
    }),

  // Paste agents from clipboard with new IDs, snapping to nearest column
  pasteAgents: (offset = { x: 40, y: 40 }) => {
    const state = get()
    if (!state.clipboard || state.clipboard.agents.length === 0) return []

    const idMapping = new Map<string, string>()

    // First pass: create agents with new IDs and raw offset positions
    const rawAgents: AgentNode[] = state.clipboard.agents.map(a => {
      const newId = uuid()
      idMapping.set(a.id, newId)
      return {
        ...a,
        id: newId,
        name: `${a.name} (copy)`,
        position: {
          x: a.position.x + offset.x,
          y: a.position.y + offset.y
        }
      }
    })

    // Second pass: snap each pasted agent to its nearest column
    const placementCounts = new Map<string, number>()
    for (const existing of state.workflow.agents) {
      placementCounts.set(existing.columnId, (placementCounts.get(existing.columnId) || 0) + 1)
    }

    const snappedAgents: AgentNode[] = rawAgents.map(a => {
      const nearestCol = findNearestColumn(state.workflow.columns, a.position.x + COLUMN_WIDTH / 2)
      if (!nearestCol) return a

      const targetColId = nearestCol.id
      const count = placementCounts.get(targetColId) || 0
      placementCounts.set(targetColId, count + 1)

      return {
        ...a,
        columnId: targetColId,
        position: {
          x: getColumnX(nearestCol),
          y: count * (CARD_HEIGHT + CARD_GAP) + 80
        }
      }
    })

    const newConnections: Connection[] = state.clipboard.connections.map(c => ({
      ...c,
      id: uuid(),
      sourceAgentId: idMapping.get(c.sourceAgentId) || c.sourceAgentId,
      targetAgentId: idMapping.get(c.targetAgentId) || c.targetAgentId,
    }))

    const newIds = snappedAgents.map(a => a.id)

    set((st) => {
      const newWorkflow = {
        ...st.workflow,
        agents: [...st.workflow.agents, ...snappedAgents],
        connections: [...st.workflow.connections, ...newConnections],
        updatedAt: new Date().toISOString()
      }
      return withHistory(st, newWorkflow)
    })

    return newIds
  },

  // Copy then immediately paste with small offset
  duplicateAgents: (agentIds) => {
    const store = get()
    store.copyAgents(agentIds)
    return store.pasteAgents({ x: 30, y: 30 })
  },

  updateSettings: (patch) =>
    set((state) => {
      const newWorkflow = {
        ...state.workflow,
        settings: { ...state.workflow.settings, ...patch },
        updatedAt: new Date().toISOString()
      }
      return withHistory(state, newWorkflow)
    }),

  setWorkflowName: (name) =>
    set((state) => {
      const newWorkflow = { ...state.workflow, name, updatedAt: new Date().toISOString() }
      return withHistory(state, newWorkflow)
    }),

  setWorkflowDescription: (desc) =>
    set((state) => {
      const newWorkflow = { ...state.workflow, description: desc, updatedAt: new Date().toISOString() }
      return withHistory(state, newWorkflow)
    }),

  loadWorkflow: (workflow, filePath) =>
    set({
      workflow,
      filePath: filePath || null,
      dirty: false,
      past: [],
      future: []
    }),

  resetWorkflow: () =>
    set({
      workflow: createEmptyWorkflow(),
      filePath: null,
      dirty: false,
      past: [],
      future: []
    }),

  setFilePath: (path) => set({ filePath: path }),

  markClean: () => set({ dirty: false })
}))
