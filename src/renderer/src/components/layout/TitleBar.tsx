import { useState, useRef, useCallback } from 'react'
import { ThemeToggle } from '../shared/ThemeToggle'
import { ShareDropdown } from '../shared/ShareDropdown'
import { useWorkflowStore } from '../../stores/workflow-store'
import { useUIStore } from '../../stores/ui-store'

export function TitleBar() {
  const workflowName = useWorkflowStore((s) => s.workflow.name)
  const setWorkflowName = useWorkflowStore((s) => s.setWorkflowName)
  const dirty = useWorkflowStore((s) => s.dirty)
  const filePath = useWorkflowStore((s) => s.filePath)
  const view = useUIStore((s) => s.view)
  const setView = useUIStore((s) => s.setView)
  const toggleSettings = useUIStore((s) => s.toggleSettings)
  const openConfirmModal = useUIStore((s) => s.openConfirmModal)

  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const fileName = filePath
    ? filePath.replace(/^.*[\\/]/, '').replace(/\.opaal$/, '')
    : null

  const handleGoHome = useCallback(() => {
    if (view === 'home') return
    const isDirty = useWorkflowStore.getState().dirty
    if (isDirty) {
      openConfirmModal('new', () => {
        useWorkflowStore.getState().resetWorkflow()
        if (window.api?.clearDraft) window.api.clearDraft()
        setView('home')
      })
    } else {
      useWorkflowStore.getState().resetWorkflow()
      setView('home')
    }
  }, [view, setView, openConfirmModal])

  const handleSave = useCallback(() => {
    window.dispatchEvent(new CustomEvent('opaal:save'))
  }, [])

  const handleStartEdit = useCallback(() => {
    if (view !== 'canvas') return
    setEditValue(workflowName)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [workflowName, view])

  const handleFinishEdit = useCallback(() => {
    setEditing(false)
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== workflowName) {
      setWorkflowName(trimmed)
    }
  }, [editValue, workflowName, setWorkflowName])

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFinishEdit()
    if (e.key === 'Escape') setEditing(false)
  }, [handleFinishEdit])

  return (
    <header className="titlebar-drag flex items-center h-10 px-4 bg-surface-secondary/80 backdrop-blur-sm border-b border-border-subtle select-none">
      {/* Logo + App Name + Home + Save */}
      <div className="titlebar-no-drag flex items-center gap-2.5">
        <div className="flex items-center justify-center w-6 h-6">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" className="fill-accent" opacity="0.9" />
            <path d="M2 17L12 22L22 17" className="stroke-accent" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
            <path d="M2 12L12 17L22 12" className="stroke-accent" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
          </svg>
        </div>
        <span className="text-[13px] font-semibold tracking-tight text-content-primary">
          Opaal
        </span>

        {/* Home button */}
        <button
          onClick={handleGoHome}
          className={`w-7 h-7 rounded-[7px] flex items-center justify-center transition-all duration-150
            ${view === 'home'
              ? 'text-accent bg-accent/10'
              : 'text-content-tertiary hover:text-content-primary hover:bg-surface-tertiary/80'
            }`}
          title="Home (Ctrl+N)"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 8.5l6-5.5 6 5.5" />
            <path d="M3.5 7.5V13a1 1 0 001 1h7a1 1 0 001-1V7.5" />
          </svg>
        </button>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-7 h-7 rounded-[7px] flex items-center justify-center transition-all duration-150
            text-content-tertiary hover:text-content-primary hover:bg-surface-tertiary/80"
          title="Save (Ctrl+S)"
          aria-label="Save workflow"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 2.5h8l2 2V13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10a.5.5 0 0 1 .5-.5z" />
            <path d="M5 2.5v3h5v-3" />
            <path d="M5.5 10h5" />
          </svg>
        </button>
      </div>

      {/* Center: workflow name + file indicator */}
      <div className="flex-1 flex justify-center items-center gap-2">
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleFinishEdit}
            onKeyDown={handleEditKeyDown}
            className="titlebar-no-drag w-[200px] text-center text-[12px] font-medium text-content-primary bg-surface-tertiary/80 border border-border-default rounded-md px-2 py-0.5 outline-none focus:border-accent/40"
            autoFocus
          />
        ) : (
          <button
            onClick={handleStartEdit}
            className="titlebar-no-drag text-[12px] font-medium text-content-tertiary tracking-wide hover:text-content-secondary transition-colors cursor-text"
            title="Click to rename workflow"
          >
            {workflowName}
          </button>
        )}
        {dirty && !editing && (
          <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />
        )}
        {fileName && !editing && (
          <span className="text-[10px] text-content-tertiary opacity-60">
            ({fileName})
          </span>
        )}
      </div>

      {/* Right: share + settings + theme toggle (before native window controls) */}
      <div className="titlebar-no-drag flex items-center gap-1.5 mr-[140px]">
        {/* Share dropdown */}
        <div className="relative">
          <button
            onClick={() => setShareOpen(!shareOpen)}
            className={`w-7 h-7 rounded-[7px] flex items-center justify-center transition-all duration-150
              ${shareOpen
                ? 'text-accent bg-accent/10'
                : 'text-content-tertiary hover:text-content-primary hover:bg-surface-tertiary/80'
              }`}
            title="Share & Export"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 10V2" />
              <polyline points="4 6 8 2 12 6" />
              <path d="M13 10v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3" />
            </svg>
          </button>
          <ShareDropdown open={shareOpen} onClose={() => setShareOpen(false)} />
        </div>

        {/* Settings */}
        <button
          onClick={toggleSettings}
          className="w-7 h-7 rounded-[7px] flex items-center justify-center
            text-content-tertiary hover:text-content-primary hover:bg-surface-tertiary/80
            transition-all duration-150"
          title="Workflow Settings"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        <ThemeToggle />
      </div>
    </header>
  )
}
