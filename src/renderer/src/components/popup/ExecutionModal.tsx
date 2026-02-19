import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useExecutionStore, createExecutionMessage, type ExecutionMessage } from '../../stores/execution-store'
import { useUIStore } from '../../stores/ui-store'
import { useWorkflowStore } from '../../stores/workflow-store'

const EASE = [0.25, 0.46, 0.45, 0.94] as const

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}m ${secs}s`
}

function formatCost(usd: number): string {
  if (usd === 0) return '$0.00'
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(2)}`
}

function extractTextContent(raw?: Record<string, unknown>): string {
  if (!raw) return ''
  // Try to extract readable text from SDK message
  if (raw.message && typeof raw.message === 'object') {
    const msg = raw.message as Record<string, unknown>
    if (Array.isArray(msg.content)) {
      return (msg.content as Array<Record<string, unknown>>)
        .filter((block) => block.type === 'text')
        .map((block) => block.text as string)
        .join('\n')
    }
  }
  if (raw.result && typeof raw.result === 'string') return raw.result
  if (raw.summary && typeof raw.summary === 'string') return raw.summary
  return ''
}

export function ExecutionModal() {
  const executionModalOpen = useUIStore((s) => s.executionModalOpen)
  const closeExecutionModal = useUIStore((s) => s.closeExecutionModal)
  const workflowName = useWorkflowStore((s) => s.workflow.name)

  const status = useExecutionStore((s) => s.status)
  const messages = useExecutionStore((s) => s.messages)
  const startedAt = useExecutionStore((s) => s.startedAt)
  const numTurns = useExecutionStore((s) => s.numTurns)
  const totalCostUsd = useExecutionStore((s) => s.totalCostUsd)
  const error = useExecutionStore((s) => s.error)
  const reset = useExecutionStore((s) => s.reset)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [elapsed, setElapsed] = useState(0)

  // Elapsed time counter
  useEffect(() => {
    if (status !== 'running' || !startedAt) return
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt)
    }, 1000)
    return () => clearInterval(interval)
  }, [status, startedAt])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, autoScroll])

  // Detect user scrolling up to disable auto-scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 60
    setAutoScroll(isAtBottom)
  }, [])

  // Register IPC listeners for SDK messages
  useEffect(() => {
    if (!executionModalOpen) return
    const { addMessage, setComplete, setError, setStopped, setSessionId } = useExecutionStore.getState()

    const handleMessage = (_event: unknown, data: Record<string, unknown>) => {
      const type = data.type as string
      const subtype = data.subtype as string | undefined

      if (type === 'system' && subtype === 'init') {
        if (data.session_id) setSessionId(data.session_id as string)
        addMessage(createExecutionMessage('system', `Session initialized (model: ${data.model || 'unknown'})`, 'init', data))
        return
      }

      if (type === 'assistant') {
        const text = extractTextContent(data)
        if (text) {
          addMessage(createExecutionMessage('assistant', text, undefined, data))
        }
        return
      }

      if (type === 'tool_use_summary') {
        const summary = (data.summary as string) || 'Tool used'
        addMessage(createExecutionMessage('tool_use_summary', summary, undefined, data))
        return
      }

      if (type === 'tool_progress') {
        // Skip tool progress to reduce noise - only show summaries
        return
      }

      if (type === 'result') {
        const resultSubtype = data.subtype as string
        if (resultSubtype === 'success') {
          const result = (data.result as string) || 'Workflow completed'
          addMessage(createExecutionMessage('result', result, 'success', data))
          setComplete(
            (data.num_turns as number) || 0,
            (data.total_cost_usd as number) || 0
          )
        } else {
          const errors = (data.errors as string[]) || []
          addMessage(createExecutionMessage('result', errors.join('\n') || `Ended: ${resultSubtype}`, resultSubtype, data))
          setError(resultSubtype)
        }
        return
      }

      if (type === 'system' && subtype === 'status') {
        const sdkStatus = data.status as string | null
        if (sdkStatus === 'compacting') {
          addMessage(createExecutionMessage('status', 'Compacting context...', 'compacting'))
        }
        return
      }

      // Catch-all for other message types
      if (type === 'system' && subtype === 'task_started') {
        addMessage(createExecutionMessage('system', `Task started: ${data.description || 'unknown'}`, 'task_started', data))
      } else if (type === 'system' && subtype === 'task_notification') {
        addMessage(createExecutionMessage('system', `Task ${data.status}: ${data.summary || ''}`, 'task_notification', data))
      }
    }

    const handleComplete = (_event: unknown, data: Record<string, unknown>) => {
      setComplete(
        (data.num_turns as number) || numTurns,
        (data.total_cost_usd as number) || totalCostUsd
      )
    }

    const handleError = (_event: unknown, data: Record<string, unknown>) => {
      const errMsg = (data.error as string) || 'Unknown error'
      addMessage(createExecutionMessage('error', errMsg))
      setError(errMsg)
    }

    const handleStopped = () => {
      addMessage(createExecutionMessage('system', 'Workflow stopped by user'))
      setStopped()
    }

    // Register IPC listeners via the preload bridge
    const cleanups: (() => void)[] = []
    if (window.api?.onClaudeMessage) {
      cleanups.push(window.api.onClaudeMessage(handleMessage))
    }
    if (window.api?.onClaudeComplete) {
      cleanups.push(window.api.onClaudeComplete(handleComplete))
    }
    if (window.api?.onClaudeError) {
      cleanups.push(window.api.onClaudeError(handleError))
    }
    if (window.api?.onClaudeStopped) {
      cleanups.push(window.api.onClaudeStopped(handleStopped))
    }

    return () => cleanups.forEach((fn) => fn())
  }, [executionModalOpen, numTurns, totalCostUsd])

  const handleStop = useCallback(async () => {
    if (window.api?.stopClaudeWorkflow) {
      await window.api.stopClaudeWorkflow()
    }
  }, [])

  const handleClose = useCallback(() => {
    if (status === 'running') {
      handleStop()
    }
    closeExecutionModal()
  }, [status, handleStop, closeExecutionModal])

  const handleReset = useCallback(() => {
    reset()
    closeExecutionModal()
  }, [reset, closeExecutionModal])

  if (!executionModalOpen) return null

  return (
    <AnimatePresence>
      {executionModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="exec-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[16px]"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            key="exec-modal-panel"
            initial={{ opacity: 0, scale: 0.88, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26, mass: 0.9 }}
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              w-[calc(100vw-100px)] max-w-[800px] h-[calc(100vh-80px)] max-h-[700px]
              rounded-2xl bg-surface-elevated backdrop-blur-xl
              border border-border-subtle shadow-elevated
              overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Accent bar */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
              style={{
                background: status === 'running'
                  ? 'linear-gradient(90deg, #818cf8, #a78bfa, #818cf8)'
                  : status === 'completed'
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : status === 'error'
                      ? 'linear-gradient(90deg, #ef4444, #f87171)'
                      : 'linear-gradient(90deg, #818cf8, #a78bfa)',
                backgroundSize: status === 'running' ? '200% 100%' : '100% 100%',
                animation: status === 'running' ? 'exec-shimmer 2s linear infinite' : 'none',
              }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.2, duration: 0.4, ease: EASE }}
            />

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.3, ease: EASE }}
              className="px-6 pt-5 pb-4 shrink-0 border-b border-border-subtle"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Status icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    status === 'running'
                      ? 'bg-indigo-500/12'
                      : status === 'completed'
                        ? 'bg-emerald-500/12'
                        : status === 'error'
                          ? 'bg-red-500/12'
                          : 'bg-surface-tertiary'
                  }`}>
                    {status === 'running' ? (
                      <motion.svg
                        width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                        className="text-indigo-400"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </motion.svg>
                    ) : status === 'completed' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                        <polyline points="4 12 10 18 20 6" />
                      </svg>
                    ) : status === 'error' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-red-400">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-content-tertiary">
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <polyline points="8 12 10 12" />
                        <path d="M12 12h4" />
                      </svg>
                    )}
                  </div>

                  <div>
                    <h2 className="text-sm font-semibold text-content-primary">
                      {status === 'running' ? 'Running Workflow' : status === 'completed' ? 'Workflow Complete' : status === 'error' ? 'Workflow Error' : 'Run Workflow'}
                    </h2>
                    <p className="text-[11px] text-content-tertiary mt-0.5">
                      {workflowName || 'Untitled Workflow'}
                      {status === 'running' && startedAt && ` \u00B7 ${formatDuration(elapsed)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {status === 'running' && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleStop}
                      className="h-[32px] px-3 rounded-button flex items-center gap-2 text-[11px] font-semibold
                        border border-red-500/25 text-red-400 hover:bg-red-500/8 hover:border-red-500/40 transition-all"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="6" width="12" height="12" rx="1" />
                      </svg>
                      Stop
                    </motion.button>
                  )}

                  <button
                    onClick={handleClose}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-content-tertiary hover:text-content-primary hover:bg-surface-tertiary transition-all"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Messages feed */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-6 py-4"
            >
              {messages.length === 0 && status === 'idle' ? (
                <div className="flex items-center justify-center h-full text-content-tertiary text-[12px]">
                  Waiting to start...
                </div>
              ) : messages.length === 0 && status === 'running' ? (
                <div className="flex items-center justify-center h-full text-content-tertiary text-[12px]">
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Connecting to Claude...
                  </motion.span>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                </div>
              )}
            </div>

            {/* Scroll to bottom button */}
            <AnimatePresence>
              {!autoScroll && messages.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  onClick={() => {
                    if (scrollRef.current) {
                      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
                      setAutoScroll(true)
                    }
                  }}
                  className="absolute bottom-16 right-8 w-8 h-8 rounded-full bg-surface-elevated border border-border-default
                    shadow-lg flex items-center justify-center text-content-secondary hover:text-content-primary transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="6 10 12 16 18 10" />
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Footer stats */}
            <div className="px-6 py-3 border-t border-border-subtle bg-surface-secondary/50 shrink-0 flex items-center justify-between text-[10px] text-content-tertiary">
              <div className="flex items-center gap-4">
                <span>{messages.length} messages</span>
                {numTurns > 0 && <span>{numTurns} turns</span>}
                {totalCostUsd > 0 && <span>{formatCost(totalCostUsd)}</span>}
              </div>
              <div className="flex items-center gap-2">
                {(status === 'completed' || status === 'error' || status === 'stopped') && (
                  <button
                    onClick={handleReset}
                    className="text-[10px] text-content-tertiary hover:text-content-secondary transition-colors"
                  >
                    Clear &amp; Close
                  </button>
                )}
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${
                  status === 'running'
                    ? 'bg-indigo-500/10 text-indigo-400'
                    : status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : status === 'error'
                        ? 'bg-red-500/10 text-red-400'
                        : status === 'stopped'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-surface-tertiary text-content-tertiary'
                }`}>
                  {status === 'running' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  )}
                  {status}
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function MessageBubble({ message }: { message: ExecutionMessage }) {
  const isAssistant = message.type === 'assistant'
  const isResult = message.type === 'result'
  const isError = message.type === 'error' || message.subtype === 'error_during_execution'
  const isSystem = message.type === 'system' || message.type === 'status'
  const isTool = message.type === 'tool_use_summary'

  if (isSystem) {
    return (
      <div className="flex items-center gap-2 py-1">
        <div className="h-px flex-1 bg-border-subtle" />
        <span className="text-[10px] text-content-tertiary px-2 shrink-0">{message.content}</span>
        <div className="h-px flex-1 bg-border-subtle" />
      </div>
    )
  }

  if (isTool) {
    return (
      <div className="flex items-start gap-2 py-1">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-violet-400 mt-0.5 shrink-0">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        <span className="text-[11px] text-content-secondary">{message.content}</span>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`rounded-lg px-4 py-3 text-[12px] leading-relaxed ${
        isError
          ? 'bg-red-500/8 border border-red-500/15 text-red-300'
          : isResult
            ? 'bg-emerald-500/8 border border-emerald-500/15 text-emerald-300'
            : isAssistant
              ? 'bg-surface-tertiary/60 border border-border-subtle text-content-secondary'
              : 'bg-surface-secondary text-content-tertiary'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-[9px] font-bold uppercase tracking-wider ${
          isError ? 'text-red-400' : isResult ? 'text-emerald-400' : isAssistant ? 'text-indigo-400' : 'text-content-tertiary'
        }`}>
          {isError ? 'Error' : isResult ? 'Result' : isAssistant ? 'Claude' : message.type}
        </span>
      </div>
      <div className="whitespace-pre-wrap break-words">{message.content}</div>
    </motion.div>
  )
}
