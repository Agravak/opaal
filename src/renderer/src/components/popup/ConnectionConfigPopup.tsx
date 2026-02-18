import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../stores/ui-store'
import { useWorkflowStore } from '../../stores/workflow-store'
import {
  type ConnectionFlowType,
  type HandoffFormat,
  FLOW_TYPE_META,
  HANDOFF_FORMAT_META,
  getFlowType,
} from '../../types/workflow'
import { InfoTooltip } from '../shared/InfoTooltip'
import { CONNECTION_FIELD_INFO } from '../../lib/field-info-text'

const EASE = [0.25, 0.46, 0.45, 0.94] as const
const DRAFT_COMMIT_DELAY_MS = 180

const FLOW_TYPES: ConnectionFlowType[] = ['always', 'conditional', 'approval-gate', 'loop']
const HANDOFF_FORMATS: HandoffFormat[] = ['summary', 'structured-json', 'file-reference', 'full-output']

const FLOW_ICONS: Record<ConnectionFlowType, string> = {
  'always': '→',
  'conditional': '◆',
  'approval-gate': '⏸',
  'loop': '↻',
}

export function ConnectionConfigPopup() {
  const connectionId = useUIStore((s) => s.configPopupConnectionId)
  const closePopup = useUIStore((s) => s.closeConnectionConfigPopup)
  const connection = useWorkflowStore((s) =>
    s.workflow.connections.find(c => c.id === connectionId)
  )
  const nativeMode = useWorkflowStore((s) => s.workflow.settings.nativeMode)
  const updateConnection = useWorkflowStore((s) => s.updateConnection)
  const agents = useWorkflowStore((s) => s.workflow.agents)

  const sourceAgent = agents.find(a => a.id === connection?.sourceAgentId)
  const targetAgent = agents.find(a => a.id === connection?.targetAgentId)

  // Drafts for text fields
  const [conditionDraft, setConditionDraft] = useState('')
  const [conditionLabelDraft, setConditionLabelDraft] = useState('')
  const [loopConditionDraft, setLoopConditionDraft] = useState('')
  const [approvalPromptDraft, setApprovalPromptDraft] = useState('')
  const [dataDescDraft, setDataDescDraft] = useState('')

  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const panelRef = useRef<HTMLDivElement>(null)

  // Sync drafts when connection changes
  useEffect(() => {
    if (connection) {
      setConditionDraft(connection.condition || '')
      setConditionLabelDraft(connection.conditionLabel || '')
      setLoopConditionDraft(connection.loopCondition || '')
      setApprovalPromptDraft(connection.approvalPrompt || '')
      setDataDescDraft(connection.dataDescription || '')
    }
  }, [connection?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleCommit = useCallback((field: string, value: string) => {
    if (!connectionId) return
    if (timersRef.current[field]) clearTimeout(timersRef.current[field])
    timersRef.current[field] = setTimeout(() => {
      updateConnection(connectionId, { [field]: value || undefined })
      delete timersRef.current[field]
    }, DRAFT_COMMIT_DELAY_MS)
  }, [connectionId, updateConnection])

  const flushAll = useCallback(() => {
    if (!connectionId) return
    Object.keys(timersRef.current).forEach(key => {
      clearTimeout(timersRef.current[key])
      delete timersRef.current[key]
    })
    updateConnection(connectionId, {
      condition: conditionDraft || undefined,
      conditionLabel: conditionLabelDraft || undefined,
      loopCondition: loopConditionDraft || undefined,
      approvalPrompt: approvalPromptDraft || undefined,
      dataDescription: dataDescDraft || undefined,
    })
  }, [connectionId, updateConnection, conditionDraft, conditionLabelDraft, loopConditionDraft, approvalPromptDraft, dataDescDraft])

  const handleClose = useCallback(() => {
    flushAll()
    closePopup()
  }, [flushAll, closePopup])

  // Escape to close
  useEffect(() => {
    if (!connectionId) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [connectionId, handleClose])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      handleClose()
    }
  }, [handleClose])

  const isOpen = !!connectionId && !!connection
  const flowType = connection ? getFlowType(connection) : 'always'

  const handleFlowTypeChange = useCallback((newType: ConnectionFlowType) => {
    if (!connectionId) return
    updateConnection(connectionId, {
      flowType: newType === 'always' ? undefined : newType,
      // Clear irrelevant fields when switching types
      ...(newType !== 'conditional' ? { condition: undefined, conditionLabel: undefined, isElseBranch: undefined } : {}),
      ...(newType !== 'loop' ? { loopCondition: undefined, maxIterations: undefined } : { maxIterations: connection?.maxIterations ?? 3 }),
      ...(newType !== 'approval-gate' ? { approvalPrompt: undefined } : {}),
    })
  }, [connectionId, connection?.maxIterations, updateConnection])

  return (
    <AnimatePresence>
      {isOpen && connection && (
        <>
          {/* Backdrop */}
          <motion.div
            key="conn-config-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[6px]"
            onClick={handleBackdropClick}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            key="conn-config-panel"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 28,
              mass: 0.8
            }}
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              w-[420px] max-h-[70vh] rounded-2xl
              bg-surface-elevated/95 backdrop-blur-xl
              border border-border-subtle shadow-elevated
              overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-subtle">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-[13px] font-semibold text-content-primary">
                  Connection Settings
                </h3>
                <p className="text-[10.5px] text-content-tertiary">
                  {sourceAgent?.name || 'Source'} → {targetAgent?.name || 'Target'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-content-tertiary hover:text-content-primary hover:bg-surface-tertiary transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="4" x2="12" y2="12" />
                  <line x1="12" y1="4" x2="4" y2="12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Flow Type Selector */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-content-tertiary mb-2">
                  Flow Type
                  <InfoTooltip content={CONNECTION_FIELD_INFO.flowType} />
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {FLOW_TYPES.map(type => {
                    const meta = FLOW_TYPE_META[type]
                    const isSelected = flowType === type
                    return (
                      <button
                        key={type}
                        onClick={() => handleFlowTypeChange(type)}
                        className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-center transition-all duration-150 ${
                          isSelected
                            ? 'border-accent/40 bg-accent/8 text-accent'
                            : 'border-border-subtle bg-surface-secondary/50 text-content-tertiary hover:border-border-default hover:text-content-secondary'
                        }`}
                      >
                        <span className="text-[14px]">{FLOW_ICONS[type]}</span>
                        <span className="text-[9.5px] font-medium leading-tight">{meta.label}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="text-[9.5px] text-content-tertiary mt-1.5">
                  {FLOW_TYPE_META[flowType].description}
                </p>
              </div>

              {/* Conditional Fields */}
              {flowType === 'conditional' && (
                <div className="space-y-3 p-3 rounded-lg border border-amber-500/15 bg-amber-500/5">
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-500/70">
                    Condition
                    <InfoTooltip content={CONNECTION_FIELD_INFO.condition} />
                  </label>
                  <textarea
                    value={conditionDraft}
                    onChange={(e) => {
                      setConditionDraft(e.target.value)
                      scheduleCommit('condition', e.target.value)
                    }}
                    onBlur={() => {
                      if (connectionId) updateConnection(connectionId, { condition: conditionDraft || undefined })
                    }}
                    placeholder="When should this path be taken? e.g., 'If the code review finds critical issues...'"
                    className="w-full text-[11px] bg-transparent border border-amber-500/20 rounded-md px-2.5 py-2 text-content-primary placeholder:text-content-tertiary/40 outline-none focus:border-amber-500/40 resize-none"
                    rows={2}
                  />

                  <div>
                    <label className="flex items-center gap-1.5 text-[9.5px] text-content-tertiary mb-1">
                      Edge Label (short)
                      <InfoTooltip content={CONNECTION_FIELD_INFO.edgeLabel} />
                    </label>
                    <input
                      value={conditionLabelDraft}
                      onChange={(e) => {
                        setConditionLabelDraft(e.target.value)
                        scheduleCommit('conditionLabel', e.target.value)
                      }}
                      onBlur={() => {
                        if (connectionId) updateConnection(connectionId, { conditionLabel: conditionLabelDraft || undefined })
                      }}
                      placeholder="e.g., 'passes review'"
                      className="w-full text-[11px] bg-transparent border border-amber-500/20 rounded-md px-2.5 py-1.5 text-content-primary placeholder:text-content-tertiary/40 outline-none focus:border-amber-500/40"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={connection.isElseBranch || false}
                      onChange={(e) => {
                        if (connectionId) updateConnection(connectionId, { isElseBranch: e.target.checked || undefined })
                      }}
                      className="w-3.5 h-3.5 rounded border-amber-500/30 text-amber-500 focus:ring-amber-500/30"
                    />
                    <span className="text-[10.5px] text-content-secondary">
                      This is the "otherwise" / else branch
                    </span>
                  </label>
                </div>
              )}

              {/* Approval Gate Fields */}
              {flowType === 'approval-gate' && (
                <div className="space-y-3 p-3 rounded-lg border border-indigo-500/15 bg-indigo-500/5">
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-500/70">
                    Approval Prompt
                    <InfoTooltip content={CONNECTION_FIELD_INFO.approvalPrompt} />
                  </label>
                  <textarea
                    value={approvalPromptDraft}
                    onChange={(e) => {
                      setApprovalPromptDraft(e.target.value)
                      scheduleCommit('approvalPrompt', e.target.value)
                    }}
                    onBlur={() => {
                      if (connectionId) updateConnection(connectionId, { approvalPrompt: approvalPromptDraft || undefined })
                    }}
                    placeholder="What should the user be asked? e.g., 'Review the analysis and approve to continue...'"
                    className="w-full text-[11px] bg-transparent border border-indigo-500/20 rounded-md px-2.5 py-2 text-content-primary placeholder:text-content-tertiary/40 outline-none focus:border-indigo-500/40 resize-none"
                    rows={2}
                  />
                </div>
              )}

              {/* Loop Fields */}
              {flowType === 'loop' && (
                <div className="space-y-3 p-3 rounded-lg border border-emerald-500/15 bg-emerald-500/5">
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500/70">
                    Loop Configuration
                    <InfoTooltip content={CONNECTION_FIELD_INFO.loopConfiguration} />
                  </label>
                  <textarea
                    value={loopConditionDraft}
                    onChange={(e) => {
                      setLoopConditionDraft(e.target.value)
                      scheduleCommit('loopCondition', e.target.value)
                    }}
                    onBlur={() => {
                      if (connectionId) updateConnection(connectionId, { loopCondition: loopConditionDraft || undefined })
                    }}
                    placeholder="When should the loop stop? e.g., 'Until all tests pass' or 'Until review is approved'"
                    className="w-full text-[11px] bg-transparent border border-emerald-500/20 rounded-md px-2.5 py-2 text-content-primary placeholder:text-content-tertiary/40 outline-none focus:border-emerald-500/40 resize-none"
                    rows={2}
                  />

                  <div>
                    <label className="flex items-center gap-1.5 text-[9.5px] text-content-tertiary mb-1">
                      Max Iterations
                      <InfoTooltip content={CONNECTION_FIELD_INFO.maxIterations} />
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={connection.maxIterations ?? 3}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(10, parseInt(e.target.value) || 3))
                        if (connectionId) updateConnection(connectionId, { maxIterations: val })
                      }}
                      className="w-20 text-[11px] bg-transparent border border-emerald-500/20 rounded-md px-2.5 py-1.5 text-content-primary outline-none focus:border-emerald-500/40 tabular-nums"
                    />
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="h-px bg-border-subtle" />

              {/* Data Description (always shown) */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-content-tertiary mb-1.5">
                  Data Description
                  <InfoTooltip content={CONNECTION_FIELD_INFO.dataDescription} />
                </label>
                <input
                  value={dataDescDraft}
                  onChange={(e) => {
                    setDataDescDraft(e.target.value)
                    scheduleCommit('dataDescription', e.target.value)
                  }}
                  onBlur={() => {
                    if (connectionId) updateConnection(connectionId, { dataDescription: dataDescDraft || undefined })
                  }}
                  placeholder="What data flows through this connection?"
                  className="w-full text-[11px] bg-transparent border border-border-subtle rounded-md px-2.5 py-1.5 text-content-primary placeholder:text-content-tertiary/40 outline-none focus:border-accent/40"
                />
              </div>

              {/* Handoff Format (native mode only) */}
              {nativeMode && (
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-content-tertiary mb-1.5">
                    Handoff Format
                    <InfoTooltip content={CONNECTION_FIELD_INFO.handoffFormat} />
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {HANDOFF_FORMATS.map(fmt => {
                      const meta = HANDOFF_FORMAT_META[fmt]
                      const isSelected = connection.handoffFormat === fmt
                      return (
                        <button
                          key={fmt}
                          onClick={() => {
                            if (connectionId) {
                              updateConnection(connectionId, {
                                handoffFormat: isSelected ? undefined : fmt
                              })
                            }
                          }}
                          className={`px-2 py-1.5 rounded-md border text-[9px] font-medium transition-all duration-150 ${
                            isSelected
                              ? 'border-accent/40 bg-accent/8 text-accent'
                              : 'border-border-subtle bg-surface-secondary/50 text-content-tertiary hover:border-border-default hover:text-content-secondary'
                          }`}
                        >
                          {meta.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
