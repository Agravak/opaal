import { useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useWorkshopStore } from '../../stores/workshop-store'
import { useSkillsStore } from '../../stores/skills-store'
import { SkillList } from './SkillList'
import { SkillEditor } from './SkillEditor'
import { SkillTemplates } from './SkillTemplates'

const EASE = [0.25, 0.46, 0.45, 0.94] as const

export function SkillWorkshop() {
  const activeSkillPath = useWorkshopStore((s) => s.activeSkillPath)
  const activeSkillContent = useWorkshopStore((s) => s.activeSkillContent)
  const showTemplates = useWorkshopStore((s) => s.showTemplates)
  const save = useWorkshopStore((s) => s.save)
  const scanSkills = useSkillsStore((s) => s.scanSkills)

  // Scan skills on mount
  useEffect(() => {
    scanSkills()
  }, [scanSkills])

  // Listen for custom save event (e.g. from keyboard shortcut)
  const handleSaveEvent = useCallback(() => {
    save()
  }, [save])

  useEffect(() => {
    const handler = () => handleSaveEvent()
    window.addEventListener('opaal:workshop-save', handler)
    return () => window.removeEventListener('opaal:workshop-save', handler)
  }, [handleSaveEvent])

  // Determine what to show in the right column
  const hasActiveSkill = activeSkillPath !== null || activeSkillContent.length > 0
  const showEditor = hasActiveSkill && !showTemplates

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="h-full grid grid-cols-[minmax(236px,272px)_1fr] overflow-hidden"
    >
      {/* Left column: Skill browser */}
      <SkillList />

      {/* Right column: Editor / Templates / Empty state */}
      <div className="h-full min-h-0 overflow-hidden">
        {showTemplates ? (
          <SkillTemplates />
        ) : showEditor ? (
          <SkillEditor />
        ) : (
          <EmptyState />
        )}
      </div>
    </motion.div>
  )
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: EASE }}
      className="h-full flex flex-col items-center justify-center gap-4 px-8"
    >
      <div className="w-14 h-14 rounded-xl bg-surface-tertiary/50 border border-border-subtle flex items-center justify-center">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-content-tertiary/50"
        >
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold text-content-primary">Skill Workshop</p>
        <p className="text-[12px] text-content-tertiary leading-relaxed mt-1.5 max-w-[280px]">
          Select a skill from the list to edit it, or create a new one to get started.
        </p>
      </div>
    </motion.div>
  )
}
