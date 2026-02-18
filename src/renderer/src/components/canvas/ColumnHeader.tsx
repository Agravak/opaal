import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { type NodeProps, useReactFlow } from '@xyflow/react'
import { useWorkflowStore } from '../../stores/workflow-store'
import type { Column } from '../../types/workflow'

export type ColumnHeaderData = {
  column: Column
}

function ColumnHeaderNode({ data }: NodeProps) {
  const column = (data as unknown as ColumnHeaderData).column
  const renameColumn = useWorkflowStore((s) => s.renameColumn)
  const removeColumn = useWorkflowStore((s) => s.removeColumn)
  const agents = useWorkflowStore((s) => s.workflow.agents)
  const nativeMode = useWorkflowStore((s) => s.workflow.settings.nativeMode)
  const updateSettings = useWorkflowStore((s) => s.updateSettings)
  const columns = useWorkflowStore((s) => s.workflow.columns)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(column.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const { fitView } = useReactFlow()

  // Update column validation criteria via a workflow-level approach
  // We store validationCriteria on the Column type directly
  const handleValidationChange = useCallback((value: string) => {
    // We need to update the column directly in the workflow store
    // Since columns don't have their own update method, we'll use the store
    const store = useWorkflowStore.getState()
    const newColumns = store.workflow.columns.map(c =>
      c.id === column.id ? { ...c, validationCriteria: value } : c
    )
    // Use the internal set via a workaround - update through the workflow
    store.updateSettings({ ...store.workflow.settings }) // trigger re-render
    useWorkflowStore.setState((state) => ({
      workflow: {
        ...state.workflow,
        columns: newColumns,
        updatedAt: new Date().toISOString(),
      },
      dirty: true,
    }))
  }, [column.id])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSubmit = () => {
    const trimmed = editName.trim()
    if (trimmed) renameColumn(column.id, trimmed)
    setIsEditing(false)
  }

  const agentCount = agents.filter((a) => a.columnId === column.id).length

  const handleZoomToColumn = useCallback(() => {
    const columnAgentIds = agents
      .filter(a => a.columnId === column.id)
      .map(a => a.id)
    if (columnAgentIds.length === 0) return
    fitView({
      nodes: columnAgentIds.map(id => ({ id })),
      padding: 0.3,
      duration: 400,
    })
  }, [agents, column.id, fitView])

  return (
    <div className="flex flex-col gap-1" style={{ width: 340 }}>
      <div className="flex items-center gap-2 group">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
              if (e.key === 'Escape') setIsEditing(false)
            }}
            className="text-[11px] font-semibold uppercase tracking-wider bg-transparent border-b border-accent outline-none text-content-secondary pb-0.5 flex-1"
          />
        ) : (
          <>
            <h4
              onDoubleClick={() => {
                setEditName(column.name)
                setIsEditing(true)
              }}
              className="text-[11px] font-semibold uppercase tracking-wider text-content-tertiary cursor-default select-none"
            >
              {column.name}
            </h4>
            <span className="text-[9px] text-content-tertiary/50 font-medium tabular-nums">
              {agentCount} {agentCount === 1 ? 'agent' : 'agents'}
            </span>
            <div className="flex-1 h-px bg-border-subtle" />
            {/* Zoom to column */}
            <button
              onClick={handleZoomToColumn}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-content-tertiary hover:text-accent transition-all duration-150"
              title="Zoom to column"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <circle cx="7" cy="7" r="4" />
                <path d="M10 10l3.5 3.5" />
              </svg>
            </button>
            {/* Remove column */}
            <button
              onClick={() => removeColumn(column.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-content-tertiary hover:text-red-400 transition-all duration-150"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <line x1="4" y1="4" x2="12" y2="12" />
                <line x1="12" y1="4" x2="4" y2="12" />
              </svg>
            </button>
          </>
        )}
      </div>
      {/* Validation Checkpoint (Native Mode) */}
      {nativeMode && (
        <input
          value={column.validationCriteria || ''}
          onChange={(e) => handleValidationChange(e.target.value)}
          className="text-[9px] bg-transparent border-b border-dashed border-indigo-500/20 outline-none text-indigo-400/60 placeholder:text-content-tertiary/30 pb-0.5 focus:border-indigo-500/40 focus:text-indigo-400 transition-colors"
          placeholder="Checkpoint: verify before next wave..."
        />
      )}
    </div>
  )
}

export default memo(ColumnHeaderNode)
