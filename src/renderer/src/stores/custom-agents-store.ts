import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { CustomAgentTemplate, CreateCustomAgentInput } from '../types/custom-agent'
import { ALL_AGENT_ROLES, type AgentRole } from '../types/workflow'

const DISPLAY_ROLES = ALL_AGENT_ROLES.filter((r) => r !== 'custom')

// ── Unified order helpers ──

function isCustomEntry(entry: string): boolean {
  return entry.startsWith('custom:')
}

function getCustomTemplateId(entry: string): string {
  return entry.slice(7)
}

function makeCustomEntry(id: string): string {
  return `custom:${id}`
}

/** A resolved item in the unified agent list */
export interface UnifiedAgentItem {
  type: 'default' | 'custom'
  key: string // AgentRole string for defaults, template ID for customs
  role: AgentRole
  template?: CustomAgentTemplate
  isHidden?: boolean
}

/** Get visible agents in unified order (for CommandBar, AgentPalette, keyboard) */
export function getUnifiedVisibleAgents(
  unifiedOrder: string[],
  templates: CustomAgentTemplate[],
  hiddenDefaultRoles: AgentRole[]
): UnifiedAgentItem[] {
  const templateMap = new Map(templates.map((t) => [t.id, t]))
  const seen = new Set<string>()
  const result: UnifiedAgentItem[] = []

  for (const entry of unifiedOrder) {
    if (seen.has(entry)) continue
    seen.add(entry)

    if (isCustomEntry(entry)) {
      const id = getCustomTemplateId(entry)
      const template = templateMap.get(id)
      if (template) {
        result.push({ type: 'custom', key: id, role: template.role as AgentRole, template })
      }
    } else {
      const role = entry as AgentRole
      if (DISPLAY_ROLES.includes(role) && !hiddenDefaultRoles.includes(role)) {
        result.push({ type: 'default', key: role, role })
      }
    }
  }

  // Append any default roles not in unified order (forward compat)
  for (const role of DISPLAY_ROLES) {
    if (!seen.has(role) && !hiddenDefaultRoles.includes(role)) {
      result.push({ type: 'default', key: role, role })
    }
  }

  // Append any custom templates not in unified order
  for (const template of templates) {
    const entry = makeCustomEntry(template.id)
    if (!seen.has(entry)) {
      result.push({ type: 'custom', key: template.id, role: template.role as AgentRole, template })
    }
  }

  return result
}

/** Get all agents in unified order including hidden defaults (for manager/settings UI) */
export function getUnifiedAllAgents(
  unifiedOrder: string[],
  templates: CustomAgentTemplate[],
  hiddenDefaultRoles: AgentRole[]
): UnifiedAgentItem[] {
  const templateMap = new Map(templates.map((t) => [t.id, t]))
  const seen = new Set<string>()
  const result: UnifiedAgentItem[] = []

  for (const entry of unifiedOrder) {
    if (seen.has(entry)) continue
    seen.add(entry)

    if (isCustomEntry(entry)) {
      const id = getCustomTemplateId(entry)
      const template = templateMap.get(id)
      if (template) {
        result.push({ type: 'custom', key: id, role: template.role as AgentRole, template })
      }
    } else {
      const role = entry as AgentRole
      if (DISPLAY_ROLES.includes(role)) {
        result.push({
          type: 'default',
          key: role,
          role,
          isHidden: hiddenDefaultRoles.includes(role),
        })
      }
    }
  }

  // Append any default roles not in unified order (forward compat)
  for (const role of DISPLAY_ROLES) {
    if (!seen.has(role)) {
      result.push({
        type: 'default',
        key: role,
        role,
        isHidden: hiddenDefaultRoles.includes(role),
      })
    }
  }

  // Append any custom templates not in unified order
  for (const template of templates) {
    const entry = makeCustomEntry(template.id)
    if (!seen.has(entry)) {
      result.push({ type: 'custom', key: template.id, role: template.role as AgentRole, template })
    }
  }

  return result
}

interface CustomAgentsState {
  templates: CustomAgentTemplate[]
  hiddenDefaultRoles: AgentRole[]
  unifiedOrder: string[]
  loaded: boolean

  loadCustomAgents: () => Promise<void>
  saveTemplate: (input: CreateCustomAgentInput) => Promise<CustomAgentTemplate>
  updateTemplate: (id: string, patch: Partial<CreateCustomAgentInput>) => Promise<void>
  removeTemplate: (id: string) => Promise<void>

  setUnifiedOrder: (order: string[]) => Promise<void>

  hideDefaultRole: (role: AgentRole) => Promise<void>
  unhideDefaultRole: (role: AgentRole) => Promise<void>
  resetDefaultRoles: () => Promise<void>
}

export const useCustomAgentsStore = create<CustomAgentsState>()((set, get) => ({
  templates: [],
  hiddenDefaultRoles: [],
  unifiedOrder: [],
  loaded: false,

  loadCustomAgents: async () => {
    if (typeof window !== 'undefined' && window.api?.getCustomAgents) {
      try {
        const [agents, hiddenRoles, legacyRoleOrder, existingUnifiedOrder] = await Promise.all([
          window.api.getCustomAgents(),
          window.api.getHiddenDefaultRoles?.() ?? Promise.resolve([]),
          window.api.getDefaultRoleOrder?.() ?? Promise.resolve([]),
          window.api.getUnifiedOrder?.() ?? Promise.resolve([]),
        ])

        const templates = agents as unknown as CustomAgentTemplate[]
        const hidden = (hiddenRoles ?? []) as AgentRole[]

        // Migration: build unified order from legacy data if not yet set
        let unifiedOrder = (existingUnifiedOrder ?? []) as string[]
        if (unifiedOrder.length === 0) {
          const baseRoles =
            legacyRoleOrder && legacyRoleOrder.length > 0
              ? (legacyRoleOrder as string[])
              : (DISPLAY_ROLES as string[])

          unifiedOrder = [...baseRoles]

          // Append any DISPLAY_ROLES not in legacy order (forward compat)
          for (const role of DISPLAY_ROLES) {
            if (!unifiedOrder.includes(role)) unifiedOrder.push(role)
          }

          // Append custom templates at end
          for (const agent of templates) {
            unifiedOrder.push(makeCustomEntry(agent.id))
          }

          // Persist the migrated order
          await window.api.setUnifiedOrder?.(unifiedOrder)
        }

        set({
          templates,
          hiddenDefaultRoles: hidden,
          unifiedOrder,
          loaded: true,
        })
      } catch (err) {
        console.error('[Opaal] Failed to load custom agents:', err)
        set({ loaded: true })
      }
    } else {
      set({ loaded: true })
    }
  },

  saveTemplate: async (input) => {
    const now = new Date().toISOString()
    const template: CustomAgentTemplate = {
      ...input,
      id: uuid(),
      createdAt: now,
      updatedAt: now,
    }
    try {
      if (window.api?.saveCustomAgent) {
        const payload = JSON.parse(
          JSON.stringify({
            id: template.id,
            name: template.name,
            role: template.role,
            roleDescription: template.roleDescription,
            skills: template.skills,
            outputDefinition: template.outputDefinition,
            instructions: template.instructions,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
          })
        )
        await window.api.saveCustomAgent(payload)
      }

      // Append to unified order
      const newOrder = [...get().unifiedOrder, makeCustomEntry(template.id)]
      try {
        await window.api?.setUnifiedOrder?.(newOrder)
      } catch (err) {
        console.error('[Opaal] Failed to persist unified order after add:', err)
      }

      set((state) => ({
        templates: [template, ...state.templates],
        unifiedOrder: newOrder,
      }))
      return template
    } catch (err) {
      console.error('[Opaal] Failed to save custom agent template:', err)
      throw err
    }
  },

  updateTemplate: async (id, patch) => {
    const existing = get().templates.find((t) => t.id === id)
    if (!existing) return
    const updated: CustomAgentTemplate = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    try {
      if (window.api?.saveCustomAgent) {
        const payload = JSON.parse(
          JSON.stringify({
            id: updated.id,
            name: updated.name,
            role: updated.role,
            roleDescription: updated.roleDescription,
            skills: updated.skills,
            outputDefinition: updated.outputDefinition,
            instructions: updated.instructions,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
          })
        )
        await window.api.saveCustomAgent(payload)
      }
      set((state) => ({
        templates: state.templates.map((t) => (t.id === id ? updated : t)),
      }))
    } catch (err) {
      console.error('[Opaal] Failed to update custom agent template:', err)
      throw err
    }
  },

  removeTemplate: async (id) => {
    try {
      if (window.api?.removeCustomAgent) {
        await window.api.removeCustomAgent(id)
      }

      // Remove from unified order
      const entry = makeCustomEntry(id)
      const newOrder = get().unifiedOrder.filter((e) => e !== entry)
      try {
        await window.api?.setUnifiedOrder?.(newOrder)
      } catch (err) {
        console.error('[Opaal] Failed to persist unified order after remove:', err)
      }

      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
        unifiedOrder: newOrder,
      }))
    } catch (err) {
      console.error('[Opaal] Failed to remove custom agent template:', err)
      throw err
    }
  },

  setUnifiedOrder: async (order) => {
    set({ unifiedOrder: order })
    try {
      await window.api?.setUnifiedOrder?.(order)
    } catch (err) {
      console.error('[Opaal] Failed to persist unified order:', err)
    }
  },

  hideDefaultRole: async (role) => {
    const current = get().hiddenDefaultRoles
    if (current.includes(role)) return
    const updated = [...current, role]
    try {
      await window.api?.setHiddenDefaultRoles?.(updated)
    } catch (err) {
      console.error('[Opaal] Failed to persist hidden role:', err)
    }
    set({ hiddenDefaultRoles: updated })
  },

  unhideDefaultRole: async (role) => {
    const current = get().hiddenDefaultRoles
    const updated = current.filter((r) => r !== role)
    try {
      await window.api?.setHiddenDefaultRoles?.(updated)
    } catch (err) {
      console.error('[Opaal] Failed to persist unhidden role:', err)
    }
    set({ hiddenDefaultRoles: updated })
  },

  resetDefaultRoles: async () => {
    const templates = get().templates
    const defaultOrder: string[] = [
      ...DISPLAY_ROLES,
      ...templates.map((t) => makeCustomEntry(t.id)),
    ]
    try {
      await Promise.all([
        window.api?.clearHiddenDefaultRoles?.(),
        window.api?.setUnifiedOrder?.(defaultOrder),
      ])
    } catch (err) {
      console.error('[Opaal] Failed to reset defaults:', err)
    }
    set({ hiddenDefaultRoles: [], unifiedOrder: defaultOrder })
  },
}))
