import { create } from 'zustand'
import { useSkillsStore } from './skills-store'

export interface ValidationResult {
  valid: boolean
  errors: { rule: string; message: string }[]
  warnings: { rule: string; message: string }[]
}

interface WorkshopState {
  activeSkillPath: string | null
  activeSkillName: string
  activeSkillDescription: string
  activeSkillContent: string
  originalContent: string | null
  validation: ValidationResult
  searchQuery: string
  saving: boolean
  deleting: boolean
  showTemplates: boolean

  openSkill: (path: string) => Promise<void>
  createNew: () => void
  createFromTemplate: (name: string, content: string) => void
  updateName: (name: string) => void
  updateDescription: (desc: string) => void
  updateContent: (content: string) => void
  save: () => Promise<boolean>
  deleteSkill: () => Promise<boolean>
  duplicateSkill: () => Promise<boolean>
  validate: () => ValidationResult
  setSearchQuery: (query: string) => void
  setShowTemplates: (show: boolean) => void
  isDirty: () => boolean
  reset: () => void
}

const EMPTY_VALIDATION: ValidationResult = { valid: true, errors: [], warnings: [] }

function extractFrontmatter(content: string): { name: string; description: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return { name: '', description: '' }
  const fm = match[1]
  const nameMatch = fm.match(/^name:\s*(.+)$/m)
  const descMatch = fm.match(/^description:\s*(.+)$/m)
  return {
    name: nameMatch?.[1]?.trim() || '',
    description: descMatch?.[1]?.trim() || '',
  }
}

function buildContent(name: string, description: string, bodyContent: string): string {
  return `---\nname: ${name}\ndescription: ${description}\n---\n${bodyContent}`
}

function getBodyContent(fullContent: string): string {
  const match = fullContent.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/)
  return match ? match[1] : fullContent
}

export const useWorkshopStore = create<WorkshopState>((set, get) => ({
  activeSkillPath: null,
  activeSkillName: '',
  activeSkillDescription: '',
  activeSkillContent: '',
  originalContent: null,
  validation: EMPTY_VALIDATION,
  searchQuery: '',
  saving: false,
  deleting: false,
  showTemplates: false,

  openSkill: async (path: string) => {
    try {
      const content = await window.api.readSkillContent(path)
      if (content === null) {
        set({
          activeSkillPath: path,
          activeSkillName: path.split(/[\\/]/).pop() || '',
          activeSkillDescription: '',
          activeSkillContent: '',
          originalContent: null,
          showTemplates: false,
        })
        return
      }
      const { name, description } = extractFrontmatter(content)
      set({
        activeSkillPath: path,
        activeSkillName: name,
        activeSkillDescription: description,
        activeSkillContent: content,
        originalContent: content,
        showTemplates: false,
      })
      get().validate()
    } catch (err) {
      console.error('Failed to open skill:', err)
    }
  },

  createNew: () => {
    set({
      activeSkillPath: null,
      activeSkillName: '',
      activeSkillDescription: '',
      activeSkillContent: '',
      originalContent: null,
      validation: EMPTY_VALIDATION,
      showTemplates: true,
    })
  },

  createFromTemplate: (name: string, content: string) => {
    const { name: fmName, description } = extractFrontmatter(content)
    set({
      activeSkillPath: null,
      activeSkillName: fmName || name,
      activeSkillDescription: description,
      activeSkillContent: content,
      originalContent: null,
      showTemplates: false,
    })
    get().validate()
  },

  updateName: (name: string) => {
    const state = get()
    const body = getBodyContent(state.activeSkillContent)
    const newContent = buildContent(name, state.activeSkillDescription, body)
    set({ activeSkillName: name, activeSkillContent: newContent })
    get().validate()
  },

  updateDescription: (desc: string) => {
    const state = get()
    const body = getBodyContent(state.activeSkillContent)
    const newContent = buildContent(state.activeSkillName, desc, body)
    set({ activeSkillDescription: desc, activeSkillContent: newContent })
    get().validate()
  },

  updateContent: (content: string) => {
    const { name, description } = extractFrontmatter(content)
    set({ activeSkillContent: content, activeSkillName: name, activeSkillDescription: description })
    get().validate()
  },

  save: async () => {
    const state = get()
    if (!state.activeSkillName) return false
    set({ saving: true })
    try {
      let skillPath = state.activeSkillPath
      if (!skillPath) {
        const result = await window.api.createSkillDirectory(state.activeSkillName)
        if (!result.success || !result.path) {
          set({ saving: false })
          return false
        }
        skillPath = result.path
      }
      const writeResult = await window.api.writeSkillContent(skillPath, state.activeSkillContent)
      if (!writeResult.success) {
        set({ saving: false })
        return false
      }
      set({ activeSkillPath: skillPath, originalContent: state.activeSkillContent, saving: false })
      useSkillsStore.getState().scanSkills()
      return true
    } catch (err) {
      console.error('Failed to save skill:', err)
      set({ saving: false })
      return false
    }
  },

  deleteSkill: async () => {
    const state = get()
    if (!state.activeSkillPath) return false
    set({ deleting: true })
    try {
      const result = await window.api.deleteSkill(state.activeSkillPath)
      if (!result.success) {
        set({ deleting: false })
        return false
      }
      set({
        activeSkillPath: null, activeSkillName: '', activeSkillDescription: '',
        activeSkillContent: '', originalContent: null, validation: EMPTY_VALIDATION, deleting: false,
      })
      useSkillsStore.getState().scanSkills()
      return true
    } catch (err) {
      console.error('Failed to delete skill:', err)
      set({ deleting: false })
      return false
    }
  },

  duplicateSkill: async () => {
    const state = get()
    if (!state.activeSkillName || !state.activeSkillContent) return false
    const newName = `${state.activeSkillName}-copy`
    const body = getBodyContent(state.activeSkillContent)
    const newContent = buildContent(newName, state.activeSkillDescription, body)
    set({ activeSkillPath: null, activeSkillName: newName, activeSkillContent: newContent, originalContent: null })
    get().validate()
    return true
  },

  validate: () => {
    const state = get()
    const errors: ValidationResult['errors'] = []
    const warnings: ValidationResult['warnings'] = []
    if (!state.activeSkillName) {
      errors.push({ rule: 'name', message: 'Skill name is required' })
    } else if (!/^[a-z0-9-]+$/.test(state.activeSkillName)) {
      errors.push({ rule: 'name-format', message: 'Name: lowercase letters, numbers, hyphens only' })
    }
    if (!state.activeSkillDescription) {
      warnings.push({ rule: 'description', message: 'Description is empty' })
    } else {
      if (!state.activeSkillDescription.toLowerCase().startsWith('use when')) {
        warnings.push({ rule: 'description-format', message: 'Should start with "Use when..."' })
      }
      if (state.activeSkillDescription.length > 500) {
        warnings.push({ rule: 'description-length', message: `${state.activeSkillDescription.length}/500 chars` })
      }
    }
    if (state.activeSkillContent && !state.activeSkillContent.includes('## Overview')) {
      warnings.push({ rule: 'overview', message: 'Consider adding "## Overview" section' })
    }
    const validation = { valid: errors.length === 0, errors, warnings }
    set({ validation })
    return validation
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setShowTemplates: (show: boolean) => set({ showTemplates: show }),
  isDirty: () => {
    const state = get()
    if (state.originalContent === null && state.activeSkillContent) return true
    return state.activeSkillContent !== state.originalContent
  },
  reset: () => {
    set({
      activeSkillPath: null, activeSkillName: '', activeSkillDescription: '',
      activeSkillContent: '', originalContent: null, validation: EMPTY_VALIDATION,
      searchQuery: '', saving: false, deleting: false, showTemplates: false,
    })
  },
}))
