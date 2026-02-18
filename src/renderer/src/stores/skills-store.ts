import { create } from 'zustand'
import type { SkillReference } from '../types/workflow'

interface DetectedSkill {
  id: string
  name: string
  path: string
  description: string
}

interface SkillsState {
  detectedSkills: DetectedSkill[]
  scanning: boolean
  scanError: string | null
  lastScannedAt: string | null

  scanSkills: () => Promise<void>
  toSkillReference: (skill: DetectedSkill) => SkillReference
}

export const useSkillsStore = create<SkillsState>()((set) => ({
  detectedSkills: [],
  scanning: false,
  scanError: null,
  lastScannedAt: null,

  scanSkills: async () => {
    set({ scanning: true, scanError: null })
    try {
      if (typeof window !== 'undefined' && window.api?.scanSkills) {
        const skills = await window.api.scanSkills()
        set({
          detectedSkills: skills,
          scanning: false,
          lastScannedAt: new Date().toISOString()
        })
      } else {
        // Fallback: provide common skills when running outside Electron
        set({
          detectedSkills: [
            { id: 'detected:brainstorming', name: 'brainstorming', path: '', description: 'Collaborative ideation and design exploration' },
            { id: 'detected:systematic-debugging', name: 'systematic-debugging', path: '', description: 'Four-phase debugging methodology' },
            { id: 'detected:docx', name: 'docx', path: '', description: 'Create and edit Word documents' },
            { id: 'detected:pptx', name: 'pptx', path: '', description: 'Create PowerPoint presentations' },
            { id: 'detected:xlsx', name: 'xlsx', path: '', description: 'Excel and spreadsheet operations' },
            { id: 'detected:imagegen', name: 'imagegen', path: '', description: 'AI image generation' },
            { id: 'detected:writing-skills', name: 'writing-skills', path: '', description: 'Create and edit agent skills' },
            { id: 'detected:algorithmic-art', name: 'algorithmic-art', path: '', description: 'Algorithmic art with p5.js' },
            { id: 'detected:prompt-engineering-patterns', name: 'prompt-engineering-patterns', path: '', description: 'Advanced prompt engineering techniques' },
            { id: 'detected:frontend-design', name: 'frontend-design', path: '', description: 'Production-grade frontend interfaces' },
            { id: 'detected:keybindings-help', name: 'keybindings-help', path: '', description: 'Keyboard shortcut customization' },
            { id: 'detected:find-skills', name: 'find-skills', path: '', description: 'Discover and install agent skills' },
            { id: 'detected:postgresql-table-design', name: 'postgresql-table-design', path: '', description: 'PostgreSQL schema design' },
            { id: 'detected:remotion-best-practices', name: 'remotion-best-practices', path: '', description: 'Remotion video framework patterns' },
          ],
          scanning: false,
          lastScannedAt: new Date().toISOString()
        })
      }
    } catch (err) {
      set({
        scanning: false,
        scanError: err instanceof Error ? err.message : 'Failed to scan skills'
      })
    }
  },

  toSkillReference: (skill: DetectedSkill): SkillReference => ({
    id: skill.id,
    name: skill.name,
    source: 'detected'
  })
}))
