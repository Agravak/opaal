import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useUIStore } from '../../stores/ui-store'
import { useWorkflowStore } from '../../stores/workflow-store'
import { generatePrompt, type PromptSection } from '../../lib/prompt-generator'
import { ROLE_ACCENT } from '../../types/workflow'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'
import { Tooltip } from '../shared/Tooltip'

const EASE = [0.25, 0.46, 0.45, 0.94] as const

const SECTION_TYPE_LABELS: Record<string, string> = {
  preamble: 'PREAMBLE',
  'execution-order': 'EXECUTION ORDER',
  agent: 'AGENT',
  'data-flow': 'DATA FLOW',
  'control-flow': 'CONTROL FLOW',
  permissions: 'PERMISSIONS',
  deliverables: 'DELIVERABLES',
  suffix: 'ADDITIONAL',
}

/* ── Particle burst helper ── */
function generateParticles(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360 + (Math.random() - 0.5) * 40
    const rad = (angle * Math.PI) / 180
    const dist = 28 + Math.random() * 16
    return {
      id: i,
      px: Math.cos(rad) * dist,
      py: Math.sin(rad) * dist,
    }
  })
}

export function PromptPanel() {
  const selectNode = useUIStore((s) => s.selectNode)
  const openPromptModal = useUIStore((s) => s.openPromptModal)
  const promptPanelCollapsed = useUIStore((s) => s.promptPanelCollapsed)
  const togglePromptPanel = useUIStore((s) => s.togglePromptPanel)
  const workflow = useWorkflowStore((s) => s.workflow)

  const generated = useMemo(() => generatePrompt(workflow), [workflow])
  const animatedWordCount = useAnimatedNumber(generated.wordCount)
  const animatedAgentCount = useAnimatedNumber(generated.agentCount)
  const animatedWaveCount = useAnimatedNumber(generated.waveCount)

  // Pulse detection on workflow changes
  const [isPulsing, setIsPulsing] = useState(false)
  const prevTimestampRef = useRef(generated.generatedAt)

  useEffect(() => {
    if (generated.generatedAt !== prevTimestampRef.current && generated.wordCount > 0) {
      prevTimestampRef.current = generated.generatedAt
      setIsPulsing(true)
      const timer = setTimeout(() => setIsPulsing(false), 600)
      return () => clearTimeout(timer)
    }
  }, [generated.generatedAt, generated.wordCount])

  // Stat direction tracking
  const [wordDir, setWordDir] = useState<'up' | 'down' | null>(null)
  const [agentDir, setAgentDir] = useState<'up' | 'down' | null>(null)
  const [waveDir, setWaveDir] = useState<'up' | 'down' | null>(null)
  const prevWordCount = useRef(generated.wordCount)
  const prevAgentCount = useRef(generated.agentCount)
  const prevWaveCount = useRef(generated.waveCount)

  useEffect(() => {
    if (generated.wordCount !== prevWordCount.current) {
      setWordDir(generated.wordCount > prevWordCount.current ? 'up' : 'down')
      prevWordCount.current = generated.wordCount
      const t = setTimeout(() => setWordDir(null), 400)
      return () => clearTimeout(t)
    }
  }, [generated.wordCount])

  useEffect(() => {
    if (generated.agentCount !== prevAgentCount.current) {
      setAgentDir(generated.agentCount > prevAgentCount.current ? 'up' : 'down')
      prevAgentCount.current = generated.agentCount
      const t = setTimeout(() => setAgentDir(null), 400)
      return () => clearTimeout(t)
    }
  }, [generated.agentCount])

  useEffect(() => {
    if (generated.waveCount !== prevWaveCount.current) {
      setWaveDir(generated.waveCount > prevWaveCount.current ? 'up' : 'down')
      prevWaveCount.current = generated.waveCount
      const t = setTimeout(() => setWaveDir(null), 400)
      return () => clearTimeout(t)
    }
  }, [generated.waveCount])

  // Copy handler with celebration
  const [copied, setCopied] = useState(false)
  const [particles, setParticles] = useState<{ id: number; px: number; py: number }[]>([])
  const [showRipple, setShowRipple] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!generated.fullText) return
    try {
      await navigator.clipboard.writeText(generated.fullText)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = generated.fullText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setParticles(generateParticles(7))
    setShowRipple(true)
    setTimeout(() => setShowRipple(false), 500)
    setTimeout(() => setParticles([]), 500)
    setTimeout(() => setCopied(false), 2000)
  }, [generated.fullText])

  // Export handler
  const [exported, setExported] = useState(false)
  const handleExport = useCallback(async () => {
    if (!generated.fullText) return
    if (window.api?.exportPrompt) {
      const result = await window.api.exportPrompt(generated.fullText)
      if (result) {
        setExported(true)
        setTimeout(() => setExported(false), 2000)
      }
    }
  }, [generated.fullText])

  // Track new sections for shimmer effect
  const [newSectionIds, setNewSectionIds] = useState<Set<string>>(new Set())
  const prevSectionIdsRef = useRef<string[]>([])

  useEffect(() => {
    const currentIds = generated.sections.map((s) => s.id)
    const prevSet = new Set(prevSectionIdsRef.current)
    const newIds = currentIds.filter((id) => !prevSet.has(id))
    if (newIds.length > 0 && prevSectionIdsRef.current.length > 0) {
      setNewSectionIds(new Set(newIds))
      const timer = setTimeout(() => setNewSectionIds(new Set()), 1200)
      prevSectionIdsRef.current = currentIds
      return () => clearTimeout(timer)
    }
    prevSectionIdsRef.current = currentIds
  }, [generated.sections])

  const hasContent = generated.wordCount > 0
  const completenessPercent = Math.round(generated.completeness * 100)

  // Completeness gradient based on progress
  const completenessGradient =
    generated.completeness > 0.7
      ? 'linear-gradient(90deg, #10b981, #34d399)'
      : generated.completeness > 0.3
        ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
        : 'linear-gradient(90deg, #71717a, #a1a1aa)'

  // View Full button hover state
  const [viewBtnHovered, setViewBtnHovered] = useState(false)

  if (promptPanelCollapsed) {
    return (
      <aside className="flex h-full w-full bg-surface-elevated/95 backdrop-blur-md border-l border-border-default shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden">
        <Tooltip content="Show prompt panel">
          <button
            onClick={togglePromptPanel}
            className="flex-1 flex flex-col items-center justify-center gap-2 text-content-secondary hover:text-content-primary hover:bg-surface-tertiary/75 transition-colors px-1"
            title="Show prompt panel"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="6 4 10 8 6 12" />
            </svg>
            <span
              className="text-[9px] font-bold tracking-[0.11em] text-content-primary/90"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              PROMPT
            </span>
          </button>
        </Tooltip>
      </aside>
    )
  }

  return (
    <aside className="flex flex-col h-full bg-surface-secondary/80 backdrop-blur-sm border-l border-border-subtle overflow-hidden">
      {/* ── Top accent bar ── */}
      <div className="h-[3px] shrink-0 prompt-accent-sweep" />

      {/* ── Header with atmospheric gradient ── */}
      <div
        className="px-4 pt-4 pb-3 shrink-0 transition-all duration-300 relative overflow-hidden"
        style={{
          background: isPulsing
            ? 'radial-gradient(ellipse at 36px 36px, var(--color-accent-glow) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at 36px 36px, oklch(0.7 0.17 277.117 / 0.04) 0%, transparent 70%)',
        }}
      >
        {/* Title block */}
        <div className="flex items-center gap-3 mb-3">
          {/* Rotating icon border */}
          <div className="relative w-10 h-10 shrink-0">
            <div className="absolute inset-0 rounded-[12px] prompt-icon-rotate opacity-30"
              style={{
                background: 'conic-gradient(from 0deg, var(--color-accent), transparent 25%, var(--color-accent-glow) 50%, transparent 75%, var(--color-accent))',
              }}
            />
            <div className="absolute inset-[1.5px] rounded-[11px] bg-gradient-to-br from-accent/12 to-accent/4 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-accent">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-bold text-content-primary tracking-tight">
                Generated Prompt
              </h2>
              {hasContent && (
                <div className="relative shrink-0">
                  <div className="w-[7px] h-[7px] rounded-full bg-emerald-400" />
                  <div className="absolute inset-0 w-[7px] h-[7px] rounded-full bg-emerald-400 prompt-ring-pulse" />
                </div>
              )}
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={isPulsing ? 'updating' : 'idle'}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="text-[10.5px] text-content-tertiary mt-0.5 leading-snug"
              >
                {isPulsing ? 'Updating...' : 'Copy and paste into your AI launcher'}
              </motion.p>
            </AnimatePresence>
          </div>
          <button
            onClick={togglePromptPanel}
            className="ml-auto p-1.5 rounded-[7px] text-content-tertiary hover:text-content-secondary hover:bg-surface-tertiary transition-colors"
            title="Collapse prompt panel"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="10 4 6 8 10 12" />
            </svg>
          </button>
        </div>

        {/* Stats pills with direction flash */}
        <div className="flex items-center gap-2 mb-3">
          <StatPill
            icon={
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent/70">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            }
            animatedValue={animatedWordCount}
            label="words"
            direction={wordDir}
          />
          <StatPill
            icon={
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent/70">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
            animatedValue={animatedAgentCount}
            label={generated.agentCount === 1 ? 'agent' : 'agents'}
            direction={agentDir}
          />
          <StatPill
            icon={
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent/70">
                <path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
                <path d="M2 6c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
                <path d="M2 18c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
              </svg>
            }
            animatedValue={animatedWaveCount}
            label={generated.waveCount === 1 ? 'wave' : 'waves'}
            direction={waveDir}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-2">
          {/* Copy button with celebration */}
          <div className="relative flex-1">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCopy}
              disabled={!hasContent}
              className={`w-full h-[34px] rounded-button flex items-center justify-center gap-2 text-[11.5px] font-semibold transition-all duration-200 relative overflow-hidden ${
                copied
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                  : hasContent
                    ? 'bg-accent text-white hover:bg-accent-hover shadow-sm'
                    : 'bg-surface-tertiary/60 text-content-tertiary/40 cursor-not-allowed'
              }`}
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span
                    key="copied"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="prompt-checkmark-draw">
                      <polyline points="4 12 10 18 20 6" />
                    </svg>
                    Copied!
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy to Clipboard
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Ripple effect */}
              {showRipple && (
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="w-8 h-8 rounded-full bg-emerald-400/20 prompt-copy-ripple" />
                </span>
              )}
            </motion.button>

            {/* Particles */}
            {particles.map((p) => (
              <span
                key={p.id}
                className="absolute top-1/2 left-1/2 w-[3px] h-[3px] rounded-full bg-accent prompt-copy-particle"
                style={{
                  '--px': `${p.px}px`,
                  '--py': `${p.py}px`,
                } as React.CSSProperties}
              />
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleExport}
            disabled={!hasContent}
            className={`h-[34px] px-3 rounded-button flex items-center gap-2 text-[11px] font-semibold transition-all duration-200 ${
              exported
                ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20'
                : hasContent
                  ? 'border border-accent/30 text-accent hover:bg-accent/8 hover:border-accent/50'
                  : 'border border-border-subtle text-content-tertiary/40 cursor-not-allowed'
            }`}
          >
            {exported ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="prompt-checkmark-draw">
                  <polyline points="4 12 10 18 20 6" />
                </svg>
                Saved
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export .md
              </>
            )}
          </motion.button>
        </div>

        {/* View Full Prompt button - the gateway */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={openPromptModal}
          disabled={!hasContent}
          onMouseEnter={() => setViewBtnHovered(true)}
          onMouseLeave={() => setViewBtnHovered(false)}
          className={`prompt-view-btn w-full h-[34px] rounded-button flex items-center justify-center gap-2 text-[11.5px] font-semibold transition-all duration-200 mb-2 ${
            hasContent
              ? 'border border-border-default text-content-secondary hover:border-accent/40 hover:text-accent hover:shadow-[0_0_20px_var(--color-accent-glow)]'
              : 'border border-border-subtle text-content-tertiary/40 cursor-not-allowed'
          }`}
        >
          <motion.svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            animate={{ rotate: viewBtnHovered && hasContent ? 5 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </motion.svg>
          View Full Prompt
          <AnimatePresence>
            {viewBtnHovered && hasContent && (
              <motion.kbd
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 0.5, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.12 }}
                className="text-[9px] font-mono px-1 py-0.5 rounded bg-surface-tertiary/80 border border-border-subtle text-content-tertiary"
              >
                P
              </motion.kbd>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Completeness bar */}
        {generated.agentCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[5px] rounded-full bg-border-subtle overflow-hidden" style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: completenessGradient }}
                initial={{ width: 0 }}
                animate={{ width: `${completenessPercent}%` }}
                transition={{ duration: 0.5, ease: EASE }}
              />
            </div>
            <span className="text-[9px] tabular-nums shrink-0">
              <span className="font-semibold text-content-primary">{completenessPercent}%</span>
              <span className="text-content-tertiary ml-0.5">complete</span>
            </span>
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-border-subtle shrink-0" />

      {/* ── Sections ── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3 space-y-2">
        {generated.sections.length === 0 ? (
          <EmptyState />
        ) : (
          generated.sections.map((section, index) => (
            <PromptSectionCard
              key={section.id}
              section={section}
              index={index}
              isNew={newSectionIds.has(section.id)}
              onAgentClick={selectNode}
            />
          ))
        )}
      </div>
    </aside>
  )
}

/* ── Stat Pill with direction flash ── */
function StatPill({
  icon,
  animatedValue,
  label,
  direction,
}: {
  icon: React.ReactNode
  animatedValue: ReturnType<typeof useAnimatedNumber>
  label: string
  direction: 'up' | 'down' | null
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-[5px] rounded-full bg-surface-tertiary/50 border border-border-subtle transition-colors ${
        direction === 'up' ? 'prompt-stat-up' : direction === 'down' ? 'prompt-stat-down' : ''
      }`}
    >
      <motion.span
        animate={direction ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.3, ease: EASE }}
      >
        {icon}
      </motion.span>
      <motion.span className="text-[11px] font-semibold text-content-primary tabular-nums leading-none">
        {animatedValue}
      </motion.span>
      <span className="text-[9.5px] text-content-tertiary font-medium leading-none">
        {label}
      </span>
    </div>
  )
}

/* ── Empty State with sonar rings ── */
function EmptyState() {
  const steps = [
    {
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent/60">
          <path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
          <path d="M2 6c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
          <path d="M2 18c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
        </svg>
      ),
      text: 'Add a wave',
    },
    {
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent/60">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      text: 'Drop in agents',
    },
    {
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent/60">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      ),
      text: 'Copy your prompt',
    },
  ]

  return (
    <div className="flex flex-col items-center gap-4 py-12 px-4">
      {/* Sonar rings illustration */}
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* Sonar rings */}
        {[0, 0.8, 1.6].map((delay, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-accent/20 prompt-sonar-ring"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
        {/* Center icon */}
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/4 border border-accent/12 flex items-center justify-center z-10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-accent/50">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
        </div>
      </div>

      <div className="text-center">
        <p className="text-[13px] font-semibold text-content-primary">
          Build your prompt
        </p>
        <p className="text-[11px] text-content-tertiary leading-relaxed mt-1.5 max-w-[260px]">
          Add waves and agents to the canvas. Your prompt will appear here, ready to paste into Claude Code or your preferred AI launcher.
        </p>
      </div>

      {/* Steps with connecting line */}
      <div className="relative flex flex-col gap-2 w-full max-w-[220px] mt-1">
        {/* Connecting dashed line */}
        <div
          className="absolute left-[18px] top-[16px] w-px border-l border-dashed border-accent/15"
          style={{ height: 'calc(100% - 32px)' }}
        />

        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.3, ease: EASE }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] bg-surface-tertiary/30 border border-border-subtle/60 relative"
          >
            <div className="w-6 h-6 rounded-full bg-accent/8 border border-accent/15 flex items-center justify-center shrink-0 z-10">
              <span className="text-[9px] font-bold text-accent tabular-nums">{i + 1}</span>
            </div>
            <span className="text-[10.5px] font-medium text-content-secondary">
              {step.text}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ── Section Card ── */
function PromptSectionCard({
  section,
  index,
  isNew,
  onAgentClick,
}: {
  section: PromptSection
  index: number
  isNew: boolean
  onAgentClick: (id: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [hovered, setHovered] = useState(false)

  const roleColor = section.agentRole ? ROLE_ACCENT[section.agentRole] : null
  const borderColor = roleColor
    ? roleColor
    : section.type === 'preamble'
      ? 'var(--color-accent)'
      : section.type === 'data-flow'
        ? 'var(--color-content-tertiary)'
        : section.type === 'control-flow'
          ? '#f59e0b'
          : section.type === 'deliverables'
            ? '#10b981'
            : section.type === 'permissions'
              ? '#f59e0b'
              : 'var(--color-border-default)'

  // Type-specific background gradient
  const bgGradient = section.type === 'preamble'
    ? 'linear-gradient(135deg, oklch(0.585 0.233 277.117 / 0.03) 0%, transparent 60%)'
    : section.type === 'agent' && roleColor
      ? `linear-gradient(135deg, ${roleColor}08 0%, transparent 60%)`
      : section.type === 'control-flow'
        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.03) 0%, transparent 60%)'
        : section.type === 'deliverables'
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, transparent 60%)'
          : section.type === 'permissions'
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.03) 0%, transparent 60%)'
            : 'none'

  const isClickable = section.type === 'agent' && section.agentId

  const handleClick = () => {
    if (isClickable) {
      onAgentClick(section.agentId!)
    }
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCollapsed((v) => !v)
  }

  // Clean content: strip markdown headers
  const cleanContent = section.content.replace(/^#{1,3}\s.+\n\n?/, '').trim()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25, ease: EASE }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`rounded-[8px] border border-border-subtle overflow-hidden ${
        isClickable ? 'cursor-pointer hover:border-border-default' : ''
      } ${isNew ? 'prompt-section-shimmer' : ''} transition-all duration-150`}
      style={{
        background: bgGradient,
        boxShadow: 'var(--shadow-prompt-card)',
      }}
    >
      <div className="flex">
        {/* Left accent bar with vertical gradient */}
        <motion.div
          className="shrink-0 rounded-l-[8px]"
          animate={{ width: hovered && isClickable ? 6 : 4 }}
          transition={{ duration: 0.15 }}
          style={{
            background: `linear-gradient(180deg, ${borderColor} 0%, ${borderColor}66 100%)`,
            opacity: section.type === 'agent' ? 0.85 : 0.45,
          }}
        />

        <div className="flex-1 min-w-0 p-3">
          {/* Section header row */}
          <div className="flex items-center gap-2 mb-1">
            {/* Icon with faint circular bg */}
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{ background: `${borderColor}10` }}
            >
              <SectionIcon type={section.type} color={borderColor} />
            </div>

            {/* Type badge */}
            <span
              className="text-[8.5px] font-bold uppercase tracking-widest px-1.5 py-[1px] rounded bg-surface-tertiary/60 border border-border-subtle/60"
              style={{
                color: section.agentRole
                  ? ROLE_ACCENT[section.agentRole]
                  : 'var(--color-content-tertiary)',
              }}
            >
              {SECTION_TYPE_LABELS[section.type] || section.type}
            </span>

            {/* Collapse/expand toggle */}
            <button
              onClick={handleToggle}
              className="ml-auto p-0.5 rounded text-content-tertiary/50 hover:text-content-secondary transition-colors"
            >
              <motion.svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                animate={{ rotate: collapsed ? -90 : 0 }}
                transition={{ duration: 0.15 }}
              >
                <polyline points="4 6 8 10 12 6" />
              </motion.svg>
            </button>

            {/* Agent click chevron */}
            <AnimatePresence>
              {isClickable && hovered && (
                <motion.svg
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 0.4, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.12 }}
                  width="10"
                  height="10"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="text-content-tertiary shrink-0"
                  onClick={handleClick}
                >
                  <polyline points="6 4 10 8 6 12" />
                </motion.svg>
              )}
            </AnimatePresence>
          </div>

          {/* Title */}
          <div
            className={`text-[11.5px] font-semibold text-content-secondary truncate mb-1 ${
              isClickable ? 'hover:text-accent transition-colors' : ''
            }`}
            onClick={handleClick}
          >
            {section.title}
          </div>

          {/* Collapsible content */}
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
                className="overflow-hidden"
              >
                {/* Skill pills */}
                {section.skills && section.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {section.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded-pill text-[9.5px] font-medium bg-accent-muted text-accent border border-accent/15"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {/* Content */}
                <div className="text-[11px] leading-[1.7] text-content-secondary whitespace-pre-wrap break-words line-clamp-6">
                  {cleanContent}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Section Icon ── */
function SectionIcon({ type, color }: { type: PromptSection['type']; color: string }) {
  const cls = 'w-3 h-3 shrink-0'

  switch (type) {
    case 'preamble':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={cls} style={{ color }}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5l4 4L7 21l-4 1 1-4L16.5 3.5z" />
        </svg>
      )
    case 'execution-order':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`${cls} text-content-secondary`}>
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      )
    case 'agent':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={cls} style={{ color }}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    case 'data-flow':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`${cls} text-content-secondary`}>
          <polyline points="16 3 21 3 21 8" />
          <line x1="4" y1="20" x2="21" y2="3" />
        </svg>
      )
    case 'permissions':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`${cls} text-amber-400`}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )
    case 'deliverables':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`${cls} text-emerald-400`}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )
    case 'control-flow':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${cls} text-amber-400`}>
          <path d="M16 3h5v5" />
          <line x1="4" y1="20" x2="21" y2="3" />
          <path d="M21 16v5h-5" />
          <line x1="15" y1="15" x2="21" y2="21" />
          <line x1="4" y1="4" x2="9" y2="9" />
        </svg>
      )
    case 'suffix':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`${cls} text-content-secondary`}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    default:
      return null
  }
}
