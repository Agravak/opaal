import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSkillsStore } from '../../stores/skills-store'
import { useWorkflowStore } from '../../stores/workflow-store'
import { SKILL_CATEGORIES, SKILL_CATEGORY_META, MAX_ABILITY_SLOTS, getSkillAccentColor } from '../../types/workflow'
import { SkillIcon } from '../nodes/SkillIcon'

const EASE = [0.25, 0.46, 0.45, 0.94] as const

interface SkillSelectorDropdownProps {
  agentId: string
  equippedSkillIds: string[]
  disabled: boolean
}

export function SkillSelectorDropdown({ agentId, equippedSkillIds, disabled }: SkillSelectorDropdownProps) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const detectedSkills = useSkillsStore((s) => s.detectedSkills)
  const toSkillReference = useSkillsStore((s) => s.toSkillReference)
  const addSkillToAgent = useWorkflowStore((s) => s.addSkillToAgent)

  const equippedSet = new Set(equippedSkillIds)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setFilter('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setFilter('')
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const availableSkills = detectedSkills.filter(
    (s) => !equippedSet.has(s.id) && s.name.toLowerCase().includes(filter.toLowerCase())
  )

  // Group by category
  const grouped: Record<string, typeof availableSkills> = {}
  for (const skill of availableSkills) {
    let category = 'Utilities'
    for (const [cat, names] of Object.entries(SKILL_CATEGORIES)) {
      if (names.includes(skill.name)) {
        category = cat
        break
      }
    }
    if (!grouped[category]) grouped[category] = []
    grouped[category].push(skill)
  }

  const handleSelect = useCallback(
    (skill: typeof detectedSkills[0]) => {
      addSkillToAgent(agentId, toSkillReference(skill))
      setOpen(false)
      setFilter('')
    },
    [agentId, addSkillToAgent, toSkillReference]
  )

  return (
    <div className="relative mt-2" ref={dropdownRef}>
      <motion.button
        whileHover={disabled ? {} : { scale: 1.02 }}
        whileTap={disabled ? {} : { scale: 0.98 }}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-button text-[11px] font-medium
          border transition-all duration-150 ${
            disabled
              ? 'text-content-tertiary/50 bg-surface-tertiary/50 border-border-subtle/50 cursor-not-allowed'
              : 'text-content-secondary hover:text-content-primary bg-surface-tertiary border-border-subtle hover:border-border-default'
          }`}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="8" y1="3" x2="8" y2="13" />
          <line x1="3" y1="8" x2="13" y2="8" />
        </svg>
        {disabled ? 'Max skills equipped' : 'Add Skill'}
        {!disabled && (
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
            <polyline points="4 6 8 10 12 6" />
          </svg>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, scale: 0.96, filter: 'blur(4px)' }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute left-0 top-full mt-1.5 w-[280px] max-h-[260px] z-[60]
              bg-surface-elevated border border-border-subtle rounded-xl shadow-elevated
              overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search */}
            <div className="px-3 py-2 border-b border-border-subtle">
              <input
                autoFocus
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter skills..."
                className="w-full px-2 py-1 rounded-md bg-surface-tertiary border border-border-subtle
                  text-[11px] text-content-primary placeholder:text-content-tertiary
                  focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
              />
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 py-1">
              {Object.keys(grouped).length === 0 && (
                <div className="px-3 py-4 text-center text-[11px] text-content-tertiary">
                  {filter ? 'No matching skills' : 'All skills equipped'}
                </div>
              )}
              {Object.entries(grouped).map(([category, skills]) => {
                const meta = SKILL_CATEGORY_META[category] || SKILL_CATEGORY_META['Utilities']
                return (
                  <div key={category}>
                    <div className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider" style={{ color: meta.color }}>
                      {category}
                    </div>
                    {skills.map((skill) => {
                      const skillAccent = getSkillAccentColor(skill.name)
                      return (
                        <SkillDropdownRow
                          key={skill.id}
                          skill={skill}
                          category={category}
                          skillAccent={skillAccent}
                          onSelect={handleSelect}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SkillDropdownRow({
  skill,
  category,
  skillAccent,
  onSelect,
}: {
  skill: { id: string; name: string; description: string }
  category: string
  skillAccent: string
  onSelect: (skill: { id: string; name: string; description: string }) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={() => onSelect(skill)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-all duration-150 group border-l-2"
      style={{
        borderLeftColor: hovered ? skillAccent : 'transparent',
        background: hovered ? `linear-gradient(90deg, ${skillAccent}08 0%, transparent 60%)` : undefined,
      }}
    >
      <SkillIcon skillName={skill.name} category={category} size={12} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium text-content-secondary group-hover:text-content-primary transition-colors truncate">
          {skill.name}
        </div>
        {skill.description && (
          <div className="text-[9px] text-content-tertiary truncate">
            {skill.description}
          </div>
        )}
      </div>
    </button>
  )
}
