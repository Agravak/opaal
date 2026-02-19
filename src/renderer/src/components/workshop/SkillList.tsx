import { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useSkillsStore } from '../../stores/skills-store'
import { useWorkshopStore } from '../../stores/workshop-store'
import { categorizeSkill, SKILL_CATEGORY_META } from '../../types/workflow'
import { SkillIcon } from '../nodes/SkillIcon'

const EASE = [0.25, 0.46, 0.45, 0.94] as const

export function SkillList() {
  const detectedSkills = useSkillsStore((s) => s.detectedSkills)
  const searchQuery = useWorkshopStore((s) => s.searchQuery)
  const setSearchQuery = useWorkshopStore((s) => s.setSearchQuery)
  const activeSkillPath = useWorkshopStore((s) => s.activeSkillPath)
  const openSkill = useWorkshopStore((s) => s.openSkill)
  const createNew = useWorkshopStore((s) => s.createNew)
  const activeSkillContent = useWorkshopStore((s) => s.activeSkillContent)
  const originalContent = useWorkshopStore((s) => s.originalContent)

  // Determine dirty state (call as function)
  const dirty = activeSkillContent !== originalContent && (originalContent !== null || !!activeSkillContent)

  // Filter skills by search
  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return detectedSkills
    const q = searchQuery.toLowerCase()
    return detectedSkills.filter((s) => s.name.toLowerCase().includes(q))
  }, [detectedSkills, searchQuery])

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filteredSkills> = {}
    for (const skill of filteredSkills) {
      const cat = categorizeSkill(skill.name)
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(skill)
    }
    // Sort categories to a consistent order
    const order = ['Development', 'Documentation', 'Creative', 'Engineering', 'Utilities']
    const sorted: [string, typeof filteredSkills][] = []
    for (const cat of order) {
      if (groups[cat]) sorted.push([cat, groups[cat]])
    }
    // Add any unknown categories at the end
    for (const [cat, skills] of Object.entries(groups)) {
      if (!order.includes(cat)) sorted.push([cat, skills])
    }
    return sorted
  }, [filteredSkills])

  const handleSkillClick = useCallback(
    (path: string) => {
      if (dirty) {
        const ok = window.confirm('You have unsaved changes. Discard them?')
        if (!ok) return
      }
      openSkill(path)
    },
    [dirty, openSkill],
  )

  const handleCreateNew = useCallback(() => {
    if (dirty) {
      const ok = window.confirm('You have unsaved changes. Discard them?')
      if (!ok) return
    }
    createNew()
  }, [dirty, createNew])

  const isReadOnly = useCallback((path: string) => {
    return path.includes('settings/skills') || path.includes('settings\\skills')
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: EASE }}
      className="h-full flex flex-col border-r border-border-subtle bg-surface-secondary/50"
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-bold text-content-tertiary uppercase tracking-[0.08em]">Skills</h3>
          <span className="text-[10px] text-content-tertiary font-medium tabular-nums">
            {detectedSkills.length}
          </span>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search skills..."
          aria-label="Search skills"
          className="workshop-search-input w-full h-[28px] px-2.5 rounded-md text-[11px] text-content-primary placeholder:text-content-tertiary/50"
        />
      </div>

      {/* Skill groups */}
      <div className="flex-1 overflow-y-auto min-h-0 px-1.5 pb-2">
        {grouped.length === 0 && (
          <div className="flex items-center justify-center h-24 text-[11px] text-content-tertiary">
            No skills found
          </div>
        )}

        {grouped.map(([category, skills], groupIdx) => {
          const catMeta = SKILL_CATEGORY_META[category]
          const catColor = catMeta?.color || '#71717a'

          return (
            <div key={category} className={groupIdx > 0 ? 'mt-3' : 'mt-1'}>
              {/* Category header */}
              <div className="flex items-center gap-2 px-1.5 mb-1">
                <div
                  className="w-[3px] h-[10px] rounded-full"
                  style={{ background: catColor }}
                />
                <span className="text-[9px] font-bold uppercase tracking-widest text-content-tertiary">
                  {category}
                </span>
              </div>

              {/* Skill rows */}
              {skills.map((skill) => {
                const isActive = activeSkillPath === skill.path
                const readOnly = isReadOnly(skill.path)
                return (
                  <button
                    key={skill.id}
                    onClick={() => handleSkillClick(skill.path)}
                    className={`w-full flex items-center gap-2 px-2 py-[5px] rounded-md text-left transition-all duration-100 group relative ${
                      isActive
                        ? 'bg-accent/8 border-l-2 border-accent'
                        : 'border-l-2 border-transparent hover:bg-surface-tertiary/50'
                    } ${readOnly ? 'opacity-70' : ''}`}
                  >
                    <SkillIcon skillName={skill.name} size={14} />
                    <span
                      className={`text-[11px] truncate flex-1 min-w-0 ${
                        isActive
                          ? 'text-content-primary font-medium'
                          : 'text-content-secondary group-hover:text-content-primary'
                      }`}
                    >
                      {skill.name}
                    </span>

                    {/* Read-only lock icon */}
                    {readOnly && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="text-content-tertiary/50 shrink-0"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    )}

                    {/* Dirty indicator */}
                    {isActive && dirty && (
                      <div className="w-[6px] h-[6px] rounded-full bg-amber-400 shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* New skill button */}
      <div className="px-2 py-2 border-t border-border-subtle shrink-0">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCreateNew}
          aria-label="Create new skill"
          className="w-full h-[30px] rounded-button flex items-center justify-center gap-1.5 text-[11px] font-semibold text-accent bg-accent/8 hover:bg-accent/12 border border-accent/15 transition-colors"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Skill
        </motion.button>
      </div>
    </motion.div>
  )
}
