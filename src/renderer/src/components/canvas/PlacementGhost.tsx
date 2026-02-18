import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../stores/ui-store'
import { useCustomAgentsStore } from '../../stores/custom-agents-store'
import { ROLE_META, ROLE_ACCENT, type AgentRole } from '../../types/workflow'
import { RoleIcon } from '../shared/RoleIcon'

const EASE = [0.25, 0.46, 0.45, 0.94] as const

interface PlacementGhostProps {
  mouseX: number
  mouseY: number
}

export function PlacementGhost({ mouseX, mouseY }: PlacementGhostProps) {
  const placementMode = useUIStore((s) => s.placementMode)
  const placementRole = useUIStore((s) => s.placementRole)
  const placementTemplateId = useUIStore((s) => s.placementTemplateId)
  const templates = useCustomAgentsStore((s) => s.templates)

  if (!placementMode) return null

  let role: AgentRole = placementRole || 'custom'
  let label = ROLE_META[role]?.label || 'Custom Agent'
  let accent = ROLE_ACCENT[role] || ROLE_ACCENT.custom

  // If placing a custom template, use its role and name
  if (placementTemplateId) {
    const template = templates.find((t) => t.id === placementTemplateId)
    if (template) {
      role = template.role
      label = template.name
      accent = ROLE_ACCENT[template.role] || ROLE_ACCENT.custom
    }
  }

  const abbr = ROLE_META[role]?.abbr || 'CST'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 0.6, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.12, ease: EASE }}
        className="fixed pointer-events-none z-50"
        style={{
          left: mouseX - 140,
          top: mouseY - 16,
        }}
      >
        {/* Ghost card */}
        <div
          className="w-[280px] rounded-[10px] border-2 border-dashed overflow-hidden"
          style={{
            borderColor: `${accent}70`,
            background: `linear-gradient(180deg, ${accent}0C 0%, transparent 100%)`,
            backdropFilter: 'blur(4px)',
          }}
        >
          {/* Content */}
          <div className="flex flex-col items-center py-5 gap-2">
            {/* Role icon */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)`,
                border: `1.5px solid ${accent}35`,
              }}
            >
              <div style={{ color: accent }}>
                <RoleIcon role={role} size={24} />
              </div>
            </div>

            {/* Label */}
            <span
              className="text-[13px] font-semibold tracking-tight"
              style={{ color: `${accent}CC` }}
            >
              {label}
            </span>

            {/* Abbreviation badge */}
            <span
              className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-[4px]"
              style={{
                color: `${accent}AA`,
                background: `${accent}12`,
                border: `1px solid ${accent}25`,
              }}
            >
              {abbr}
            </span>

            {/* Click to deploy hint */}
            <span className="text-[10px] text-content-tertiary/60 mt-1">
              Click to deploy
            </span>
          </div>
        </div>

        {/* Crosshair indicator at cursor position */}
        <div
          className="absolute w-5 h-5 -top-2"
          style={{ left: 130 }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="3" stroke={accent} strokeWidth="1.5" opacity="0.6" />
            <line x1="10" y1="0" x2="10" y2="6" stroke={accent} strokeWidth="1" opacity="0.4" />
            <line x1="10" y1="14" x2="10" y2="20" stroke={accent} strokeWidth="1" opacity="0.4" />
            <line x1="0" y1="10" x2="6" y2="10" stroke={accent} strokeWidth="1" opacity="0.4" />
            <line x1="14" y1="10" x2="20" y2="10" stroke={accent} strokeWidth="1" opacity="0.4" />
          </svg>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
