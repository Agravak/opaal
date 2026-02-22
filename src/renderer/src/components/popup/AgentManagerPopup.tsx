import { useCallback, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { useUIStore } from '../../stores/ui-store'
import { useWorkflowStore } from '../../stores/workflow-store'
import { useCustomAgentsStore, getUnifiedAllAgents } from '../../stores/custom-agents-store'
import { useToastStore } from '../../stores/toast-store'
import { ALL_AGENT_ROLES, ROLE_META, ROLE_ACCENT, ROLE_TAGLINES, categorizeSkill, getSkillAccentColor } from '../../types/workflow'
import type { AgentRole } from '../../types/workflow'
import type { CustomAgentTemplate } from '../../types/custom-agent'
import { RoleIcon } from '../shared/RoleIcon'
import { SkillIcon } from '../nodes/SkillIcon'
import { DestructiveConfirmModal } from '../shared/DestructiveConfirmModal'

const DISPLAY_ROLES = ALL_AGENT_ROLES.filter((r) => r !== 'custom')

export function AgentManagerPopup() {
  const isOpen = useUIStore((s) => s.agentManagerOpen)
  const closeAgentManager = useUIStore((s) => s.closeAgentManager)
  const templates = useCustomAgentsStore((s) => s.templates)
  const removeTemplate = useCustomAgentsStore((s) => s.removeTemplate)
  const hiddenDefaultRoles = useCustomAgentsStore((s) => s.hiddenDefaultRoles)
  const hideDefaultRole = useCustomAgentsStore((s) => s.hideDefaultRole)
  const unhideDefaultRole = useCustomAgentsStore((s) => s.unhideDefaultRole)
  const resetDefaultRoles = useCustomAgentsStore((s) => s.resetDefaultRoles)
  const unifiedOrder = useCustomAgentsStore((s) => s.unifiedOrder)
  const setUnifiedOrder = useCustomAgentsStore((s) => s.setUnifiedOrder)
  const addAgent = useWorkflowStore((s) => s.addAgent)
  const addAgentFromTemplate = useWorkflowStore((s) => s.addAgentFromTemplate)
  const addColumn = useWorkflowStore((s) => s.addColumn)
  const workflow = useWorkflowStore((s) => s.workflow)

  const [deleteTarget, setDeleteTarget] = useState<CustomAgentTemplate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const reorderTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const isDeletingRef = useRef(false)

  // Build unified agent list
  const unifiedItems = useMemo(
    () => getUnifiedAllAgents(unifiedOrder, templates, hiddenDefaultRoles),
    [unifiedOrder, templates, hiddenDefaultRoles]
  )

  // Build string keys for Reorder.Group (stable identity)
  const unifiedKeys = useMemo(
    () => unifiedItems.map((item) => (item.type === 'custom' ? `custom:${item.key}` : item.key)),
    [unifiedItems]
  )

  const handleUnifiedReorder = useCallback(
    (newKeys: string[]) => {
      if (isDeletingRef.current) return
      setUnifiedOrder(newKeys)

      if (reorderTimeoutRef.current) clearTimeout(reorderTimeoutRef.current)
      reorderTimeoutRef.current = setTimeout(() => {
        useToastStore.getState().addToast({
          variant: 'info',
          message: 'Agent order updated',
        })
      }, 800)
    },
    [setUnifiedOrder]
  )

  const handleAddToCanvas = useCallback(
    (template: CustomAgentTemplate) => {
      let columnId: string
      if (workflow.columns.length === 0) {
        columnId = addColumn()
      } else {
        columnId = workflow.columns[workflow.columns.length - 1].id
      }
      addAgentFromTemplate(columnId, template)
      useToastStore.getState().addToast({
        variant: 'success',
        message: `Added "${template.name}" to canvas`,
      })
    },
    [workflow.columns, addColumn, addAgentFromTemplate]
  )

  const handleAddDefaultToCanvas = useCallback(
    (role: AgentRole) => {
      let columnId: string
      if (workflow.columns.length === 0) {
        columnId = addColumn()
      } else {
        columnId = workflow.columns[workflow.columns.length - 1].id
      }
      addAgent(columnId, role)
      useToastStore.getState().addToast({
        variant: 'success',
        message: `Added "${ROLE_META[role].label}" to canvas`,
      })
    },
    [workflow.columns, addColumn, addAgent]
  )

  const handleToggleDefaultVisibility = useCallback(
    (role: AgentRole) => {
      const label = ROLE_META[role]?.label ?? role
      if (hiddenDefaultRoles.includes(role)) {
        unhideDefaultRole(role)
        useToastStore.getState().addToast({
          variant: 'info',
          message: `Showing "${label}" in toolbar`,
        })
      } else {
        hideDefaultRole(role)
        useToastStore.getState().addToast({
          variant: 'info',
          message: `Hidden "${label}" from toolbar`,
        })
      }
    },
    [hiddenDefaultRoles, hideDefaultRole, unhideDefaultRole]
  )

  const handleResetDefaults = useCallback(async () => {
    await resetDefaultRoles()
    useToastStore.getState().addToast({
      variant: 'info',
      message: 'Default agents restored',
    })
  }, [resetDefaultRoles])

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    isDeletingRef.current = true
    setIsDeleting(true)
    await removeTemplate(deleteTarget.id)
    useToastStore.getState().addToast({
      variant: 'info',
      message: `Deleted "${deleteTarget.name}"`,
    })
    setDeleteTarget(null)
    setIsDeleting(false)
    requestAnimationFrame(() => {
      isDeletingRef.current = false
    })
  }, [deleteTarget, removeTemplate])

  const visibleDefaultCount = DISPLAY_ROLES.length - hiddenDefaultRoles.filter((r) => r !== 'custom').length

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop — no click-to-close */}
            <motion.div
              key="manager-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[6px] flex items-center justify-center"
            >
              {/* Panel */}
              <motion.div
                key="manager-panel"
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 6 }}
                transition={{
                  type: 'spring',
                  stiffness: 380,
                  damping: 28,
                  mass: 0.8,
                }}
                className="w-[560px] max-h-[85vh] rounded-2xl
                  bg-surface-elevated border border-border-subtle shadow-elevated
                  overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="relative px-6 pt-5 pb-4 shrink-0 border-b border-border-subtle">
                  <div
                    className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                    style={{
                      background: 'linear-gradient(90deg, #6366f1, #6366f140)',
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent/10 border border-accent/20 text-accent">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
                      </div>
                      <div>
                        <h2 className="text-[15px] font-bold text-content-primary tracking-tight">
                          Agent Manager
                        </h2>
                        <span className="text-[11px] text-content-tertiary">
                          {visibleDefaultCount} visible · {templates.length} saved · drag to reorder
                        </span>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={closeAgentManager}
                      className="w-8 h-8 rounded-lg flex items-center justify-center
                        text-content-tertiary hover:text-content-primary
                        hover:bg-surface-tertiary transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="4" y1="4" x2="12" y2="12" />
                        <line x1="12" y1="4" x2="4" y2="12" />
                      </svg>
                    </motion.button>
                  </div>
                </div>

                {/* Body — single unified Reorder.Group */}
                <div className="flex-1 overflow-y-auto min-h-0 py-3">
                  <Reorder.Group
                    axis="y"
                    values={unifiedKeys}
                    onReorder={handleUnifiedReorder}
                    className="space-y-1 px-3"
                    as="div"
                  >
                    {unifiedKeys.map((key) => {
                      const item = unifiedItems.find((i) =>
                        i.type === 'custom' ? `custom:${i.key}` === key : i.key === key
                      )
                      if (!item) return null

                      return (
                        <Reorder.Item
                          key={key}
                          value={key}
                          as="div"
                          className="list-none"
                          whileDrag={{
                            scale: 1.02,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px rgba(99,102,241,0.3)',
                            zIndex: 50,
                          }}
                        >
                          {item.type === 'default' ? (
                            <DefaultAgentCard
                              role={item.role}
                              isHidden={item.isHidden}
                              onToggleVisibility={() => handleToggleDefaultVisibility(item.role)}
                              onAddToCanvas={() => handleAddDefaultToCanvas(item.role)}
                            />
                          ) : (
                            <AgentTemplateCard
                              template={item.template!}
                              onAddToCanvas={() => handleAddToCanvas(item.template!)}
                              onDelete={() => setDeleteTarget(item.template!)}
                            />
                          )}
                        </Reorder.Item>
                      )
                    })}
                  </Reorder.Group>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-border-subtle shrink-0 flex items-center justify-between">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleResetDefaults}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-[11px] font-medium
                      text-content-tertiary hover:text-content-secondary hover:bg-surface-tertiary
                      border border-transparent hover:border-border-subtle transition-all duration-150"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    Reset Defaults
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={closeAgentManager}
                    className="px-4 py-1.5 rounded-button text-[11px] font-medium
                      bg-accent text-white hover:bg-accent-hover transition-colors"
                  >
                    Done
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <DestructiveConfirmModal
        open={!!deleteTarget}
        title="Delete Saved Agent"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={isDeleting}
      />
    </>
  )
}

function DefaultAgentCard({
  role,
  isHidden,
  onToggleVisibility,
  onAddToCanvas,
}: {
  role: AgentRole
  isHidden?: boolean
  onToggleVisibility: () => void
  onAddToCanvas: () => void
}) {
  const accent = ROLE_ACCENT[role]
  const roleMeta = ROLE_META[role]
  const tagline = ROLE_TAGLINES[role] ?? 'Specialized role'

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border-subtle
        hover:border-border-default hover:bg-surface-tertiary/40 transition-all duration-150 group
        ${isHidden ? 'opacity-40' : ''}`}
    >
      {/* Drag handle */}
      <div className="flex items-center justify-center w-5 shrink-0 cursor-grab active:cursor-grabbing text-content-tertiary/30 group-hover:text-content-tertiary/60 transition-colors">
        <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
          <circle cx="2" cy="2" r="1.2" />
          <circle cx="6" cy="2" r="1.2" />
          <circle cx="2" cy="7" r="1.2" />
          <circle cx="6" cy="7" r="1.2" />
          <circle cx="2" cy="12" r="1.2" />
          <circle cx="6" cy="12" r="1.2" />
        </svg>
      </div>

      {/* Role icon */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: `${accent}12`,
          border: `1px solid ${accent}25`,
          color: accent,
        }}
      >
        <RoleIcon role={role} size={16} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[12px] font-semibold text-content-primary truncate ${isHidden ? 'line-through decoration-content-tertiary' : ''}`}>
            {roleMeta.label}
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0"
            style={{
              background: `${accent}12`,
              color: accent,
            }}
          >
            {roleMeta.abbr}
          </span>
          {isHidden && (
            <span className="text-[9px] font-medium text-content-tertiary bg-surface-tertiary px-1.5 py-0.5 rounded shrink-0">
              Hidden
            </span>
          )}
        </div>
        <p className="text-[10px] text-content-tertiary truncate mt-0.5">{tagline}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isHidden && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); onAddToCanvas() }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-button text-[10px] font-medium
              bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="8" y1="3" x2="8" y2="13" />
              <line x1="3" y1="8" x2="13" y2="8" />
            </svg>
            Add
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); onToggleVisibility() }}
          className={`w-7 h-7 rounded-button flex items-center justify-center transition-colors
            ${isHidden
              ? 'text-content-tertiary hover:text-accent hover:bg-accent/8'
              : 'text-content-tertiary hover:text-amber-400 hover:bg-amber-500/8'
            }`}
          title={isHidden ? 'Show in toolbar' : 'Hide from toolbar'}
        >
          {isHidden ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          )}
        </motion.button>
      </div>
    </div>
  )
}

function AgentTemplateCard({
  template,
  onAddToCanvas,
  onDelete,
}: {
  template: CustomAgentTemplate
  onAddToCanvas: () => void
  onDelete: () => void
}) {
  const role = template.role as AgentRole
  const accent = ROLE_ACCENT[role] || ROLE_ACCENT.custom
  const roleMeta = ROLE_META[role] || ROLE_META.custom

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border-subtle
        hover:border-border-default hover:bg-surface-tertiary/40 transition-all duration-150 group"
    >
      {/* Drag handle */}
      <div className="flex items-center justify-center w-5 shrink-0 cursor-grab active:cursor-grabbing text-content-tertiary/30 group-hover:text-content-tertiary/60 transition-colors">
        <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
          <circle cx="2" cy="2" r="1.2" />
          <circle cx="6" cy="2" r="1.2" />
          <circle cx="2" cy="7" r="1.2" />
          <circle cx="6" cy="7" r="1.2" />
          <circle cx="2" cy="12" r="1.2" />
          <circle cx="6" cy="12" r="1.2" />
        </svg>
      </div>

      {/* Role icon */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: `${accent}12`,
          border: `1px solid ${accent}25`,
          color: accent,
        }}
      >
        <RoleIcon role={role} size={16} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-content-primary truncate">
            {template.name}
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0"
            style={{
              background: `${accent}12`,
              color: accent,
            }}
          >
            {roleMeta.abbr}
          </span>
          {/* Bookmark badge to distinguish from defaults */}
          <svg width="8" height="10" viewBox="0 0 8 10" fill={accent} opacity="0.5" className="shrink-0">
            <path d="M0 0h8v10L4 7.5 0 10V0z" />
          </svg>
        </div>

        {template.roleDescription && (
          <p className="text-[10.5px] text-content-tertiary truncate mt-0.5">
            {template.roleDescription}
          </p>
        )}

        {template.skills.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            {template.skills.slice(0, 4).map((skill) => {
              const category = categorizeSkill(skill.name)
              const skillAccent = getSkillAccentColor(skill.name)
              return (
                <span
                  key={skill.id}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium border"
                  style={{
                    background: `${skillAccent}10`,
                    color: skillAccent,
                    borderColor: `${skillAccent}20`,
                  }}
                >
                  <SkillIcon skillName={skill.name} category={category} size={8} />
                  {skill.name}
                </span>
              )
            })}
            {template.skills.length > 4 && (
              <span className="text-[9px] text-content-tertiary">
                +{template.skills.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => { e.stopPropagation(); onAddToCanvas() }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-button text-[10px] font-medium
            bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          Add
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="w-7 h-7 rounded-button flex items-center justify-center
            text-content-tertiary hover:text-red-400 hover:bg-red-500/8 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </motion.button>
      </div>
    </div>
  )
}
