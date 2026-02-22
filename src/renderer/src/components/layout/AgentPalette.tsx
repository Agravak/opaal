import { useCallback, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useWorkflowStore } from '../../stores/workflow-store'
import { useUIStore } from '../../stores/ui-store'
import { useCustomAgentsStore, getUnifiedVisibleAgents } from '../../stores/custom-agents-store'
import { ROLE_META, ROLE_ACCENT, ROLE_TAGLINES, type AgentRole } from '../../types/workflow'
import type { CustomAgentTemplate } from '../../types/custom-agent'
import { RoleIcon } from '../shared/RoleIcon'

function getTagline(role: AgentRole): string {
  return ROLE_TAGLINES[role] ?? 'Specialized role'
}

export function AgentPalette() {
  const { addAgent, addAgentFromTemplate, addColumn, workflow } = useWorkflowStore()
  const paletteCollapsed = useUIStore((s) => s.paletteCollapsed)
  const togglePalette = useUIStore((s) => s.togglePalette)
  const openAgentManager = useUIStore((s) => s.openAgentManager)
  const templates = useCustomAgentsStore((s) => s.templates)
  const loaded = useCustomAgentsStore((s) => s.loaded)
  const loadCustomAgents = useCustomAgentsStore((s) => s.loadCustomAgents)
  const hiddenDefaultRoles = useCustomAgentsStore((s) => s.hiddenDefaultRoles)
  const unifiedOrder = useCustomAgentsStore((s) => s.unifiedOrder)

  useEffect(() => {
    if (!loaded) {
      loadCustomAgents()
    }
  }, [loaded, loadCustomAgents])

  const unifiedAgents = useMemo(
    () => getUnifiedVisibleAgents(unifiedOrder, templates, hiddenDefaultRoles),
    [unifiedOrder, templates, hiddenDefaultRoles]
  )

  const handleAddAgent = useCallback(
    (role: AgentRole) => {
      let columnId: string
      if (workflow.columns.length === 0) {
        columnId = addColumn()
      } else {
        columnId = workflow.columns[workflow.columns.length - 1].id
      }
      addAgent(columnId, role)
    },
    [workflow.columns, addColumn, addAgent]
  )

  const handleAddCustomAgent = useCallback(
    (template: CustomAgentTemplate) => {
      let columnId: string
      if (workflow.columns.length === 0) {
        columnId = addColumn()
      } else {
        columnId = workflow.columns[workflow.columns.length - 1].id
      }
      addAgentFromTemplate(columnId, template)
    },
    [workflow.columns, addColumn, addAgentFromTemplate]
  )

  const handleDragStart = useCallback(
    (e: React.DragEvent, role: AgentRole) => {
      e.dataTransfer.setData('application/opaal-role', role)
      e.dataTransfer.effectAllowed = 'copy'

      const ghost = document.createElement('div')
      const accent = ROLE_ACCENT[role]
      ghost.innerHTML = `<div style="
        display: flex; align-items: center; gap: 8px;
        padding: 8px 14px; border-radius: 10px;
        background: ${accent}; color: white;
        font-family: DM Sans, sans-serif; font-size: 12px; font-weight: 600;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        white-space: nowrap;
      ">${ROLE_META[role].label} Agent</div>`
      ghost.style.position = 'fixed'
      ghost.style.top = '-1000px'
      document.body.appendChild(ghost)
      e.dataTransfer.setDragImage(ghost.firstElementChild!, 0, 0)
      requestAnimationFrame(() => document.body.removeChild(ghost))
    },
    []
  )

  const handleCustomDragStart = useCallback(
    (e: React.DragEvent, template: CustomAgentTemplate) => {
      e.dataTransfer.setData('application/opaal-custom-template', template.id)
      e.dataTransfer.effectAllowed = 'copy'

      const accent = ROLE_ACCENT[template.role] || ROLE_ACCENT.custom
      const ghost = document.createElement('div')
      ghost.innerHTML = `<div style="
        display: flex; align-items: center; gap: 8px;
        padding: 8px 14px; border-radius: 10px;
        background: ${accent}; color: white;
        font-family: DM Sans, sans-serif; font-size: 12px; font-weight: 600;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        white-space: nowrap;
      ">${template.name}</div>`
      ghost.style.position = 'fixed'
      ghost.style.top = '-1000px'
      document.body.appendChild(ghost)
      e.dataTransfer.setDragImage(ghost.firstElementChild!, 0, 0)
      requestAnimationFrame(() => document.body.removeChild(ghost))
    },
    []
  )

  if (paletteCollapsed) {
    return (
      <div className="flex items-center h-7 px-4 bg-surface-secondary/80 backdrop-blur-sm border-b border-border-subtle">
        <button
          onClick={togglePalette}
          className="flex items-center gap-1.5 text-[10px] text-content-tertiary hover:text-content-secondary transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="4 6 8 10 12 6" />
          </svg>
          Show agents
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 h-[72px] px-5 bg-surface-secondary/80 backdrop-blur-sm border-b border-border-subtle overflow-hidden">
      <div className="flex flex-col gap-0.5 shrink-0 mr-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-content-tertiary">
          Agents
        </span>
        <span className="text-[9px] text-content-tertiary/50">
          Drag or click
        </span>
      </div>

      <div className="w-px h-8 bg-border-subtle shrink-0" />

      <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto px-2 py-1">
        {/* Unified agent cards */}
        {unifiedAgents.map((agent) => {
          if (agent.type === 'default') {
            const meta = ROLE_META[agent.role]
            const accent = ROLE_ACCENT[agent.role]
            const tagline = getTagline(agent.role)

            return (
              <motion.button
                key={agent.key}
                whileHover={{ scale: 1.06, y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAddAgent(agent.role)}
                draggable
                onDragStart={(e) =>
                  handleDragStart(e as unknown as React.DragEvent, agent.role)
                }
                className="relative flex flex-col items-center gap-1 px-3 py-2.5 rounded-[10px] border border-border-subtle hover:border-border-default hover:shadow-card-hover cursor-grab active:cursor-grabbing transition-all duration-200 group shrink-0 min-w-[164px] w-[164px] overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, var(--color-surface-elevated) 0%, ${accent}06 100%)`,
                }}
                title={`Click to add ${meta.label}, or drag onto canvas`}
              >
                <div
                  className="absolute top-0 left-3 right-3 h-[2px] rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                  style={{ background: accent }}
                />

                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${accent}12`, color: accent }}
                >
                  <RoleIcon role={agent.role} size={14} />
                </div>

                <span className="text-[11px] font-semibold text-content-secondary group-hover:text-content-primary transition-colors">
                  {meta.label}
                </span>

                <span className="text-[9px] text-content-tertiary opacity-0 group-hover:opacity-70 transition-all duration-200 max-h-0 group-hover:max-h-5 overflow-hidden leading-tight whitespace-nowrap">
                  {tagline}
                </span>
              </motion.button>
            )
          } else {
            const template = agent.template!
            const accent = ROLE_ACCENT[template.role] || ROLE_ACCENT.custom
            const roleMeta = ROLE_META[template.role] || ROLE_META.custom

            return (
              <motion.button
                key={`custom:${agent.key}`}
                whileHover={{ scale: 1.06, y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAddCustomAgent(template)}
                draggable
                onDragStart={(e) =>
                  handleCustomDragStart(e as unknown as React.DragEvent, template)
                }
                className="relative flex flex-col items-center gap-1 px-3 py-2.5 rounded-[10px] border border-border-subtle hover:border-border-default hover:shadow-card-hover cursor-grab active:cursor-grabbing transition-all duration-200 group shrink-0 min-w-[164px] w-[164px] overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, var(--color-surface-elevated) 0%, ${accent}06 100%)`,
                }}
                title={`Click to add "${template.name}", or drag onto canvas`}
              >
                <div
                  className="absolute top-0 left-3 right-3 h-[2px] rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                  style={{ background: accent }}
                />

                {/* Bookmark indicator */}
                <div className="absolute top-1 right-2">
                  <svg width="8" height="10" viewBox="0 0 8 10" fill={accent} opacity="0.5" className="group-hover:opacity-80 transition-opacity">
                    <path d="M0 0h8v10L4 7.5 0 10V0z" />
                  </svg>
                </div>

                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${accent}12`, color: accent }}
                >
                  <RoleIcon role={template.role} size={14} />
                </div>

                <span className="text-[11px] font-semibold text-content-secondary group-hover:text-content-primary transition-colors truncate max-w-full px-1">
                  {template.name}
                </span>

                <span className="text-[9px] text-content-tertiary opacity-0 group-hover:opacity-70 transition-all duration-200 max-h-0 group-hover:max-h-5 overflow-hidden leading-tight whitespace-nowrap">
                  {roleMeta.abbr} · {template.skills.length} skill{template.skills.length !== 1 ? 's' : ''}
                </span>
              </motion.button>
            )
          }
        })}

        {/* Manage button */}
        <motion.button
          whileHover={{ scale: 1.06, y: -3 }}
          whileTap={{ scale: 0.95 }}
          onClick={openAgentManager}
          className="relative flex flex-col items-center justify-center gap-1 px-3 py-2.5 rounded-[10px] border border-border-subtle hover:border-accent/30 hover:bg-accent/5 transition-all duration-200 group shrink-0 min-w-[80px] h-[56px]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-content-tertiary group-hover:text-accent transition-colors">
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
          <span className="text-[9px] font-medium text-content-tertiary group-hover:text-accent transition-colors whitespace-nowrap">
            Manage
          </span>
        </motion.button>
      </div>

      <button
        onClick={togglePalette}
        className="shrink-0 p-1.5 rounded-lg text-content-tertiary hover:text-content-secondary hover:bg-surface-tertiary transition-colors"
        title="Hide agent palette"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="4 10 8 6 12 10" />
        </svg>
      </button>
    </div>
  )
}
