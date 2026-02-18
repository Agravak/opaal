import { create } from 'zustand'

interface PersistenceState {
  recentFiles: RecentFileData[]
  draft: DraftData | null
  draftChecked: boolean

  loadRecentFiles: () => Promise<void>
  addRecentFile: (file: RecentFileData) => Promise<void>
  removeRecentFile: (filePath: string) => Promise<void>
  clearRecentFiles: () => Promise<void>
  checkForDraft: () => Promise<void>
  clearDraft: () => Promise<void>
}

export const usePersistenceStore = create<PersistenceState>()((set) => ({
  recentFiles: [],
  draft: null,
  draftChecked: false,

  loadRecentFiles: async () => {
    if (!window.api?.getRecentFiles) return
    const files = await window.api.getRecentFiles()
    set({ recentFiles: files })
  },

  addRecentFile: async (file) => {
    if (!window.api?.addRecentFile) return
    await window.api.addRecentFile(file)
    // Refresh the list
    if (window.api.getRecentFiles) {
      const files = await window.api.getRecentFiles()
      set({ recentFiles: files })
    }
  },

  removeRecentFile: async (filePath) => {
    if (!window.api?.removeRecentFile) return
    await window.api.removeRecentFile(filePath)
    set((state) => ({
      recentFiles: state.recentFiles.filter((f) => f.filePath !== filePath),
    }))
  },

  clearRecentFiles: async () => {
    if (!window.api?.clearRecentFiles) return
    await window.api.clearRecentFiles()
    set({ recentFiles: [] })
  },

  checkForDraft: async () => {
    if (!window.api?.getDraft) {
      set({ draftChecked: true })
      return
    }
    const draft = await window.api.getDraft()
    set({ draft, draftChecked: true })
  },

  clearDraft: async () => {
    if (window.api?.clearDraft) await window.api.clearDraft()
    set({ draft: null })
  },
}))
