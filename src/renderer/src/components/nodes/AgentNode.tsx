import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { motion, AnimatePresence } from 'framer-motion'
import { ROLE_META, ROLE_ACCENT, MAX_ABILITY_SLOTS, type AgentNode as AgentNodeType, categorizeSkill, getSkillAccentColor, getSkillGradient, type SkillReference } from '../../types/workflow'
import { useWorkflowStore } from '../../stores/workflow-store'
import { useUIStore } from '../../stores/ui-store'
import { useSkillsStore } from '../../stores/skills-store'
import { SkillIcon } from './SkillIcon'
import { RoleIcon } from '../shared/RoleIcon'
import { Tooltip } from '../shared/Tooltip'

// Clip-path constants for the command card shape system
const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
const BEVEL_CLIP = 'polygon(4% 0%, 96% 0%, 100% 6%, 100% 94%, 96% 100%, 4% 100%, 0% 94%, 0% 6%)'
const SLOT_BEVEL_CLIP = 'polygon(14% 0%, 86% 0%, 100% 14%, 100% 86%, 86% 100%, 14% 100%, 0% 86%, 0% 14%)'
const SKILL_SUMMARY_MAX_NAMES = 2

type AgentNodeData = {
  agent: AgentNodeType
  isDeploying?: boolean
}

// ── Legendary Ability Slot Sub-Component ──
function AbilitySlot({
  skill,
  isOverflow,
  overflowCount,
  isDragTarget,
  isNewlyAdded,
}: {
  skill: SkillReference | null
  isOverflow: boolean
  overflowCount?: number
  isDragTarget: boolean
  isNewlyAdded: boolean
}) {
  const [showRingBurst, setShowRingBurst] = useState(false)
  const openSkillViewer = useUIStore((s) => s.openSkillViewer)
  const detectedSkills = useSkillsStore((s) => s.detectedSkills)
  const isEmpty = !skill && !isOverflow

  const handleSlotClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  const handleSlotDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!skill) return
    const detected = detectedSkills.find(ds => ds.name === skill.name)
    if (detected?.path) {
      openSkillViewer(skill.name, detected.path)
    }
  }, [skill, detectedSkills, openSkillViewer])

  // Trigger ring burst on equip
  useEffect(() => {
    if (isNewlyAdded) {
      setShowRingBurst(true)
      const timer = setTimeout(() => setShowRingBurst(false), 600)
      return () => clearTimeout(timer)
    }
  }, [isNewlyAdded])

  if (isOverflow) {
    return (
      <Tooltip content={`${overflowCount} more skills equipped`}>
        <div
          className="w-[34px] h-[34px] flex items-center justify-center cursor-default"
          style={{ clipPath: SLOT_BEVEL_CLIP, background: 'var(--color-surface-tertiary)' }}
        >
          <span className="text-[10px] font-bold text-content-tertiary">+{overflowCount}</span>
        </div>
      </Tooltip>
    )
  }

  if (isEmpty) {
    return (
      <div
        className={`w-[34px] h-[34px] flex items-center justify-center ${isDragTarget ? 'slot-pulse-anim' : ''}`}
        style={{
          clipPath: SLOT_BEVEL_CLIP,
          background: 'var(--color-surface-tertiary)',
          opacity: isDragTarget ? 0.8 : 0.35,
        }}
      >
        <div
          className="w-[6px] h-[6px] rounded-[1px] opacity-30"
          style={{
            background: 'var(--color-content-tertiary)',
            transform: 'rotate(45deg)',
          }}
        />
      </div>
    )
  }

  // Equipped skill slot - legendary treatment
  const category = categorizeSkill(skill!.name)
  const accentColor = getSkillAccentColor(skill!.name)
  const [gradFrom, gradTo] = getSkillGradient(skill!.name)

  return (
    <Tooltip content={`${skill!.name}\n${category}`}>
      <div className="relative">
        <motion.div
          initial={isNewlyAdded ? { scale: 0, opacity: 0, rotate: -8 } : false}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={isNewlyAdded
            ? { type: 'spring', stiffness: 600, damping: 20, mass: 0.6 }
            : { duration: 0.15 }
          }
          onClick={handleSlotClick}
          onDoubleClick={handleSlotDoubleClick}
          className={`w-[34px] h-[34px] flex items-center justify-center cursor-pointer relative skill-slot-shimmer ${
            isNewlyAdded ? 'skill-equip-flash-v2-anim' : 'skill-slot-breathe'
          }`}
          style={{
            clipPath: SLOT_BEVEL_CLIP,
            background: `linear-gradient(135deg, ${gradFrom}22 0%, ${gradTo}18 100%)`,
            '--slot-flash-color': `${accentColor}50`,
            '--skill-glow': `${accentColor}18`,
          } as React.CSSProperties}
        >
          {/* Layer 1: Per-skill unique icon */}
          <SkillIcon skillName={skill!.name} category={category} size={16} />

          {/* Layer 2: Radial inner glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              clipPath: SLOT_BEVEL_CLIP,
              background: `radial-gradient(circle at center, ${accentColor}18 0%, transparent 70%)`,
            }}
          />
        </motion.div>

        {/* Ring burst on equip (particle emission effect) */}
        {showRingBurst && (
          <div
            className="absolute inset-0 skill-equip-ring-anim pointer-events-none"
            style={{
              borderRadius: '6px',
              border: `2px solid ${accentColor}`,
            }}
          />
        )}
      </div>
    </Tooltip>
  )
}

// ── Main Agent Node Component ──
function AgentNodeComponent({ data, id, selected, dragging }: NodeProps & { data: AgentNodeData }) {
  const { agent, isDeploying } = data
  const roleMeta = ROLE_META[agent.role]
  const roleAccent = ROLE_ACCENT[agent.role]
  const updateAgent = useWorkflowStore((s) => s.updateAgent)
  const addSkillToAgent = useWorkflowStore((s) => s.addSkillToAgent)
  const selectNode = useUIStore((s) => s.selectNode)
  const toggleNodeSelection = useUIStore((s) => s.toggleNodeSelection)
  const isSelected = useUIStore((s) => s.selectedNodeIds.has(agent.id))
  const isOnlySelected = useUIStore((s) => s.selectedNodeIds.size === 1 && s.selectedNodeIds.has(agent.id))
  const openContextMenu = useUIStore((s) => s.openContextMenu)

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(agent.name)
  const [isDragOver, setIsDragOver] = useState(false)
  const [lastAddedSkillId, setLastAddedSkillId] = useState<string | null>(null)
  const [showEnergyBurst, setShowEnergyBurst] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevSkillCountRef = useRef(agent.skills.length)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Energy burst on mount
  useEffect(() => {
    const timer = setTimeout(() => setShowEnergyBurst(false), 600)
    return () => clearTimeout(timer)
  }, [])

  // Detect newly added skills for animation
  useEffect(() => {
    if (agent.skills.length > prevSkillCountRef.current) {
      const newSkill = agent.skills[agent.skills.length - 1]
      setLastAddedSkillId(newSkill.id)
      const timer = setTimeout(() => setLastAddedSkillId(null), 800)
      return () => clearTimeout(timer)
    }
    prevSkillCountRef.current = agent.skills.length
  }, [agent.skills])

  const handleDoubleClick = useCallback(() => {
    setEditName(agent.name)
    setIsEditing(true)
  }, [agent.name])

  const handleNameSubmit = useCallback(() => {
    const trimmed = editName.trim()
    if (trimmed) {
      updateAgent(agent.id, { name: trimmed })
    }
    setIsEditing(false)
  }, [editName, agent.id, updateAgent])

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.shiftKey) {
      toggleNodeSelection(agent.id)
    } else {
      selectNode(agent.id)
    }
  }, [agent.id, selectNode, toggleNodeSelection])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isSelected) {
      selectNode(agent.id)
    }
    openContextMenu(e.clientX, e.clientY, agent.id, null)
  }, [agent.id, isSelected, selectNode, openContextMenu])

  // Skill drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/opaal-skill')) {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'copy'
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const skillData = e.dataTransfer.getData('application/opaal-skill')
    if (skillData) {
      try {
        const skill = JSON.parse(skillData)
        addSkillToAgent(agent.id, {
          id: skill.id,
          name: skill.name,
          source: 'detected'
        })
      } catch { /* ignore invalid data */ }
    }
  }, [agent.id, addSkillToAgent])

  // Build ability slot data
  const hasOverflow = agent.skills.length > MAX_ABILITY_SLOTS
  const visibleSkills = hasOverflow ? agent.skills.slice(0, MAX_ABILITY_SLOTS - 1) : agent.skills
  const overflowCount = hasOverflow ? agent.skills.length - (MAX_ABILITY_SLOTS - 1) : 0
  const skillSummaryNames = agent.skills.slice(0, SKILL_SUMMARY_MAX_NAMES).map((skill) => skill.name)
  const skillSummaryOverflow = Math.max(0, agent.skills.length - skillSummaryNames.length)
  const skillSummary = skillSummaryNames.length > 0
    ? `${skillSummaryNames.join(' · ')}${skillSummaryOverflow > 0 ? ` +${skillSummaryOverflow}` : ''}`
    : ''
  const fullSkillSummary = agent.skills.length > 0
    ? agent.skills.map((skill) => skill.name).join('\n')
    : 'No skills equipped'

  // Border colors based on state
  const borderColor = isDragOver
    ? `${roleAccent}60`
    : isSelected
      ? `${roleAccent}40`
      : 'var(--color-border-subtle)'

  const bodyBg = `linear-gradient(180deg, ${roleAccent}08 0%, var(--color-surface-elevated) 50%)`

  return (
    <motion.div
      initial={isDeploying
        ? { opacity: 0, scale: 0.3, filter: 'blur(12px)', y: 10 }
        : { opacity: 0, scale: 0 }
      }
      animate={isDeploying
        ? {
            opacity: 1,
            scale: [0.3, 1.08, 0.97, 1.0],
            filter: ['blur(12px)', 'blur(3px)', 'blur(0px)', 'blur(0px)'],
            y: [10, -4, 1, 0],
          }
        : {
            opacity: 1,
            scale: dragging ? 1.04 : 1,
            y: dragging ? -6 : 0,
            rotate: dragging ? 1 : 0,
          }
      }
      transition={isDeploying
        ? {
            duration: 0.55,
            ease: [0.22, 1, 0.36, 1],
            times: [0, 0.45, 0.75, 1],
          }
        : dragging
          ? { type: 'spring', stiffness: 300, damping: 20 }
          : { type: 'spring', stiffness: 400, damping: 25, mass: 0.8 }
      }
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col items-center w-[280px] cursor-pointer ${
        isDeploying
          ? 'deploy-border-flash-anim'
          : isSelected
            ? isOnlySelected
              ? 'command-card-breathe'
              : ''
            : ''
      }`}
      style={{
        zIndex: dragging ? 1000 : isDeploying ? 999 : undefined,
        '--card-glow-color': isOnlySelected ? `${roleAccent}30` : isSelected ? `${roleAccent}18` : 'transparent',
        '--deploy-accent': roleAccent,
        filter: dragging
          ? 'drop-shadow(0 20px 40px rgba(0,0,0,0.3)) drop-shadow(0 8px 16px rgba(0,0,0,0.15))'
          : isSelected
            ? `drop-shadow(0 0 12px ${roleAccent}20)`
            : undefined,
      } as React.CSSProperties}
    >
      {/* ── Portrait Hex Frame ── */}
      <div
        className={`relative w-[76px] h-[76px] z-10 ${
          isOnlySelected ? 'hex-frame-pulse-intense' : 'hex-frame-pulse'
        }`}
        style={{
          '--hex-glow-color': `${roleAccent}40`,
        } as React.CSSProperties}
      >
        {/* Hex border (outer ring) */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: HEX_CLIP,
            background: `linear-gradient(135deg, ${roleAccent}50 0%, ${roleAccent}25 100%)`,
          }}
        />
        {/* Hex inner background */}
        <div
          className="absolute inset-[2px]"
          style={{
            clipPath: HEX_CLIP,
            background: `linear-gradient(180deg, var(--color-surface-elevated) 30%, ${roleAccent}10 100%)`,
          }}
        />
        {/* Role icon centered */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ color: roleAccent }}>
          <RoleIcon role={agent.role} size={28} />
        </div>

        {/* Energy burst on mount */}
        {showEnergyBurst && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div
              className="w-[40px] h-[40px] rounded-full energy-burst-anim"
              style={{
                background: `radial-gradient(circle, ${roleAccent}40 0%, transparent 70%)`,
              }}
            />
          </div>
        )}
      </div>

      {/* ── Beveled Body ── */}
      <div className="relative w-full -mt-3 z-0">
        {/* Border layer */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: BEVEL_CLIP,
            background: borderColor,
            transition: 'background 0.2s ease',
          }}
        />
        {/* Content background layer */}
        <div
          className="absolute inset-[1px]"
          style={{
            clipPath: BEVEL_CLIP,
            background: bodyBg,
          }}
        />

        {/* Content */}
        <div className="relative z-10 pt-5 pb-3 px-5">
          {/* Agent Name (centered) */}
          <div className="text-center mb-1">
            {isEditing ? (
              <input
                ref={inputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSubmit()
                  if (e.key === 'Escape') setIsEditing(false)
                }}
                className="w-full text-[14px] font-bold tracking-tight bg-transparent border-b-2 outline-none text-content-primary text-center pb-0.5"
                style={{ borderColor: roleAccent }}
              />
            ) : (
              <h3
                onDoubleClick={handleDoubleClick}
                className="text-[14px] font-bold tracking-tight text-content-primary truncate leading-snug"
              >
                {agent.name}
              </h3>
            )}
          </div>

          {/* Role Badge (centered) */}
          <div className="flex justify-center mb-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-[5px] text-[10px] font-bold tracking-wider border ${roleMeta.bg} ${roleMeta.text} ${roleMeta.border}`}
            >
              {roleMeta.abbr}
            </span>
          </div>

          {/* Role Description */}
          {agent.roleDescription && (
            <p className="text-[11px] leading-relaxed text-content-secondary line-clamp-2 text-center mb-2">
              {agent.roleDescription}
            </p>
          )}

          {/* Output Definition */}
          {agent.outputDefinition && (
            <div className="flex items-center justify-center gap-1.5 mb-2.5">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-content-tertiary shrink-0">
                <path d="M4 8h8M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[10px] text-content-tertiary truncate max-w-[180px]">
                {agent.outputDefinition}
              </span>
            </div>
          )}

          {/* Drop hint when dragging skill over */}
          <AnimatePresence>
            {isDragOver && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center justify-center gap-1.5 py-1 mb-2 rounded-md"
                style={{ background: `${roleAccent}15`, border: `1px solid ${roleAccent}30` }}
              >
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke={roleAccent} strokeWidth="2" strokeLinecap="round">
                  <line x1="8" y1="3" x2="8" y2="13" />
                  <line x1="3" y1="8" x2="13" y2="8" />
                </svg>
                <span className="text-[9px] font-semibold" style={{ color: roleAccent }}>Equip skill</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── RTS Ability Bar ── */}
          <div className="flex items-center justify-center gap-[4px]">
            {Array.from({ length: MAX_ABILITY_SLOTS }).map((_, i) => {
              const isOverflowSlot = hasOverflow && i === MAX_ABILITY_SLOTS - 1
              const skill = isOverflowSlot ? null : (visibleSkills[i] || null)

              return (
                <AbilitySlot
                  key={i}
                  skill={skill}
                  isOverflow={isOverflowSlot}
                  overflowCount={isOverflowSlot ? overflowCount : undefined}
                  isDragTarget={isDragOver && !skill && !isOverflowSlot}
                  isNewlyAdded={skill?.id === lastAddedSkillId}
                />
              )
            })}
          </div>

          {agent.skills.length > 0 && (
            <Tooltip content={fullSkillSummary}>
              <p className="mt-2 text-center text-[10px] leading-tight text-content-tertiary truncate tracking-normal">
                {skillSummary}
              </p>
            </Tooltip>
          )}
        </div>
      </div>

      {/* ── Connection Handles ── */}
      <Handle
        type="target"
        position={Position.Left}
        className="!border-2 !transition-all !duration-200"
        style={{
          top: '50%',
          left: -6,
          borderColor: `${roleAccent}50`,
          background: 'var(--color-surface-elevated)',
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!border-2 !transition-all !duration-200"
        style={{
          top: '50%',
          right: -6,
          borderColor: `${roleAccent}50`,
          background: 'var(--color-surface-elevated)',
        }}
      />
    </motion.div>
  )
}

export default memo(AgentNodeComponent)
