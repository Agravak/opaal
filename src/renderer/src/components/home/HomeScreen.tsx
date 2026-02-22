import { useEffect, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { useWorkflowStore } from '../../stores/workflow-store'
import { useUIStore } from '../../stores/ui-store'
import { usePersistenceStore } from '../../stores/persistence-store'
import { useToastStore } from '../../stores/toast-store'
import { templates } from '../../lib/templates'
import { RecentWorkflowCard } from './RecentWorkflowCard'
import { TemplateCard } from './TemplateCard'
import { DropZone } from './DropZone'
import { DraftRecoveryModal } from './DraftRecoveryModal'
import type { Workflow } from '../../types/workflow'

export function HomeScreen() {
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow)
  const resetWorkflow = useWorkflowStore((s) => s.resetWorkflow)
  const setView = useUIStore((s) => s.setView)
  const addToast = useToastStore((s) => s.addToast)

  const recentFiles = usePersistenceStore((s) => s.recentFiles)
  const draft = usePersistenceStore((s) => s.draft)
  const draftChecked = usePersistenceStore((s) => s.draftChecked)
  const loadRecentFiles = usePersistenceStore((s) => s.loadRecentFiles)
  const addRecentFile = usePersistenceStore((s) => s.addRecentFile)
  const removeRecentFile = usePersistenceStore((s) => s.removeRecentFile)
  const clearRecentFiles = usePersistenceStore((s) => s.clearRecentFiles)
  const checkForDraft = usePersistenceStore((s) => s.checkForDraft)
  const clearDraft = usePersistenceStore((s) => s.clearDraft)

  const [showDraftModal, setShowDraftModal] = useState(false)

  // Load recent files and check for draft on mount
  useEffect(() => {
    loadRecentFiles()
    if (!draftChecked) {
      checkForDraft()
    }
  }, [loadRecentFiles, checkForDraft, draftChecked])

  // Show draft modal when draft is detected
  useEffect(() => {
    if (draftChecked && draft) {
      setShowDraftModal(true)
    }
  }, [draftChecked, draft])

  const handleNewBlank = useCallback(() => {
    resetWorkflow()
    if (window.api?.clearDraft) window.api.clearDraft()
    setView('canvas')
  }, [resetWorkflow, setView])

  const handleLoadTemplate = useCallback((templateCreate: () => Workflow) => {
    const wf = templateCreate()
    loadWorkflow(wf)
    setView('canvas')
  }, [loadWorkflow, setView])

  const handleLoadRecentFile = useCallback(async (filePath: string) => {
    if (!window.api?.loadWorkflowByPath) return
    try {
      const result = await window.api.loadWorkflowByPath(filePath)
      if (!result) {
        removeRecentFile(filePath)
        addToast({
          variant: 'error',
          message: 'File not found',
          detail: 'This file may have been moved or deleted',
        })
        return
      }

      const parsed = JSON.parse(result.data) as Workflow
      loadWorkflow(parsed, result.filePath)
      setView('canvas')
      if (window.api.clearDraft) window.api.clearDraft()

      const roleColors = [...new Set(parsed.agents.map(a => a.role))].slice(0, 5)
      addRecentFile({
        filePath: result.filePath,
        name: parsed.name,
        agentCount: parsed.agents.length,
        waveCount: parsed.columns.length,
        roleColors,
        lastOpened: new Date().toISOString(),
      })

      addToast({
        variant: 'success',
        message: 'Workflow loaded',
        detail: result.filePath.replace(/^.*[\\/]/, ''),
      })
    } catch {
      addToast({
        variant: 'error',
        message: 'Failed to load workflow',
        detail: 'The file contains invalid data',
      })
    }
  }, [loadWorkflow, setView, addRecentFile, removeRecentFile, addToast])

  const handleRecoverDraft = useCallback(() => {
    if (!draft) return
    try {
      const parsed = JSON.parse(draft.workflow) as Workflow
      loadWorkflow(parsed)
      clearDraft()
      setShowDraftModal(false)
      setView('canvas')
      addToast({ variant: 'success', message: 'Draft recovered' })
    } catch {
      addToast({ variant: 'error', message: 'Failed to recover draft' })
      setShowDraftModal(false)
    }
  }, [draft, loadWorkflow, clearDraft, setView, addToast])

  const handleDiscardDraft = useCallback(() => {
    clearDraft()
    setShowDraftModal(false)
  }, [clearDraft])

  return (
    <div className="relative flex flex-col h-full overflow-y-auto">
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, var(--color-home-glow, rgba(99,102,241,0.08)) 0%, transparent 60%)',
        }}
      />

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-10 px-8 py-12 max-w-[960px] mx-auto w-full">

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-col items-center gap-5 pt-8 pb-4"
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" className="fill-accent" opacity="0.9" />
              <path d="M2 17L12 22L22 17" className="stroke-accent" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
              <path d="M2 12L12 17L22 12" className="stroke-accent" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
            </svg>
            <span className="text-[22px] font-bold tracking-tight text-content-primary">
              Opaal
            </span>
          </div>

          {/* Tagline */}
          <p className="text-[13px] text-content-tertiary">
            Design your next mission
          </p>

          {/* CTA */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleNewBlank}
            className="flex items-center gap-2 px-6 py-2.5 rounded-[10px] text-[13px] font-semibold text-white bg-accent hover:bg-accent-hover transition-colors"
            style={{ boxShadow: '0 0 24px rgba(99, 102, 241, 0.25)' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8 3v10M3 8h10" />
            </svg>
            New Blank Workflow
          </motion.button>
        </motion.div>

        {/* Recent Missions */}
        {recentFiles.length > 0 && (
          <div className="w-full">
            <div className="flex items-center justify-between mb-4">
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-[11px] font-bold uppercase tracking-[0.08em] text-content-tertiary"
              >
                Recent Missions
              </motion.h2>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                onClick={clearRecentFiles}
                className="text-[10px] text-content-tertiary/60 hover:text-content-secondary transition-colors"
              >
                Clear All
              </motion.button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
              {recentFiles.map((file, i) => (
                <RecentWorkflowCard
                  key={file.filePath}
                  index={i}
                  name={file.name}
                  filePath={file.filePath}
                  agentCount={file.agentCount}
                  waveCount={file.waveCount}
                  roleColors={file.roleColors}
                  lastOpened={file.lastOpened}
                  onClick={() => handleLoadRecentFile(file.filePath)}
                  onRemove={() => removeRecentFile(file.filePath)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Templates */}
        <div className="w-full">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-[11px] font-bold uppercase tracking-[0.08em] text-content-tertiary mb-4"
          >
            Mission Briefings
          </motion.h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
            {templates.map((tmpl, i) => (
              <TemplateCard
                key={tmpl.id}
                template={tmpl}
                index={i}
                onClick={() => handleLoadTemplate(tmpl.create)}
              />
            ))}
          </div>
        </div>

        {/* Skill Workshop */}
        <div className="w-full">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[11px] font-bold uppercase tracking-[0.08em] text-content-tertiary mb-4"
          >
            Skill Workshop
          </motion.h2>
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setView('workshop')}
            className="w-full flex items-center gap-4 p-4 rounded-[10px] border border-border-subtle hover:border-accent/30 bg-surface-elevated/50 hover:bg-surface-elevated transition-all group"
          >
            <div className="w-10 h-10 rounded-[8px] bg-accent/8 border border-accent/15 flex items-center justify-center shrink-0 group-hover:bg-accent/12 transition-colors">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <path d="M11.4 2.6a4 4 0 00-5.3 5.3L2 12l2 2 4.1-4.1a4 4 0 005.3-5.3L11 7 9 5l2.4-2.4z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-[13px] font-semibold text-content-primary">Skill Workshop</p>
              <p className="text-[11px] text-content-tertiary mt-0.5">Create, edit, and manage your Claude Code skills</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-content-tertiary ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              <polyline points="6 4 10 8 6 12" />
            </svg>
          </motion.button>
        </div>

        {/* Drop Zone */}
        <div className="w-full">
          <DropZone />
        </div>

        {/* Open file button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          onClick={() => window.dispatchEvent(new CustomEvent('opaal:load'))}
          className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-[12px] font-medium text-content-tertiary hover:text-content-secondary border border-border-subtle hover:border-border-default transition-all"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 13V3a1 1 0 011-1h4l2 2h4a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1z" />
          </svg>
          Open from file...
        </motion.button>
      </div>

      {/* Draft Recovery Modal */}
      <DraftRecoveryModal
        open={showDraftModal}
        savedAt={draft?.savedAt || ''}
        onRecover={handleRecoverDraft}
        onDiscard={handleDiscardDraft}
      />
    </div>
  )
}
