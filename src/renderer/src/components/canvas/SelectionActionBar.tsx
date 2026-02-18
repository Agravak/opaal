import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../stores/ui-store'
import { useWorkflowStore } from '../../stores/workflow-store'

export function SelectionActionBar() {
  const selectedNodeIds = useUIStore((s) => s.selectedNodeIds)
  const clearSelection = useUIStore((s) => s.clearSelection)
  const selectNodes = useUIStore((s) => s.selectNodes)
  const selectedCount = selectedNodeIds.size

  const removeAgent = useWorkflowStore((s) => s.removeAgent)
  const copyAgents = useWorkflowStore((s) => s.copyAgents)
  const duplicateAgents = useWorkflowStore((s) => s.duplicateAgents)
  const moveAgentToColumn = useWorkflowStore((s) => s.moveAgentToColumn)
  const addSkillToAgent = useWorkflowStore((s) => s.addSkillToAgent)
  const columns = useWorkflowStore((s) => s.workflow.columns)

  const handleCopy = useCallback(() => {
    copyAgents(Array.from(selectedNodeIds))
  }, [selectedNodeIds, copyAgents])

  const handleDuplicate = useCallback(() => {
    const ids = Array.from(selectedNodeIds)
    const newIds = duplicateAgents(ids)
    selectNodes(newIds)
  }, [selectedNodeIds, duplicateAgents, selectNodes])

  const handleDelete = useCallback(() => {
    Array.from(selectedNodeIds).forEach(id => removeAgent(id))
    clearSelection()
  }, [selectedNodeIds, removeAgent, clearSelection])

  const handleMoveToColumn = useCallback((columnId: string) => {
    Array.from(selectedNodeIds).forEach(id => moveAgentToColumn(id, columnId))
  }, [selectedNodeIds, moveAgentToColumn])

  if (selectedCount <= 1) return null

  return (
    <AnimatePresence>
      <motion.div
        key="selection-action-bar"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-elevated/95 backdrop-blur-md border border-border-subtle shadow-elevated"
      >
        {/* Selection count badge */}
        <span className="text-[11px] font-bold text-accent tabular-nums mr-1.5">
          {selectedCount} agents
        </span>

        <div className="w-px h-5 bg-border-subtle" />

        {/* Copy */}
        <ActionButton
          label="Copy"
          shortcut="Ctrl+C"
          onClick={handleCopy}
          icon={
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="5" width="9" height="9" rx="1.5" />
              <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" />
            </svg>
          }
        />

        {/* Duplicate */}
        <ActionButton
          label="Duplicate"
          shortcut="Ctrl+D"
          onClick={handleDuplicate}
          icon={
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="10" height="10" rx="1.5" />
              <line x1="8" y1="6" x2="8" y2="10" />
              <line x1="6" y1="8" x2="10" y2="8" />
            </svg>
          }
        />

        {/* Delete */}
        <ActionButton
          label="Delete"
          shortcut="Del"
          onClick={handleDelete}
          icon={
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4h12M5.3 4V2.7a.7.7 0 01.7-.7h4a.7.7 0 01.7.7V4M6.7 7.3v4M9.3 7.3v4" />
              <path d="M3.3 4l.7 9.3a1.3 1.3 0 001.3 1.3h5.4a1.3 1.3 0 001.3-1.3L12.7 4" />
            </svg>
          }
          danger
        />

        {/* Move to column dropdown */}
        {columns.length > 1 && (
          <>
            <div className="w-px h-5 bg-border-subtle" />
            <div className="relative group">
              <button
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10.5px] font-medium text-content-secondary hover:text-content-primary hover:bg-surface-tertiary transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 8h8M8 4l4 4-4 4" />
                </svg>
                Move to
              </button>
              <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block">
                <div className="py-1 rounded-lg bg-surface-elevated/95 backdrop-blur-md border border-border-subtle shadow-elevated min-w-[120px]">
                  {columns.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => handleMoveToColumn(col.id)}
                      className="w-full px-3 py-1.5 text-left text-[11px] text-content-secondary hover:text-content-primary hover:bg-surface-tertiary transition-colors"
                    >
                      {col.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

function ActionButton({ label, shortcut, onClick, icon, danger }: {
  label: string
  shortcut: string
  onClick: () => void
  icon: JSX.Element
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={`${label} (${shortcut})`}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10.5px] font-medium transition-all ${
        danger
          ? 'text-red-400/70 hover:text-red-400 hover:bg-red-500/10'
          : 'text-content-secondary hover:text-content-primary hover:bg-surface-tertiary'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
