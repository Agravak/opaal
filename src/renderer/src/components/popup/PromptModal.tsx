import { useState, useMemo, useCallback, useRef, useEffect, Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../stores/ui-store'
import { useWorkflowStore } from '../../stores/workflow-store'
import { generatePrompt, type PromptSection } from '../../lib/prompt-generator'
import { ROLE_ACCENT, ROLE_META } from '../../types/workflow'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'

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
    const dist = 32 + Math.random() * 18
    return { id: i, px: Math.cos(rad) * dist, py: Math.sin(rad) * dist }
  })
}

/* ── Lazy Monaco ── */
const MonacoEditor = lazy(() => import('@monaco-editor/react'))

export function PromptModal() {
  const promptModalOpen = useUIStore((s) => s.promptModalOpen)
  const closePromptModal = useUIStore((s) => s.closePromptModal)
  const theme = useUIStore((s) => s.theme)
  const workflow = useWorkflowStore((s) => s.workflow)

  const generated = useMemo(() => generatePrompt(workflow), [workflow])
  const animatedWordCount = useAnimatedNumber(generated.wordCount)
  const animatedAgentCount = useAnimatedNumber(generated.agentCount)
  const animatedWaveCount = useAnimatedNumber(generated.waveCount)

  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted')

  // Copy celebration state
  const [copied, setCopied] = useState(false)
  const [particles, setParticles] = useState<{ id: number; px: number; py: number }[]>([])
  const [showRipple, setShowRipple] = useState(false)
  const [exported, setExported] = useState(false)

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
    setParticles(generateParticles(8))
    setShowRipple(true)
    setTimeout(() => setShowRipple(false), 500)
    setTimeout(() => setParticles([]), 500)
    setTimeout(() => setCopied(false), 2000)
  }, [generated.fullText])

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

  const hasContent = generated.wordCount > 0
  const showToc = generated.sections.length >= 4

  // Scroll tracking for TOC and frosted header
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const setSectionRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) sectionRefs.current.set(id, el)
    else sectionRefs.current.delete(id)
  }, [])

  // IntersectionObserver for TOC active tracking
  useEffect(() => {
    if (!promptModalOpen || !hasContent) return

    const observer = new IntersectionObserver(
      (entries) => {
        let bestEntry: IntersectionObserverEntry | null = null
        let bestRatio = 0
        for (const entry of entries) {
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio
            bestEntry = entry
          }
        }
        if (bestEntry && bestRatio > 0) {
          const id = (bestEntry.target as HTMLElement).dataset.sectionId
          if (id) setActiveSectionId(id)
        }
      },
      {
        root: scrollRef.current,
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: '-10% 0px -60% 0px',
      }
    )

    // Observe after a brief delay to let DOM render
    const timer = setTimeout(() => {
      sectionRefs.current.forEach((el) => observer.observe(el))
    }, 500)

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [promptModalOpen, hasContent, generated.sections.length])

  // Scroll detection for frosted header
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrolled(scrollRef.current.scrollTop > 10)
    }
  }, [])

  // TOC click handler
  const scrollToSection = useCallback((sectionId: string) => {
    const el = sectionRefs.current.get(sectionId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // Monaco theme registration
  const monacoMounted = useRef(false)
  const handleMonacoMount = useCallback((_editor: unknown, monaco: unknown) => {
    if (monacoMounted.current) return
    monacoMounted.current = true
    const m = monaco as {
      editor: {
        defineTheme: (name: string, data: Record<string, unknown>) => void
      }
    }

    m.editor.defineTheme('opaal-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '818cf8', fontStyle: 'bold' },
        { token: 'string', foreground: '86efac' },
        { token: 'comment', foreground: '3a3a52' },
        { token: 'type', foreground: 'c4b5fd' },
        { token: 'number', foreground: 'f59e0b' },
        { token: 'variable', foreground: '38bdf8' },
      ],
      colors: {
        'editor.background': '#12121c',
        'editor.foreground': '#c8c8e0',
        'editorGutter.background': '#0e0e16',
        'editorLineNumber.foreground': '#3a3a52',
        'editorLineNumber.activeForeground': '#7a7a96',
        'editor.lineHighlightBackground': '#1a1a2e',
        'editor.selectionBackground': '#818cf830',
        'editorOverviewRuler.border': '#00000000',
        'scrollbar.shadow': '#00000000',
        'editor.inactiveSelectionBackground': '#818cf818',
        'editorWidget.background': '#1c1c2c',
        'editorWidget.border': '#262638',
      },
    })

    m.editor.defineTheme('opaal-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '6366f1', fontStyle: 'bold' },
        { token: 'string', foreground: '059669' },
        { token: 'comment', foreground: 'b0b4bc' },
        { token: 'type', foreground: '7c3aed' },
        { token: 'number', foreground: 'd97706' },
        { token: 'variable', foreground: '0284c7' },
      ],
      colors: {
        'editor.background': '#fafbfc',
        'editor.foreground': '#5b6270',
        'editorGutter.background': '#f4f5f7',
        'editorLineNumber.foreground': '#b0b4bc',
        'editorLineNumber.activeForeground': '#5b6270',
        'editor.lineHighlightBackground': '#f0f1f4',
        'editor.selectionBackground': '#6366f130',
        'editorOverviewRuler.border': '#00000000',
        'scrollbar.shadow': '#00000000',
        'editor.inactiveSelectionBackground': '#6366f118',
        'editorWidget.background': '#ffffff',
        'editorWidget.border': '#e2e4e9',
      },
    })
  }, [])

  // Count lines/chars for raw mode footer
  const lineCount = generated.fullText.split('\n').length
  const charCount = generated.fullText.length

  return (
    <AnimatePresence>
      {promptModalOpen && (
        <>
          {/* ── Stage 1: Backdrop ── */}
          <motion.div
            key="prompt-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[16px]"
            onClick={closePromptModal}
          />

          {/* ── Stage 2: Panel materializes ── */}
          <motion.div
            key="prompt-modal-panel"
            initial={{ opacity: 0, scale: 0.88, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{
              type: 'spring',
              stiffness: 320,
              damping: 26,
              mass: 0.9,
            }}
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              w-[calc(100vw-100px)] max-w-[920px] h-[calc(100vh-80px)] max-h-[860px]
              rounded-2xl bg-surface-elevated backdrop-blur-xl
              border border-border-subtle shadow-elevated
              overflow-hidden flex flex-col prompt-paper-texture"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Stage 3: Accent bar draws left-to-right ── */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl prompt-accent-sweep origin-left"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.2, duration: 0.4, ease: EASE }}
            />

            {/* ── Header ── */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.3, ease: EASE }}
              className={`relative px-6 pt-5 pb-0 shrink-0 transition-all duration-200 ${
                scrolled ? 'bg-surface-elevated/90 backdrop-blur-xl shadow-sm' : ''
              }`}
              style={{ zIndex: 10 }}
            >
              {/* Top row: title + actions + close */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* Rotating icon */}
                  <div className="relative w-11 h-11 shrink-0">
                    <div className="absolute inset-0 rounded-xl prompt-icon-rotate opacity-25"
                      style={{
                        background: 'conic-gradient(from 0deg, var(--color-accent), transparent 25%, var(--color-accent-glow) 50%, transparent 75%, var(--color-accent))',
                      }}
                    />
                    <div className="absolute inset-[1.5px] rounded-[10px] bg-gradient-to-br from-accent/12 to-accent/4 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-accent">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <line x1="10" y1="9" x2="8" y2="9" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-[17px] font-bold text-content-primary tracking-tight">
                      Generated Prompt
                    </h2>
                    {workflow.name && (
                      <p className="text-[12px] text-content-tertiary mt-0.5">
                        for <span className="text-content-secondary font-medium">{workflow.name}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Segmented view toggle */}
                  <div className="flex items-center bg-surface-tertiary/60 rounded-lg border border-border-subtle p-0.5 relative" style={{ width: 180 }}>
                    <motion.div
                      className="absolute top-0.5 bottom-0.5 rounded-md bg-accent shadow-sm"
                      style={{ width: 'calc(50% - 2px)' }}
                      animate={{ left: viewMode === 'formatted' ? 2 : 'calc(50%)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                    <button
                      onClick={() => setViewMode('formatted')}
                      className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-semibold transition-colors duration-150 ${
                        viewMode === 'formatted' ? 'text-white' : 'text-content-tertiary hover:text-content-secondary'
                      }`}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <line x1="3" y1="6" x2="3.01" y2="6" />
                        <line x1="3" y1="12" x2="3.01" y2="12" />
                        <line x1="3" y1="18" x2="3.01" y2="18" />
                      </svg>
                      Formatted
                    </button>
                    <button
                      onClick={() => setViewMode('raw')}
                      className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-semibold transition-colors duration-150 ${
                        viewMode === 'raw' ? 'text-white' : 'text-content-tertiary hover:text-content-secondary'
                      }`}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                      Raw
                    </button>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 relative">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleCopy}
                      disabled={!hasContent}
                      className={`h-[32px] px-4 rounded-button flex items-center gap-2 text-[11px] font-semibold transition-all duration-200 relative overflow-hidden ${
                        copied
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          : hasContent
                            ? 'bg-accent text-white hover:bg-accent-hover shadow-sm'
                            : 'bg-surface-tertiary/60 text-content-tertiary/40 cursor-not-allowed'
                      }`}
                    >
                      <AnimatePresence mode="wait">
                        {copied ? (
                          <motion.span key="copied" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.12 }} className="flex items-center gap-2">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="prompt-checkmark-draw">
                              <polyline points="4 12 10 18 20 6" />
                            </svg>
                            Copied!
                          </motion.span>
                        ) : (
                          <motion.span key="copy" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.12 }} className="flex items-center gap-2">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Copy
                          </motion.span>
                        )}
                      </AnimatePresence>
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
                        className="absolute top-1/2 left-[20px] w-[3px] h-[3px] rounded-full bg-accent prompt-copy-particle"
                        style={{ '--px': `${p.px}px`, '--py': `${p.py}px` } as React.CSSProperties}
                      />
                    ))}

                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleExport}
                      disabled={!hasContent}
                      className={`h-[32px] px-3 rounded-button flex items-center gap-2 text-[11px] font-semibold transition-all duration-200 ${
                        exported
                          ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20'
                          : hasContent
                            ? 'border border-accent/30 text-accent hover:bg-accent/8 hover:border-accent/50'
                            : 'border border-border-subtle text-content-tertiary/40 cursor-not-allowed'
                      }`}
                    >
                      {exported ? (
                        <>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="prompt-checkmark-draw">
                            <polyline points="4 12 10 18 20 6" />
                          </svg>
                          Saved
                        </>
                      ) : (
                        <>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Export .md
                        </>
                      )}
                    </motion.button>
                  </div>

                  <button
                    onClick={closePromptModal}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-content-tertiary hover:text-content-primary hover:bg-surface-tertiary transition-all"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Stat ribbon */}
              <div className="flex items-stretch -mx-6 border-y border-border-subtle bg-surface-secondary/50" style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)' }}>
                <StatColumn
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-accent/60">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  }
                  animatedValue={animatedWordCount}
                  label="WORDS"
                />
                <div className="w-px bg-border-subtle shrink-0" />
                <StatColumn
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-accent/60">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  }
                  animatedValue={animatedAgentCount}
                  label="AGENTS"
                />
                <div className="w-px bg-border-subtle shrink-0" />
                <StatColumn
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-accent/60">
                      <path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
                      <path d="M2 6c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
                      <path d="M2 18c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
                    </svg>
                  }
                  animatedValue={animatedWaveCount}
                  label="WAVES"
                />
              </div>
            </motion.div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-hidden min-h-0">
              <AnimatePresence mode="wait">
                {!hasContent ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    <ModalEmptyState />
                  </motion.div>
                ) : viewMode === 'formatted' ? (
                  <motion.div
                    key="formatted"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className="h-full flex"
                  >
                    {/* TOC sidebar */}
                    {showToc && (
                      <div className="w-[180px] shrink-0 border-r border-border-subtle overflow-y-auto py-4 px-3">
                        <p className="text-[8.5px] font-bold uppercase tracking-widest text-content-tertiary mb-3 px-2">
                          Contents
                        </p>
                        {generated.sections.map((section) => {
                          const isActive = activeSectionId === section.id
                          return (
                            <button
                              key={section.id}
                              onClick={() => scrollToSection(section.id)}
                              className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-[10.5px] transition-all duration-150 mb-0.5 ${
                                isActive
                                  ? 'text-content-primary bg-accent/6 border-l-2 border-accent'
                                  : 'text-content-tertiary hover:text-content-secondary hover:bg-surface-tertiary/50 border-l-2 border-transparent'
                              }`}
                            >
                              <TocIcon type={section.type} />
                              <span className="truncate font-medium">{section.title.replace(/\s*\(.*\)/, '')}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Section cards */}
                    <div
                      ref={scrollRef}
                      onScroll={handleScroll}
                      className="flex-1 overflow-y-auto min-h-0 p-6 space-y-3"
                      style={{ scrollBehavior: 'smooth' }}
                    >
                      {generated.sections.map((section, index) => (
                        <div
                          key={section.id}
                          ref={(el) => setSectionRef(section.id, el)}
                          data-section-id={section.id}
                        >
                          <ModalSectionCard
                            section={section}
                            index={index}
                            workflow={workflow}
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="raw"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className="h-full flex flex-col"
                  >
                    {/* Monaco editor */}
                    <div className="flex-1 min-h-0 relative prompt-monaco-container">
                      {/* Top gradient blend */}
                      <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-surface-elevated to-transparent z-10 pointer-events-none rounded-t-xl" />

                      <Suspense
                        fallback={
                          <div className="w-full h-full p-6">
                            <div className="w-full h-full prompt-monaco-skeleton" />
                          </div>
                        }
                      >
                        <MonacoEditor
                          value={generated.fullText}
                          language="markdown"
                          theme={theme === 'dark' ? 'opaal-dark' : 'opaal-light'}
                          onMount={handleMonacoMount}
                          options={{
                            readOnly: true,
                            minimap: { enabled: true, maxColumn: 80, renderCharacters: false },
                            lineNumbers: 'on',
                            lineNumbersMinChars: 3,
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            wrappingStrategy: 'advanced',
                            fontSize: 12,
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            fontLigatures: true,
                            lineHeight: 22,
                            padding: { top: 16, bottom: 16 },
                            renderLineHighlight: 'gutter',
                            scrollbar: {
                              verticalScrollbarSize: 6,
                              horizontalScrollbarSize: 6,
                            },
                            overviewRulerLanes: 0,
                            hideCursorInOverviewRuler: true,
                            contextmenu: false,
                            folding: true,
                            foldingStrategy: 'indentation',
                            guides: { indentation: false },
                            domReadOnly: true,
                          }}
                        />
                      </Suspense>
                    </div>

                    {/* Raw mode footer */}
                    <div className="px-6 py-2 border-t border-border-subtle flex items-center gap-4 shrink-0">
                      <span className="text-[10px] text-content-tertiary font-mono tabular-nums">
                        {lineCount} lines
                      </span>
                      <span className="text-[8px] text-content-tertiary/40">|</span>
                      <span className="text-[10px] text-content-tertiary font-mono tabular-nums">
                        {charCount.toLocaleString()} characters
                      </span>
                      <span className="text-[8px] text-content-tertiary/40">|</span>
                      <span className="text-[10px] text-content-tertiary">
                        <kbd className="px-1 py-0.5 rounded bg-surface-tertiary border border-border-subtle text-[9px] font-mono font-semibold">Ctrl+F</kbd>
                        <span className="ml-1.5">to search</span>
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Footer ── */}
            {hasContent && viewMode === 'formatted' && (
              <div className="px-6 py-3 border-t border-border-subtle flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="relative shrink-0">
                    <div className="w-[6px] h-[6px] rounded-full bg-emerald-400" />
                    <div className="absolute inset-0 w-[6px] h-[6px] rounded-full bg-emerald-400 prompt-ring-pulse" />
                  </div>
                  <span className="text-[10px] text-content-tertiary">
                    Live — updates as you edit the canvas
                  </span>
                </div>
                <span className="text-[10px] text-content-tertiary/60">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-surface-tertiary border border-border-subtle text-[9px] font-mono font-semibold">Esc</kbd> to close
                </span>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ── Stat Column for ribbon ── */
function StatColumn({
  icon,
  animatedValue,
  label,
}: {
  icon: React.ReactNode
  animatedValue: ReturnType<typeof useAnimatedNumber>
  label: string
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-3 gap-1">
      {icon}
      <motion.span className="text-[18px] font-bold text-content-primary tabular-nums leading-none tracking-tight">
        {animatedValue}
      </motion.span>
      <span className="text-[9px] uppercase tracking-widest text-content-tertiary font-semibold">
        {label}
      </span>
    </div>
  )
}

/* ── TOC Icon (tiny) ── */
function TocIcon({ type }: { type: PromptSection['type'] }) {
  const cls = 'w-3 h-3 shrink-0 opacity-50'
  switch (type) {
    case 'preamble':
      return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={cls}><path d="M12 20h9" /><path d="M16.5 3.5l4 4L7 21l-4 1 1-4L16.5 3.5z" /></svg>
    case 'execution-order':
      return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={cls}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
    case 'agent':
      return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={cls}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
    case 'data-flow':
      return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={cls}><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /></svg>
    case 'permissions':
      return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={cls}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
    case 'deliverables':
      return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={cls}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
    case 'control-flow':
      return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}><path d="M16 3h5v5" /><line x1="4" y1="20" x2="21" y2="3" /><path d="M21 16v5h-5" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" /></svg>
    case 'suffix':
      return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={cls}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
    default:
      return null
  }
}

/* ── Section Card — type-specific designs ── */
function ModalSectionCard({
  section,
  index,
  workflow,
}: {
  section: PromptSection
  index: number
  workflow: ReturnType<typeof useWorkflowStore.getState>['workflow']
}) {
  const cleanContent = section.content.replace(/^#{1,3}\s.+\n\n?/, '').trim()

  const roleColor = section.agentRole ? ROLE_ACCENT[section.agentRole] : null
  const borderColor = roleColor
    ? roleColor
    : section.type === 'preamble'
      ? 'var(--color-accent)'
      : section.type === 'control-flow'
        ? '#f59e0b'
        : section.type === 'deliverables'
          ? '#10b981'
          : section.type === 'permissions'
            ? '#f59e0b'
            : 'var(--color-border-default)'

  const staggerDelay = Math.min(index * 0.06, 0.72) // Cap at 12 sections

  // ── Preamble: "The Opening Statement" ──
  if (section.type === 'preamble') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.35 + staggerDelay, type: 'spring', stiffness: 350, damping: 28 }}
        className="rounded-xl bg-accent/[0.02] border border-accent/10 p-5 relative overflow-hidden"
      >
        {/* Decorative quote mark */}
        <span className="absolute -top-1 -left-0.5 text-[48px] font-serif text-accent/[0.06] leading-none select-none pointer-events-none">
          &ldquo;
        </span>
        <div className="flex items-center gap-2 mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
            <path d="M12 20h9" />
            <path d="M16.5 3.5l4 4L7 21l-4 1 1-4L16.5 3.5z" />
          </svg>
          <span className="text-[8.5px] font-bold uppercase tracking-widest text-accent">PREAMBLE</span>
        </div>
        <p className="text-[13px] leading-[1.8] text-content-secondary whitespace-pre-wrap relative z-10">
          {cleanContent}
        </p>
        <div className="mt-4 h-px bg-gradient-to-r from-accent/20 to-transparent" />
      </motion.div>
    )
  }

  // ── Execution Order: "The Battle Plan" ──
  if (section.type === 'execution-order') {
    const waves: { name: string; agents: string[] }[] = []
    const lines = cleanContent.split('\n').filter(Boolean)
    let currentWave: { name: string; agents: string[] } | null = null

    for (const line of lines) {
      const waveName = line.match(/\*\*(.+?)\*\*/)
      if (waveName) {
        const agentInline = line.match(/\*\*.*\*\*:\s*(.+)/)
        currentWave = { name: waveName[1], agents: agentInline ? [agentInline[1]] : [] }
        waves.push(currentWave)
      } else if (line.startsWith('- ') && currentWave) {
        currentWave.agents.push(line.slice(2))
      }
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.35 + staggerDelay, type: 'spring', stiffness: 350, damping: 28 }}
        className="rounded-xl border border-border-subtle bg-surface-elevated/60 p-5"
        style={{ boxShadow: 'var(--shadow-prompt-card)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-full bg-surface-tertiary/80 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-content-secondary">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </div>
          <span className="text-[8.5px] font-bold uppercase tracking-widest text-content-tertiary">EXECUTION ORDER</span>
        </div>

        {/* Timeline */}
        <div className="relative pl-6">
          <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border-default" />
          {waves.map((wave, i) => (
            <div key={i} className="relative mb-4 last:mb-0">
              <div className="absolute left-[-19px] top-0.5 w-3 h-3 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              </div>
              <div className="text-[12px] font-semibold text-content-primary mb-1">{wave.name}</div>
              {wave.agents.map((agent, j) => (
                <div key={j} className="text-[11px] text-content-secondary ml-2 flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-content-tertiary/40" />
                  {agent}
                </div>
              ))}
            </div>
          ))}
        </div>
      </motion.div>
    )
  }

  // ── Agent Sections: "The Dossiers" ──
  if (section.type === 'agent') {
    const roleMeta = section.agentRole ? ROLE_META[section.agentRole] : null

    const inputsMatch = cleanContent.match(/\*\*Inputs:\*\*\n((?:- .+\n?)+)/)
    const outputMatch = cleanContent.match(/\*\*Output:\*\* (.+)/)
    const instructionsMatch = cleanContent.match(/\*\*Instructions:\*\*\n([\s\S]+?)$/)
    const descriptionMatch = cleanContent.match(/^(.+?)(?=\n\n|\n\*\*|$)/)

    return (
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.35 + staggerDelay, type: 'spring', stiffness: 350, damping: 28 }}
        className="rounded-xl border border-border-subtle overflow-hidden group hover:-translate-y-px transition-transform duration-150"
        style={{
          boxShadow: 'var(--shadow-prompt-card)',
          background: `linear-gradient(135deg, ${roleColor}06 0%, transparent 60%)`,
        }}
      >
        <div className="flex">
          <div
            className="w-1 shrink-0"
            style={{
              background: `linear-gradient(180deg, ${roleColor} 0%, ${roleColor}66 100%)`,
              boxShadow: `2px 0 12px ${roleColor}15`,
            }}
          />
          <div className="flex-1 min-w-0 p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: `${roleColor}12` }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: roleColor || undefined }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3 className="text-[14px] font-bold text-content-primary">{section.title.replace(/\s*\(.*\)/, '')}</h3>
              {roleMeta && (
                <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-semibold ${roleMeta.bg} ${roleMeta.text} ${roleMeta.border} border`}>
                  {roleMeta.label}
                </span>
              )}
            </div>

            {descriptionMatch && descriptionMatch[1] && !descriptionMatch[1].startsWith('**') && (
              <p className="text-[11.5px] leading-[1.7] text-content-secondary mb-3">
                {descriptionMatch[1].replace(/^This agent should use.*\n?/, '').trim()}
              </p>
            )}

            {section.skills && section.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {section.skills.map((skill) => (
                  <span key={skill} className="px-2.5 py-0.5 rounded-pill text-[10.5px] font-medium bg-accent-muted text-accent border border-accent/15">
                    {skill}
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {inputsMatch && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-content-tertiary">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    <span className="text-[10px] uppercase tracking-wider text-content-tertiary font-semibold">Inputs</span>
                  </div>
                  <div className="text-[11px] leading-[1.7] text-content-secondary whitespace-pre-wrap pl-4">{inputsMatch[1].trim()}</div>
                </div>
              )}
              {outputMatch && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-content-tertiary">
                      <polyline points="16 3 21 3 21 8" />
                      <line x1="4" y1="20" x2="21" y2="3" />
                    </svg>
                    <span className="text-[10px] uppercase tracking-wider text-content-tertiary font-semibold">Output</span>
                  </div>
                  <p className="text-[11px] leading-[1.7] text-content-secondary pl-4">{outputMatch[1]}</p>
                </div>
              )}
              {instructionsMatch && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-content-tertiary">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="text-[10px] uppercase tracking-wider text-content-tertiary font-semibold">Instructions</span>
                  </div>
                  <div className="text-[11px] leading-[1.7] text-content-secondary whitespace-pre-wrap pl-4">{instructionsMatch[1].trim()}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // ── Data Flow: "The Connections" ──
  if (section.type === 'data-flow') {
    const connections = cleanContent.split('\n').filter((l) => l.startsWith('- '))

    return (
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.35 + staggerDelay, type: 'spring', stiffness: 350, damping: 28 }}
        className="rounded-xl border border-border-subtle bg-surface-elevated/60 p-5"
        style={{ boxShadow: 'var(--shadow-prompt-card)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-full bg-surface-tertiary/80 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-content-secondary">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
            </svg>
          </div>
          <span className="text-[8.5px] font-bold uppercase tracking-widest text-content-tertiary">DATA FLOW</span>
        </div>
        <div className="space-y-2">
          {connections.map((conn, i) => {
            const match = conn.match(/\*\*(.+?)\*\*\s*-->\s*\*\*(.+?)\*\*:\s*(.+)/)
            if (!match) return <div key={i} className="text-[11px] text-content-secondary">{conn.slice(2)}</div>

            const [, source, target, desc] = match
            const sourceAgent = workflow.agents.find((a) => a.name === source)
            const targetAgent = workflow.agents.find((a) => a.name === target)
            const sourceColor = sourceAgent ? ROLE_ACCENT[sourceAgent.role] : 'var(--color-content-tertiary)'
            const targetColor = targetAgent ? ROLE_ACCENT[targetAgent.role] : 'var(--color-content-tertiary)'

            return (
              <div key={i} className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold border" style={{ color: sourceColor, borderColor: `${sourceColor}30`, background: `${sourceColor}08` }}>
                  {source}
                </span>
                <svg width="16" height="8" viewBox="0 0 16 8" fill="none" className="shrink-0">
                  <defs>
                    <linearGradient id={`flow-${i}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={sourceColor} stopOpacity="0.5" />
                      <stop offset="100%" stopColor={targetColor} stopOpacity="0.5" />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="4" x2="12" y2="4" stroke={`url(#flow-${i})`} strokeWidth="1.5" />
                  <polyline points="10,1 14,4 10,7" fill="none" stroke={targetColor} strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold border" style={{ color: targetColor, borderColor: `${targetColor}30`, background: `${targetColor}08` }}>
                  {target}
                </span>
                <span className="text-[10.5px] text-content-tertiary">{desc}</span>
              </div>
            )
          })}
        </div>
      </motion.div>
    )
  }

  // ── Deliverables ──
  if (section.type === 'deliverables') {
    const items = cleanContent.split('\n').filter((l) => l.startsWith('- '))
    return (
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.35 + staggerDelay, type: 'spring', stiffness: 350, damping: 28 }}
        className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.02] p-5"
        style={{ boxShadow: 'var(--shadow-prompt-card)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-emerald-400">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <span className="text-[8.5px] font-bold uppercase tracking-widest text-emerald-400">DELIVERABLES</span>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => {
            const match = item.match(/- (.+?) \(from (.+?)\)/)
            return (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-4 h-4 mt-0.5 rounded-full border-2 border-emerald-400/30 shrink-0" />
                <div className="text-[11px] leading-[1.7] text-content-secondary">
                  {match ? (<>{match[1]}<span className="ml-1.5 text-[9.5px] text-content-tertiary">from {match[2]}</span></>) : item.slice(2)}
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>
    )
  }

  // ── Permissions ──
  if (section.type === 'permissions') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.35 + staggerDelay, type: 'spring', stiffness: 350, damping: 28 }}
        className="rounded-xl border border-amber-500/15 bg-amber-500/[0.02] p-5"
        style={{ boxShadow: 'var(--shadow-prompt-card)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-amber-400">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span className="text-[8.5px] font-bold uppercase tracking-widest text-amber-400">PERMISSIONS</span>
        </div>
        <p className="text-[11.5px] leading-[1.7] text-content-secondary">{cleanContent}</p>
      </motion.div>
    )
  }

  // ── Control Flow: "The Rules" ──
  if (section.type === 'control-flow') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.35 + staggerDelay, type: 'spring', stiffness: 350, damping: 28 }}
        className="rounded-xl border border-amber-500/15 bg-amber-500/[0.02] p-5"
        style={{ boxShadow: 'var(--shadow-prompt-card)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
              <path d="M16 3h5v5" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <path d="M21 16v5h-5" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
          </div>
          <span className="text-[8.5px] font-bold uppercase tracking-widest text-amber-400">CONTROL FLOW</span>
        </div>
        <div className="text-[11.5px] leading-[1.8] text-content-secondary whitespace-pre-wrap break-words">
          {cleanContent}
        </div>
      </motion.div>
    )
  }

  // ── Suffix / Default ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.35 + staggerDelay, type: 'spring', stiffness: 350, damping: 28 }}
      className="rounded-xl border border-border-subtle bg-surface-elevated/60 overflow-hidden"
      style={{ boxShadow: 'var(--shadow-prompt-card)' }}
    >
      <div className="flex">
        <div className="w-1 shrink-0" style={{ background: `linear-gradient(180deg, ${borderColor} 0%, ${borderColor}66 100%)`, opacity: 0.45 }} />
        <div className="flex-1 min-w-0 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-surface-tertiary/80 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-content-secondary">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <span className="text-[8.5px] font-bold uppercase tracking-widest text-content-tertiary">
              {SECTION_TYPE_LABELS[section.type] || section.type}
            </span>
          </div>
          <h3 className="text-[12.5px] font-semibold text-content-primary mb-2">{section.title}</h3>
          <div className="text-[11.5px] leading-[1.7] text-content-secondary whitespace-pre-wrap break-words">{cleanContent}</div>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Empty State ── */
function ModalEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
      <div className="relative w-18 h-18 flex items-center justify-center">
        {[0, 0.8, 1.6].map((delay, i) => (
          <div key={i} className="absolute w-16 h-16 rounded-full border-2 border-accent/15 prompt-sonar-ring" style={{ animationDelay: `${delay}s` }} />
        ))}
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/4 border border-accent/12 flex items-center justify-center z-10">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-accent/50">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold text-content-primary">No prompt yet</p>
        <p className="text-[12px] text-content-tertiary leading-relaxed mt-1.5 max-w-[300px]">
          Add agents to the canvas to generate your prompt. It will appear here ready to copy or export.
        </p>
      </div>
    </div>
  )
}
