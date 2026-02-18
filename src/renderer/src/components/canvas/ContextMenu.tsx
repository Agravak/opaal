import { useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../stores/ui-store'
import { useWorkflowStore } from '../../stores/workflow-store'
import type { AgentRole, ConnectionFlowType } from '../../types/workflow'
import { getFlowType, FLOW_TYPE_META } from '../../types/workflow'

export function ContextMenu() {
  const contextMenu = useUIStore((s) => s.contextMenu)
  const closeContextMenu = useUIStore((s) => s.closeContextMenu)
  const selectNode = useUIStore((s) => s.selectNode)
  const selectedNodeIds = useUIStore((s) => s.selectedNodeIds)
  const selectedEdgeIds = useUIStore((s) => s.selectedEdgeIds)
  const selectNodes = useUIStore((s) => s.selectNodes)
  const clearSelection = useUIStore((s) => s.clearSelection)

  const removeAgent = useWorkflowStore((s) => s.removeAgent)
  const removeConnection = useWorkflowStore((s) => s.removeConnection)
  const updateConnection = useWorkflowStore((s) => s.updateConnection)
  const connections = useWorkflowStore((s) => s.workflow.connections)
  const openConnectionConfig = useUIStore((s) => s.openConnectionConfigPopup)
  const copyAgents = useWorkflowStore((s) => s.copyAgents)
  const pasteAgents = useWorkflowStore((s) => s.pasteAgents)
  const duplicateAgents = useWorkflowStore((s) => s.duplicateAgents)
  const addColumn = useWorkflowStore((s) => s.addColumn)
  const addAgent = useWorkflowStore((s) => s.addAgent)
  const moveAgentToColumn = useWorkflowStore((s) => s.moveAgentToColumn)
  const clipboard = useWorkflowStore((s) => s.clipboard)
  const columns = useWorkflowStore((s) => s.workflow.columns)

  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!contextMenu) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu()
    }
    window.addEventListener('mousedown', handleClick)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handleClick)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [contextMenu, closeContextMenu])

  const handleAction = useCallback((action: () => void) => {
    action()
    closeContextMenu()
  }, [closeContextMenu])

  if (!contextMenu) return null

  const isNodeContext = contextMenu.nodeId !== null
  const isEdgeContext = contextMenu.edgeId !== null
  const selectedCount = selectedNodeIds.size
  const selectedEdgeCount = selectedEdgeIds.size

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="fixed z-50 min-w-[180px] py-1.5 rounded-[10px] bg-surface-elevated/95 backdrop-blur-md border border-border-subtle shadow-elevated"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        {isEdgeContext ? (
          <>
            {selectedEdgeCount <= 1 && (
              <>
                <MenuItem
                  label="Configure Connection"
                  shortcut=""
                  onClick={() => handleAction(() => {
                    if (contextMenu.edgeId) openConnectionConfig(contextMenu.edgeId)
                  })}
                  icon={
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="8" cy="8" r="2" />
                      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
                    </svg>
                  }
                />
                <Divider />
                <div className="px-2 py-1">
                  <span className="text-[9.5px] font-semibold uppercase tracking-wider text-content-tertiary">
                    Flow Type
                  </span>
                </div>
                {(['always', 'conditional', 'approval-gate', 'loop'] as ConnectionFlowType[]).map(flowType => {
                  const conn = contextMenu.edgeId ? connections.find(c => c.id === contextMenu.edgeId) : null
                  const currentFlow = conn ? getFlowType(conn) : 'always'
                  const meta = FLOW_TYPE_META[flowType]
                  const isActive = currentFlow === flowType
                  return (
                    <MenuItem
                      key={flowType}
                      label={`${isActive ? '● ' : ''}${meta.label}`}
                      shortcut=""
                      onClick={() => handleAction(() => {
                        if (contextMenu.edgeId) {
                          updateConnection(contextMenu.edgeId, {
                            flowType: flowType === 'always' ? undefined : flowType,
                            ...(flowType === 'loop' ? { maxIterations: 3 } : {}),
                          })
                        }
                      })}
                    />
                  )
                })}
                <Divider />
              </>
            )}
            <MenuItem
              label={selectedEdgeCount > 1 ? `Delete ${selectedEdgeCount} connectors` : 'Delete Connector'}
              shortcut="Del"
              onClick={() => handleAction(() => {
                const edgeIds = selectedEdgeIds.size > 0
                  ? Array.from(selectedEdgeIds)
                  : (contextMenu.edgeId ? [contextMenu.edgeId] : [])
                edgeIds.forEach(id => removeConnection(id))
                clearSelection()
              })}
              danger
              icon={
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 4h12M5.3 4V2.7a.7.7 0 01.7-.7h4a.7.7 0 01.7.7V4M6.7 7.3v4M9.3 7.3v4" />
                  <path d="M3.3 4l.7 9.3a1.3 1.3 0 001.3 1.3h5.4a1.3 1.3 0 001.3-1.3L12.7 4" />
                </svg>
              }
            />
          </>
        ) : isNodeContext ? (
          // Agent context menu
          <>
            <MenuItem
              label="Configure"
              shortcut=""
              onClick={() => handleAction(() => {
                if (contextMenu.nodeId) selectNode(contextMenu.nodeId)
              })}
              icon={
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="8" r="2" />
                  <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
                </svg>
              }
            />
            <Divider />
            <MenuItem
              label={selectedCount > 1 ? `Copy ${selectedCount} agents` : 'Copy'}
              shortcut="Ctrl+C"
              onClick={() => handleAction(() => copyAgents(Array.from(selectedNodeIds)))}
              icon={
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="5" width="9" height="9" rx="1.5" />
                  <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" />
                </svg>
              }
            />
            <MenuItem
              label="Duplicate"
              shortcut="Ctrl+D"
              onClick={() => handleAction(() => {
                const ids = Array.from(selectedNodeIds)
                const newIds = duplicateAgents(ids)
                selectNodes(newIds)
              })}
              icon={
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="10" height="10" rx="1.5" />
                  <line x1="8" y1="6" x2="8" y2="10" />
                  <line x1="6" y1="8" x2="10" y2="8" />
                </svg>
              }
            />
            {columns.length > 1 && (
              <>
                <Divider />
                <div className="px-2 py-1">
                  <span className="text-[9.5px] font-semibold uppercase tracking-wider text-content-tertiary">
                    Move to
                  </span>
                </div>
                {columns.map((col) => (
                  <MenuItem
                    key={col.id}
                    label={col.name}
                    shortcut=""
                    onClick={() => handleAction(() => {
                      Array.from(selectedNodeIds).forEach(id => moveAgentToColumn(id, col.id))
                    })}
                  />
                ))}
              </>
            )}
            <Divider />
            <MenuItem
              label={selectedCount > 1 ? `Delete ${selectedCount} agents` : 'Delete'}
              shortcut="Del"
              onClick={() => handleAction(() => {
                Array.from(selectedNodeIds).forEach(id => removeAgent(id))
                clearSelection()
              })}
              danger
              icon={
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 4h12M5.3 4V2.7a.7.7 0 01.7-.7h4a.7.7 0 01.7.7V4M6.7 7.3v4M9.3 7.3v4" />
                  <path d="M3.3 4l.7 9.3a1.3 1.3 0 001.3 1.3h5.4a1.3 1.3 0 001.3-1.3L12.7 4" />
                </svg>
              }
            />
          </>
        ) : (
          // Canvas context menu (right-click on empty space)
          <>
            {clipboard && clipboard.agents.length > 0 && (
              <>
                <MenuItem
                  label={`Paste ${clipboard.agents.length} agent${clipboard.agents.length > 1 ? 's' : ''}`}
                  shortcut="Ctrl+V"
                  onClick={() => handleAction(() => {
                    const newIds = pasteAgents()
                    if (newIds.length > 0) selectNodes(newIds)
                  })}
                  icon={
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 2h1.5A1.5 1.5 0 0113 3.5V13a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 013 13V3.5A1.5 1.5 0 014.5 2H6" />
                      <rect x="5.5" y="1" width="5" height="3" rx="1" />
                    </svg>
                  }
                />
                <Divider />
              </>
            )}
            <div className="px-2 py-1">
              <span className="text-[9.5px] font-semibold uppercase tracking-wider text-content-tertiary">
                Add Agent
              </span>
            </div>
            {(['researcher', 'architect', 'developer', 'reviewer', 'documenter', 'tester', 'custom'] as AgentRole[]).map((role) => (
              <MenuItem
                key={role}
                label={role.charAt(0).toUpperCase() + role.slice(1)}
                shortcut=""
                onClick={() => handleAction(() => {
                  let columnId: string
                  if (columns.length === 0) {
                    columnId = addColumn()
                  } else {
                    columnId = columns[columns.length - 1].id
                  }
                  addAgent(columnId, role)
                })}
              />
            ))}
            <Divider />
            <MenuItem
              label="Add Wave"
              shortcut=""
              onClick={() => handleAction(() => addColumn())}
              icon={
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="3" x2="8" y2="13" />
                  <line x1="3" y1="8" x2="13" y2="8" />
                </svg>
              }
            />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

function MenuItem({ label, shortcut, onClick, icon, danger }: {
  label: string
  shortcut: string
  onClick: () => void
  icon?: JSX.Element
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-3 py-1.5 text-left transition-colors ${
        danger
          ? 'text-red-400/70 hover:text-red-400 hover:bg-red-500/8'
          : 'text-content-secondary hover:text-content-primary hover:bg-surface-tertiary'
      }`}
    >
      {icon && <span className="shrink-0 opacity-70">{icon}</span>}
      <span className="flex-1 text-[11.5px] font-medium">{label}</span>
      {shortcut && (
        <kbd className="text-[9.5px] font-mono text-content-tertiary opacity-60">
          {shortcut}
        </kbd>
      )}
    </button>
  )
}

function Divider() {
  return <div className="my-1 mx-2 h-px bg-border-subtle" />
}
