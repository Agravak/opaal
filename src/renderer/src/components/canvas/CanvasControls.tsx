import { motion, AnimatePresence } from 'framer-motion'
import { useWorkflowStore } from '../../stores/workflow-store'
import { useUIStore } from '../../stores/ui-store'
import { ROLE_ACCENT, type AgentRole } from '../../types/workflow'
import { useState, useRef, useEffect } from 'react'
import { DestructiveConfirmModal } from '../shared/DestructiveConfirmModal'

export function CanvasControls() {
  const { addColumn, addAgent, workflow } = useWorkflowStore()
  const canvasMode = useUIStore((s) => s.canvasMode)
  const setCanvasMode = useUIStore((s) => s.setCanvasMode)
  const skillsPanelCollapsed = useUIStore((s) => s.skillsPanelCollapsed)
  const promptPanelCollapsed = useUIStore((s) => s.promptPanelCollapsed)
  const expandRightPanels = useUIStore((s) => s.expandRightPanels)
  const clearSelection = useUIStore((s) => s.clearSelection)
  const [showAgentMenu, setShowAgentMenu] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAgentMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleAddAgent = (role: AgentRole) => {
    let columnId: string
    if (workflow.columns.length === 0) {
      columnId = addColumn()
    } else {
      columnId = workflow.columns[workflow.columns.length - 1].id
    }
    addAgent(columnId, role)
    setShowAgentMenu(false)
  }

  const isEmptyWorkflow =
    workflow.columns.length === 0 &&
    workflow.agents.length === 0 &&
    workflow.connections.length === 0
  const anyRightPanelCollapsed = skillsPanelCollapsed || promptPanelCollapsed

  const handleOpenReset = () => {
    if (isEmptyWorkflow) return
    setShowResetConfirm(true)
  }

  const handleCancelReset = () => {
    setShowResetConfirm(false)
  }

  const handleConfirmReset = () => {
    useWorkflowStore.getState().resetWorkflow()
    clearSelection()
    if (window.api?.clearDraft) window.api.clearDraft()
    setShowResetConfirm(false)
  }

  const roles: { role: AgentRole; label: string; icon: JSX.Element }[] = [
    {
      role: 'researcher', label: 'Researcher',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="7" cy="7" r="4" /><path d="M10 10l3.5 3.5" /></svg>
    },
    {
      role: 'architect', label: 'Architect',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="12" height="12" rx="1" /><path d="M2 6h12M6 2v12" /></svg>
    },
    {
      role: 'developer', label: 'Developer',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 4 2 8 5 12" /><polyline points="11 4 14 8 11 12" /></svg>
    },
    {
      role: 'reviewer', label: 'Reviewer',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 8 7 11 12 5" /></svg>
    },
    {
      role: 'documenter', label: 'Documenter',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" /><path d="M6 5h4M6 8h4M6 11h2" /></svg>
    },
    {
      role: 'tester', label: 'Tester',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h4M8 2v4M5 6l-2 8h10l-2-8" /></svg>
    },
    {
      role: 'custom', label: 'Custom',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="8 2 10 6 14 6.5 11 9.5 12 14 8 11.5 4 14 5 9.5 2 6.5 6 6" /></svg>
    },
    {
      role: 'powerpoint_presentation_builder', label: 'PowerPoint Presentation Builder',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="3" width="11" height="8" rx="1" /><path d="M8 11v2.5" /><path d="M5.5 13.5h5" /></svg>
    },
    {
      role: 'blog_post_writer', label: 'Blog Post Writer',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="2.5" width="10" height="11" rx="1" /><path d="M5.5 6h5" /><path d="M5.5 8.5h5" /></svg>
    },
    {
      role: 'excel_expert', label: 'Excel Expert',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="2.5" width="10" height="11" rx="1" /><path d="M6 2.5v11" /><path d="M3 6.5h10" /></svg>
    },
    {
      role: 'newsletter_writer', label: 'Newsletter Writer',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="4" width="11" height="8" rx="1" /><path d="M2.5 5l5.5 4 5.5-4" /></svg>
    },
    {
      role: 'seo_content_optimizer', label: 'SEO Content Optimizer',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="3.5" /><path d="M10.5 10.5l2.5 2.5" /></svg>
    },
    {
      role: 'meeting_notes_summarizer', label: 'Meeting Notes Summarizer',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3.5h10a1 1 0 011 1V10a1 1 0 01-1 1H8l-3 2v-2H3a1 1 0 01-1-1V4.5a1 1 0 011-1z" /></svg>
    },
    {
      role: 'research_brief_writer', label: 'Research Brief Writer',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="2.5" width="8" height="11" rx="1" /><circle cx="12.5" cy="11.5" r="1.5" /></svg>
    },
    {
      role: 'social_media_caption_writer', label: 'Social Media Caption Writer',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 8c0-2.8 2.2-5 5.5-5h4a1.5 1.5 0 010 3H8c-1.1 0-2 .9-2 2" /><path d="M13.5 8c0 2.8-2.2 5-5.5 5H4a1.5 1.5 0 010-3h4c1.1 0 2-.9 2-2" /></svg>
    },
  ]

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
      {/* Canvas Mode Toggle */}
      <div className="flex items-center rounded-button bg-surface-elevated/90 backdrop-blur-sm border border-border-subtle overflow-hidden">
        <button
          onClick={() => setCanvasMode('select')}
          className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-all duration-150 ${
            canvasMode === 'select'
              ? 'bg-accent text-white'
              : 'text-content-secondary hover:text-content-primary hover:bg-surface-tertiary'
          }`}
          title="Select mode (V)"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 2l8 6-4 1-2 4-2-11z" />
          </svg>
          Select
        </button>
        <div className="w-px h-5 bg-border-subtle" />
        <button
          onClick={() => setCanvasMode('pan')}
          className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-all duration-150 ${
            canvasMode === 'pan'
              ? 'bg-accent text-white'
              : 'text-content-secondary hover:text-content-primary hover:bg-surface-tertiary'
          }`}
          title="Pan mode (V) / Hold Space"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 1v3M8 12v3M1 8h3M12 8h3M4.5 4.5L6 6M10 10l1.5 1.5M11.5 4.5L10 6M6 10l-1.5 1.5" />
          </svg>
          Pan
        </button>
      </div>

      {/* Add Wave */}
      <motion.button
        whileHover={{ scale: 1.04, y: -1 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => addColumn()}
        className="flex items-center gap-2 px-3.5 py-2 rounded-button bg-surface-elevated/90 backdrop-blur-sm border border-border-subtle text-[12px] font-medium text-content-secondary hover:text-content-primary hover:border-border-default hover:shadow-card transition-all duration-150"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="8" y1="3" x2="8" y2="13" />
          <line x1="3" y1="8" x2="13" y2="8" />
        </svg>
        Add Wave
      </motion.button>

      {/* Add Agent */}
      <div className="relative" ref={menuRef}>
        <motion.button
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowAgentMenu(!showAgentMenu)}
          className="group relative flex items-center gap-2 px-3.5 py-2 rounded-button bg-accent text-white text-[12px] font-semibold hover:bg-accent-hover shadow-card overflow-hidden transition-all duration-150"
        >
          {/* Gradient hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="relative z-[1]">
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          <span className="relative z-[1]">Add Agent</span>
        </motion.button>

        {/* Agent Type Dropdown */}
        <AnimatePresence>
          {showAgentMenu && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute top-full left-0 mt-2 w-[320px] py-1.5 rounded-[10px] bg-surface-elevated/95 backdrop-blur-md border border-border-subtle shadow-elevated z-50"
            >
              {roles.map(({ role, label, icon }) => {
                const accent = ROLE_ACCENT[role]
                return (
                  <motion.button
                    key={role}
                    whileHover={{ x: 2 }}
                    onClick={() => handleAddAgent(role)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] font-medium text-content-secondary hover:text-content-primary hover:bg-surface-tertiary transition-colors duration-100"
                  >
                    <span style={{ color: accent }} className="w-5 flex items-center justify-center">
                      {icon}
                    </span>
                    {label}
                    <div className="flex-1" />
                    <div
                      className="w-1.5 h-1.5 rounded-full opacity-40"
                      style={{ background: accent }}
                    />
                  </motion.button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {anyRightPanelCollapsed && (
        <motion.button
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={expandRightPanels}
          className="flex items-center gap-2 px-3.5 py-2 rounded-button bg-surface-elevated/90 backdrop-blur-sm border border-border-subtle text-[12px] font-medium text-content-secondary hover:text-content-primary hover:border-border-default hover:shadow-card transition-all duration-150"
          title="Show skills and prompt panels"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1.5" y="2" width="13" height="12" rx="1.5" />
            <line x1="9.5" y1="2" x2="9.5" y2="14" />
            <line x1="12" y1="2" x2="12" y2="14" />
          </svg>
          Show Panels
        </motion.button>
      )}

      <motion.button
        whileHover={isEmptyWorkflow ? undefined : { scale: 1.04, y: -1 }}
        whileTap={isEmptyWorkflow ? undefined : { scale: 0.97 }}
        onClick={handleOpenReset}
        disabled={isEmptyWorkflow}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-button border text-[12px] font-medium transition-all duration-150 ${
          isEmptyWorkflow
            ? 'border-border-subtle text-content-tertiary/40 cursor-not-allowed bg-surface-elevated/70'
            : 'border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/8 hover:border-red-500/50 bg-surface-elevated/90 backdrop-blur-sm'
        }`}
        title={isEmptyWorkflow ? 'Canvas is already empty' : 'Reset canvas'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
          <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
        Reset Canvas
      </motion.button>

      <DestructiveConfirmModal
        open={showResetConfirm}
        title="Reset Canvas"
        message="This will delete all waves, agents, and connections on the canvas. This action cannot be undone."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        onConfirm={handleConfirmReset}
        onCancel={handleCancelReset}
      />
    </div>
  )
}
