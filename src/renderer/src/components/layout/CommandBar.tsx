import { useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkflowStore } from '../../stores/workflow-store'
import { useUIStore } from '../../stores/ui-store'
import { useCustomAgentsStore, getUnifiedVisibleAgents } from '../../stores/custom-agents-store'
import { ROLE_META, ROLE_ACCENT, type AgentRole } from '../../types/workflow'
import type { CustomAgentTemplate } from '../../types/custom-agent'
import { RoleIcon } from '../shared/RoleIcon'
import { Tooltip } from '../shared/Tooltip'

const EASE = [0.25, 0.46, 0.45, 0.94] as const

const ROLE_TAGLINES: Partial<Record<AgentRole, string>> = {
  researcher: 'Investigate & discover',
  architect: 'Design & plan',
  developer: 'Build & implement',
  reviewer: 'Review & validate',
  documenter: 'Document & explain',
  tester: 'Test & verify',
  powerpoint_presentation_builder: 'Slide decks',
  blog_post_writer: 'Long-form articles',
  excel_expert: 'Spreadsheet modeling',
  newsletter_writer: 'Audience editions',
  seo_content_optimizer: 'Search visibility',
  meeting_notes_summarizer: 'Action items',
  research_brief_writer: 'Research briefs',
  social_media_caption_writer: 'Captions & hooks',
  custom: 'Define your own',
}

function getHotkey(index: number): string | null {
  if (index < 9) return String(index + 1)
  if (index === 9) return '0'
  return null
}

export function CommandBar() {
  const paletteCollapsed = useUIStore((s) => s.paletteCollapsed)
  const togglePalette = useUIStore((s) => s.togglePalette)
  const placementMode = useUIStore((s) => s.placementMode)
  const placementRole = useUIStore((s) => s.placementRole)
  const placementTemplateId = useUIStore((s) => s.placementTemplateId)
  const enterPlacementMode = useUIStore((s) => s.enterPlacementMode)
  const enterPlacementModeCustom = useUIStore((s) => s.enterPlacementModeCustom)
  const exitPlacementMode = useUIStore((s) => s.exitPlacementMode)
  const openAgentManager = useUIStore((s) => s.openAgentManager)
  const view = useUIStore((s) => s.view)
  const commandBarExpanded = useUIStore((s) => s.commandBarExpanded)
  const skillsPanelCollapsed = useUIStore((s) => s.skillsPanelCollapsed)
  const promptPanelCollapsed = useUIStore((s) => s.promptPanelCollapsed)

  const { templates, loaded, loadCustomAgents } = useCustomAgentsStore()
  const hiddenDefaultRoles = useCustomAgentsStore((s) => s.hiddenDefaultRoles)
  const unifiedOrder = useCustomAgentsStore((s) => s.unifiedOrder)

  const unifiedAgents = useMemo(
    () => getUnifiedVisibleAgents(unifiedOrder, templates, hiddenDefaultRoles),
    [unifiedOrder, templates, hiddenDefaultRoles]
  )

  // Calculate right offset to align with canvas boundary
  const rightPanelWidth = (skillsPanelCollapsed ? 34 : 254) + (promptPanelCollapsed ? 34 : 380)

  useEffect(() => {
    if (!loaded) loadCustomAgents()
  }, [loaded, loadCustomAgents])

  if (view !== 'canvas') return null

  if (paletteCollapsed) {
    return (
      <div
        className="absolute bottom-3 left-0 z-20 flex justify-center pointer-events-none transition-[right] duration-300 ease-out"
        style={{ right: `${rightPanelWidth}px` }}
      >
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={togglePalette}
          className="pointer-events-auto flex items-center gap-2 px-4 py-1.5 rounded-[10px] command-bar-glass text-[10px] font-semibold text-content-tertiary hover:text-content-secondary transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="4 10 8 6 12 10" />
          </svg>
          Show Command Bar
        </motion.button>
      </div>
    )
  }

  const barHeight = commandBarExpanded ? 'h-[80px]' : 'h-[64px]'

  return (
    <div
      className="absolute bottom-3 left-0 z-20 flex justify-center pointer-events-none transition-[right] duration-300 ease-out"
      style={{ right: `${rightPanelWidth}px` }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="pointer-events-auto command-bar-glass rounded-[14px] w-fit max-w-[calc(100%-32px)]"
      >
        <div className={`flex items-center gap-1 ${barHeight} px-3 overflow-x-auto scrollbar-none transition-[height] duration-200`}>
          {/* Label */}
          <div className="flex flex-col items-center gap-0.5 shrink-0 px-2 min-w-[52px]">
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-content-tertiary">
              Deploy
            </span>
            <span className="text-[8px] text-content-tertiary/50 font-mono">
              1-9
            </span>
          </div>

          <div className="w-px h-8 bg-white/[0.06] shrink-0" />

          {/* Unified agent slots */}
          <AnimatePresence mode="popLayout">
            {unifiedAgents.map((agent, index) => {
              const hotkey = getHotkey(index)

              if (agent.type === 'default') {
                const isActive = placementMode && placementRole === agent.role
                return (
                  <motion.div
                    key={agent.key}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2, ease: EASE }}
                  >
                    {commandBarExpanded ? (
                      <ExpandedCommandBarSlot
                        role={agent.role}
                        hotkey={hotkey}
                        isActive={isActive}
                        onActivate={() => {
                          if (isActive) exitPlacementMode()
                          else enterPlacementMode(agent.role)
                        }}
                      />
                    ) : (
                      <CommandBarSlot
                        role={agent.role}
                        hotkey={hotkey}
                        isActive={isActive}
                        onActivate={() => {
                          if (isActive) exitPlacementMode()
                          else enterPlacementMode(agent.role)
                        }}
                      />
                    )}
                  </motion.div>
                )
              } else {
                const isActive = placementMode && placementTemplateId === agent.key
                return (
                  <motion.div
                    key={`custom:${agent.key}`}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2, ease: EASE }}
                  >
                    {commandBarExpanded ? (
                      <ExpandedCustomTemplateSlot
                        template={agent.template!}
                        hotkey={hotkey}
                        isActive={isActive}
                        onActivate={() => {
                          if (isActive) exitPlacementMode()
                          else enterPlacementModeCustom(agent.key)
                        }}
                      />
                    ) : (
                      <CustomTemplateSlot
                        template={agent.template!}
                        hotkey={hotkey}
                        isActive={isActive}
                        onActivate={() => {
                          if (isActive) exitPlacementMode()
                          else enterPlacementModeCustom(agent.key)
                        }}
                      />
                    )}
                  </motion.div>
                )
              }
            })}
          </AnimatePresence>

          {/* Manage button */}
          <Tooltip content="Manage agents">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={openAgentManager}
              className="flex items-center justify-center w-[42px] h-[42px] shrink-0 rounded-[9px] border border-white/[0.08] hover:border-accent/30 hover:bg-accent/5 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-content-tertiary">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            </motion.button>
          </Tooltip>

          {/* Collapse button */}
          <div className="w-px h-8 bg-white/[0.06] shrink-0" />
          <button
            onClick={togglePalette}
            className="shrink-0 p-2 rounded-lg text-content-tertiary hover:text-content-secondary hover:bg-white/[0.04] transition-colors"
            title="Hide command bar"
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="4 6 8 10 12 6" />
            </svg>
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Compact Slots (default view) ── */

function CommandBarSlot({
  role,
  hotkey,
  isActive,
  onActivate,
}: {
  role: AgentRole
  hotkey: string | null
  isActive: boolean
  onActivate: () => void
}) {
  const accent = ROLE_ACCENT[role]
  const meta = ROLE_META[role]
  const tagline = ROLE_TAGLINES[role] ?? 'Specialized role'

  return (
    <Tooltip content={`${meta.label}\n${tagline}${hotkey ? `\nPress ${hotkey} to deploy` : ''}`}>
      <motion.button
        whileHover={isActive ? {} : { scale: 1.08, y: -3 }}
        whileTap={{ scale: 0.95 }}
        onClick={onActivate}
        className={`relative flex flex-col items-center justify-center gap-0.5 w-[48px] h-[48px] shrink-0 rounded-[10px] border transition-all duration-200 ${
          isActive
            ? 'command-bar-slot-active'
            : 'border-white/[0.06] hover:border-white/[0.12]'
        }`}
        style={{
          borderColor: isActive ? `${accent}60` : undefined,
          background: isActive
            ? `linear-gradient(180deg, ${accent}18 0%, ${accent}08 100%)`
            : 'transparent',
          boxShadow: isActive ? `0 0 16px ${accent}20, inset 0 0 8px ${accent}10` : 'none',
          '--slot-accent': accent,
        } as React.CSSProperties}
      >
        {hotkey && (
          <div
            className="absolute -top-1 -left-0.5 w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-bold font-mono"
            style={{
              background: isActive ? accent : `${accent}25`,
              color: isActive ? 'white' : accent,
            }}
          >
            {hotkey}
          </div>
        )}
        <div style={{ color: accent }}>
          <RoleIcon role={role} size={18} />
        </div>
        <span
          className="text-[8px] font-bold tracking-wider uppercase"
          style={{ color: isActive ? accent : `${accent}90` }}
        >
          {meta.abbr}
        </span>
      </motion.button>
    </Tooltip>
  )
}

function CustomTemplateSlot({
  template,
  hotkey,
  isActive,
  onActivate,
}: {
  template: CustomAgentTemplate
  hotkey: string | null
  isActive: boolean
  onActivate: () => void
}) {
  const accent = ROLE_ACCENT[template.role] || ROLE_ACCENT.custom

  return (
    <Tooltip content={`${template.name}${hotkey ? `\nPress ${hotkey} to deploy` : '\nClick to deploy'}`}>
      <motion.button
        whileHover={isActive ? {} : { scale: 1.08, y: -3 }}
        whileTap={{ scale: 0.95 }}
        onClick={onActivate}
        className={`relative flex flex-col items-center justify-center gap-0.5 w-[48px] h-[48px] shrink-0 rounded-[10px] border transition-all duration-200 ${
          isActive
            ? 'command-bar-slot-active'
            : 'border-white/[0.06] hover:border-white/[0.12]'
        }`}
        style={{
          borderColor: isActive ? `${accent}60` : undefined,
          background: isActive
            ? `linear-gradient(180deg, ${accent}18 0%, ${accent}08 100%)`
            : 'transparent',
          boxShadow: isActive ? `0 0 16px ${accent}20, inset 0 0 8px ${accent}10` : 'none',
        }}
      >
        {hotkey && (
          <div
            className="absolute -top-1 -left-0.5 w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-bold font-mono"
            style={{
              background: isActive ? accent : `${accent}25`,
              color: isActive ? 'white' : accent,
            }}
          >
            {hotkey}
          </div>
        )}
        <div className="absolute -top-0.5 -right-0.5">
          <svg width="6" height="8" viewBox="0 0 6 8" fill={accent} opacity="0.5">
            <path d="M0 0h6v8L3 6 0 8V0z" />
          </svg>
        </div>
        <div style={{ color: accent }}>
          <RoleIcon role={template.role} size={16} />
        </div>
        <span className="text-[7px] font-semibold text-content-tertiary truncate max-w-[40px] leading-none">
          {template.name.split(' ')[0]}
        </span>
      </motion.button>
    </Tooltip>
  )
}

/* ── Expanded Slots (expanded view) ── */

function ExpandedCommandBarSlot({
  role,
  hotkey,
  isActive,
  onActivate,
}: {
  role: AgentRole
  hotkey: string | null
  isActive: boolean
  onActivate: () => void
}) {
  const accent = ROLE_ACCENT[role]
  const meta = ROLE_META[role]
  const tagline = ROLE_TAGLINES[role] ?? 'Specialized role'

  return (
    <Tooltip content={`${tagline}${hotkey ? `\nPress ${hotkey} to deploy` : ''}`}>
      <motion.button
        whileHover={isActive ? {} : { scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.96 }}
        onClick={onActivate}
        className={`relative flex flex-col items-center justify-center gap-1 w-[88px] h-[60px] shrink-0 rounded-[10px] border transition-all duration-200 ${
          isActive
            ? 'command-bar-slot-active'
            : 'border-white/[0.06] hover:border-white/[0.12]'
        }`}
        style={{
          borderColor: isActive ? `${accent}60` : undefined,
          background: isActive
            ? `linear-gradient(180deg, ${accent}18 0%, ${accent}08 100%)`
            : 'transparent',
          boxShadow: isActive ? `0 0 16px ${accent}20, inset 0 0 8px ${accent}10` : 'none',
          '--slot-accent': accent,
        } as React.CSSProperties}
      >
        {hotkey && (
          <div
            className="absolute -top-1 -left-0.5 w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-bold font-mono"
            style={{
              background: isActive ? accent : `${accent}25`,
              color: isActive ? 'white' : accent,
            }}
          >
            {hotkey}
          </div>
        )}
        <div style={{ color: accent }}>
          <RoleIcon role={role} size={18} />
        </div>
        <span
          className="text-[9px] font-semibold leading-none truncate max-w-[76px]"
          style={{ color: isActive ? accent : `${accent}90` }}
        >
          {meta.label}
        </span>
      </motion.button>
    </Tooltip>
  )
}

function ExpandedCustomTemplateSlot({
  template,
  hotkey,
  isActive,
  onActivate,
}: {
  template: CustomAgentTemplate
  hotkey: string | null
  isActive: boolean
  onActivate: () => void
}) {
  const accent = ROLE_ACCENT[template.role] || ROLE_ACCENT.custom

  return (
    <Tooltip content={`${template.name}${hotkey ? `\nPress ${hotkey} to deploy` : '\nClick to deploy'}`}>
      <motion.button
        whileHover={isActive ? {} : { scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.96 }}
        onClick={onActivate}
        className={`relative flex flex-col items-center justify-center gap-1 w-[88px] h-[60px] shrink-0 rounded-[10px] border transition-all duration-200 ${
          isActive
            ? 'command-bar-slot-active'
            : 'border-white/[0.06] hover:border-white/[0.12]'
        }`}
        style={{
          borderColor: isActive ? `${accent}60` : undefined,
          background: isActive
            ? `linear-gradient(180deg, ${accent}18 0%, ${accent}08 100%)`
            : 'transparent',
          boxShadow: isActive ? `0 0 16px ${accent}20, inset 0 0 8px ${accent}10` : 'none',
        }}
      >
        {hotkey && (
          <div
            className="absolute -top-1 -left-0.5 w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-bold font-mono"
            style={{
              background: isActive ? accent : `${accent}25`,
              color: isActive ? 'white' : accent,
            }}
          >
            {hotkey}
          </div>
        )}
        <div className="absolute -top-0.5 -right-0.5">
          <svg width="6" height="8" viewBox="0 0 6 8" fill={accent} opacity="0.5">
            <path d="M0 0h6v8L3 6 0 8V0z" />
          </svg>
        </div>
        <div style={{ color: accent }}>
          <RoleIcon role={template.role} size={16} />
        </div>
        <span
          className="text-[8px] font-semibold text-content-tertiary truncate max-w-[72px] leading-none"
        >
          {template.name}
        </span>
      </motion.button>
    </Tooltip>
  )
}
