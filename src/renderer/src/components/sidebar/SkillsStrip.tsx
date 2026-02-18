import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSkillsStore } from '../../stores/skills-store'
import { useUIStore } from '../../stores/ui-store'
import { useWorkflowStore } from '../../stores/workflow-store'
import { SKILL_CATEGORY_META, categorizeSkill, getSkillAccentColor, getSkillGradient } from '../../types/workflow'
import { SkillIcon } from '../nodes/SkillIcon'
import { Tooltip } from '../shared/Tooltip'

const EASE = [0.25, 0.46, 0.45, 0.94] as const

type SkillItem = { id: string; name: string; description: string }

function formatLastScanned(timestamp: string | null): string | null {
  if (!timestamp) return null
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function SkillsStrip() {
  const { detectedSkills, scanning, scanSkills, scanError, lastScannedAt } = useSkillsStore()
  const selectedNodeId = useUIStore((s) => s.selectedNodeId)
  const selectedNodeIds = useUIStore((s) => s.selectedNodeIds)
  const skillsPanelCollapsed = useUIStore((s) => s.skillsPanelCollapsed)
  const toggleSkillsPanel = useUIStore((s) => s.toggleSkillsPanel)
  const addSkillToAgent = useWorkflowStore((s) => s.addSkillToAgent)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  useEffect(() => {
    if (detectedSkills.length === 0) {
      scanSkills()
    }
  }, [detectedSkills.length, scanSkills])

  const groupedSkills = useMemo(() => {
    const groups: Record<string, typeof detectedSkills> = {}
    for (const skill of detectedSkills) {
      const category = categorizeSkill(skill.name)
      if (!groups[category]) groups[category] = []
      groups[category].push(skill)
    }
    return Object.entries(groups)
  }, [detectedSkills])

  const handleSkillClick = useCallback((skill: SkillItem) => {
    const targets = selectedNodeId ? [selectedNodeId] : Array.from(selectedNodeIds)
    if (targets.length === 0) return

    for (const id of targets) {
      addSkillToAgent(id, {
        id: skill.id,
        name: skill.name,
        source: 'detected'
      })
    }

    setJustAdded(skill.id)
    setTimeout(() => setJustAdded(null), 600)
  }, [selectedNodeId, selectedNodeIds, addSkillToAgent])

  const handleDragStart = useCallback((e: React.DragEvent, skill: SkillItem) => {
    e.dataTransfer.setData('application/opaal-skill', JSON.stringify(skill))
    e.dataTransfer.effectAllowed = 'copy'

    const accentColor = getSkillAccentColor(skill.name)
    const ghost = document.createElement('div')
    ghost.className = 'skill-drag-ghost-premium'
    ghost.innerHTML = `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${accentColor};flex-shrink:0;"></span>${skill.name}`
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    requestAnimationFrame(() => document.body.removeChild(ghost))
  }, [])

  const handleResetSkills = useCallback(() => {
    if (scanning) return
    scanSkills()
  }, [scanning, scanSkills])

  const lastScannedLabel = useMemo(() => formatLastScanned(lastScannedAt), [lastScannedAt])

  const selectedCount = selectedNodeId ? 1 : selectedNodeIds.size
  const hasSelection = selectedCount > 0

  if (skillsPanelCollapsed) {
    return (
      <aside className="flex h-full w-full bg-surface-elevated/95 backdrop-blur-md border-l border-border-default shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden">
        <Tooltip content="Show skills panel">
          <button
            onClick={toggleSkillsPanel}
            className="flex-1 flex flex-col items-center justify-center gap-2 text-content-secondary hover:text-content-primary hover:bg-surface-tertiary/75 transition-colors px-1"
            title="Show skills panel"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="6 4 10 8 6 12" />
            </svg>
            <span
              className="text-[9px] font-bold tracking-[0.11em] text-content-primary/90"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              SKILLS
            </span>
          </button>
        </Tooltip>
      </aside>
    )
  }

  return (
    <aside className="flex flex-col h-full w-full bg-surface-secondary/72 backdrop-blur-sm border-l border-border-subtle overflow-hidden">
      <div className="px-3.5 py-3 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[8px] bg-accent/8 border border-accent/15 flex items-center justify-center shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-content-primary tracking-normal leading-none">
              Skills Library
            </p>
            <p className="text-[10px] text-content-tertiary mt-1">
              {scanning ? 'Scanning skills...' : `${detectedSkills.length} skills detected`}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={handleResetSkills}
              disabled={scanning}
              className={`px-2 py-1 rounded-[7px] text-[10px] font-semibold tracking-wide transition-colors ${
                scanning
                  ? 'text-content-tertiary/50 bg-surface-tertiary/50 cursor-not-allowed'
                  : 'text-content-tertiary hover:text-content-secondary hover:bg-surface-tertiary'
              }`}
              title="Reset skills (rescan installed skills)"
              aria-label="Reset skills (rescan installed skills)"
            >
              {scanning ? 'Scanning...' : 'Reset Skills'}
            </button>
            <button
              onClick={toggleSkillsPanel}
              className="p-1.5 rounded-[7px] text-content-tertiary hover:text-content-secondary hover:bg-surface-tertiary transition-colors"
              title="Collapse skills panel"
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="10 4 6 8 10 12" />
              </svg>
            </button>
          </div>
        </div>
        {scanError && (
          <p className="text-[10px] text-red-400/90 mt-2 leading-snug">
            {scanError}
          </p>
        )}
        {!scanError && lastScannedLabel && (
          <p className="text-[9.5px] text-content-tertiary/80 mt-1.5">
            Last scanned {lastScannedLabel}
          </p>
        )}
        <p className="text-[10px] text-content-tertiary mt-2 leading-snug">
          {hasSelection
            ? `Click to equip on ${selectedCount} selected ${selectedCount === 1 ? 'agent' : 'agents'}, or drag to any card.`
            : 'Drag to any agent card, or select agent(s) to click-equip.'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-2.5 py-2.5 space-y-3">
        {groupedSkills.map(([category, skills], categoryIndex) => {
          const categoryMeta = SKILL_CATEGORY_META[category] || { color: '#71717a', icon: 'wrench' }
          return (
            <motion.section
              key={category}
              className="space-y-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: categoryIndex * 0.05, duration: 0.2, ease: EASE }}
            >
              <div className="flex items-center gap-2 px-1">
                <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${categoryMeta.color}35, transparent)` }} />
                <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-content-tertiary">
                  {category}
                </span>
                <span className="text-[9px] text-content-tertiary/70 tabular-nums">{skills.length}</span>
              </div>

              {skills.map((skill, index) => (
                <SkillRow
                  key={skill.id}
                  skill={skill}
                  category={category}
                  categoryColor={categoryMeta.color}
                  index={index}
                  hasSelection={hasSelection}
                  isJustAdded={justAdded === skill.id}
                  onDragStart={handleDragStart}
                  onClick={handleSkillClick}
                />
              ))}
            </motion.section>
          )
        })}

        {detectedSkills.length === 0 && !scanning && (
          <div className="px-2 py-5 text-center">
            <p className="text-[11px] font-medium text-content-secondary">No skills found</p>
            <p className="text-[10px] text-content-tertiary mt-1">Install or scan skills to populate this panel.</p>
          </div>
        )}
      </div>
    </aside>
  )
}

function SkillRow({
  skill,
  category,
  categoryColor,
  index,
  hasSelection,
  isJustAdded,
  onDragStart,
  onClick
}: {
  skill: SkillItem
  category: string
  categoryColor: string
  index: number
  hasSelection: boolean
  isJustAdded: boolean
  onDragStart: (e: React.DragEvent, skill: SkillItem) => void
  onClick: (skill: SkillItem) => void
}) {
  const [hovered, setHovered] = useState(false)
  const skillAccent = getSkillAccentColor(skill.name)
  const [gFrom, gTo] = getSkillGradient(skill.name)

  return (
    <Tooltip content={`${skill.name}\n${skill.description}`}>
      <motion.div
        draggable
        onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, skill)}
        onClick={() => onClick(skill)}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.035, duration: 0.2, ease: EASE }}
        whileHover={{ x: 3, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className={`group relative flex items-start gap-2.5 w-full px-2.5 py-2 rounded-[9px] border transition-all duration-200 ${
          hasSelection
            ? 'cursor-pointer'
            : 'cursor-grab active:cursor-grabbing'
        }`}
        style={{
          borderColor: hovered ? `${skillAccent}45` : `${categoryColor}25`,
          background: hovered
            ? `linear-gradient(135deg, ${skillAccent}14 0%, var(--color-surface-elevated) 60%)`
            : `linear-gradient(135deg, ${categoryColor}10 0%, var(--color-surface-elevated) 70%)`,
          boxShadow: hovered ? `0 0 14px ${skillAccent}12, 0 2px 8px rgba(0,0,0,0.06)` : 'none',
        }}
      >
        {/* Per-skill unique icon with gradient background */}
        <div
          className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 border transition-all duration-200"
          style={{
            color: skillAccent,
            background: hovered
              ? `linear-gradient(135deg, ${gFrom}22 0%, ${gTo}16 100%)`
              : `linear-gradient(135deg, ${gFrom}15 0%, ${gTo}10 100%)`,
            borderColor: hovered ? `${skillAccent}40` : `${gFrom}26`,
          }}
        >
          <SkillIcon skillName={skill.name} category={category} size={14} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-content-primary leading-snug truncate tracking-normal">
            {skill.name}
          </p>
          <p className="text-[10px] text-content-tertiary leading-snug truncate mt-0.5">
            {skill.description}
          </p>
        </div>

        <AnimatePresence>
          {isJustAdded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.16, ease: EASE }}
              className="absolute right-2 top-2 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: `${skillAccent}18`, border: `1px solid ${skillAccent}35` }}
            >
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke={skillAccent} strokeWidth="2.5" strokeLinecap="round">
                <polyline points="3 8 7 12 13 4" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Tooltip>
  )
}
