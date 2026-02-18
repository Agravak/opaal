import { useWorkflowStore } from '../../stores/workflow-store'
import { useUIStore } from '../../stores/ui-store'
import { ROLE_META, ROLE_ACCENT } from '../../types/workflow'

export function StatusBar() {
  const workflow = useWorkflowStore((s) => s.workflow)
  const past = useWorkflowStore((s) => s.past)
  const dirty = useWorkflowStore((s) => s.dirty)
  const view = useUIStore((s) => s.view)
  const selectedCount = useUIStore((s) => s.selectedNodeIds.size)
  const controlGroups = useUIStore((s) => s.controlGroups)
  const recallControlGroup = useUIStore((s) => s.recallControlGroup)
  const placementMode = useUIStore((s) => s.placementMode)
  const placementRole = useUIStore((s) => s.placementRole)

  return (
    <footer className="flex items-center justify-between h-8 px-4 bg-surface-secondary/80 backdrop-blur-sm border-t border-border-subtle select-none">
      <div className="flex items-center gap-3">
        {/* Placement mode indicator */}
        {view === 'canvas' && placementMode && placementRole && (
          <span
            className="text-[11px] font-semibold tracking-tight"
            style={{ color: ROLE_ACCENT[placementRole] }}
          >
            Placing: {ROLE_META[placementRole]?.label || 'Agent'} — Click to deploy, Esc to cancel
          </span>
        )}
        {view === 'home' ? (
          <span className="text-[11px] font-medium text-content-tertiary">Home</span>
        ) : (
        <span className="text-[11px] font-medium text-content-tertiary">
          {workflow.agents.length} agent{workflow.agents.length !== 1 ? 's' : ''}
        </span>
        )}
        {view === 'canvas' && (
          <>
            <span className="text-[11px] text-content-tertiary opacity-40">|</span>
            <span className="text-[11px] font-medium text-content-tertiary">
              {workflow.connections.filter(c => c.type === 'manual').length} manual
              {' / '}
              {workflow.connections.filter(c => c.type === 'auto').length} auto connections
            </span>
            <span className="text-[11px] text-content-tertiary opacity-40">|</span>
            <span className="text-[11px] font-medium text-content-tertiary">
              {workflow.columns.length} wave{workflow.columns.length !== 1 ? 's' : ''}
            </span>
            {selectedCount > 0 && (
              <>
                <span className="text-[11px] text-content-tertiary opacity-40">|</span>
                <span className="text-[11px] font-medium text-accent">
                  {selectedCount} selected
                </span>
              </>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* Control group badges */}
        {Array.from(controlGroups.entries())
          .filter(([, ids]) => ids.length > 0)
          .map(([key, ids]) => (
            <button
              key={key}
              onClick={() => recallControlGroup(key)}
              className="w-5 h-5 rounded text-[10px] font-bold bg-surface-tertiary border border-border-subtle text-content-secondary hover:text-accent hover:border-accent/30 transition-all"
              title={`Group ${key}: ${ids.length} agent${ids.length !== 1 ? 's' : ''} (Ctrl+Shift+${key} to select)`}
            >
              {key}
            </button>
          ))
        }
        {past.length > 0 && (
          <span className="text-[10px] text-content-tertiary opacity-60">
            {past.length} undo{past.length !== 1 ? 's' : ''}
          </span>
        )}
        {dirty && (
          <span className="text-[10px] text-amber-400/80 font-medium">
            Unsaved
          </span>
        )}
        <span className="text-[11px] text-content-tertiary">
          {workflow.name}
        </span>
      </div>
    </footer>
  )
}
