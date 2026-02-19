import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { useUIStore } from '../../stores/ui-store'
import { SkillIcon } from '../nodes/SkillIcon'
import { categorizeSkill, getSkillAccentColor, getSkillGradient } from '../../types/workflow'

const EASE = [0.25, 0.46, 0.45, 0.94] as const

export function SkillViewer() {
  const skillViewerSkill = useUIStore((s) => s.skillViewerSkill)
  const closeSkillViewer = useUIStore((s) => s.closeSkillViewer)

  return (
    <AnimatePresence>
      {skillViewerSkill && (
        <SkillViewerInner
          key={skillViewerSkill.path}
          name={skillViewerSkill.name}
          path={skillViewerSkill.path}
          onClose={closeSkillViewer}
        />
      )}
    </AnimatePresence>
  )
}

function SkillViewerInner({
  name,
  path,
  onClose,
}: {
  name: string
  path: string
  onClose: () => void
}) {
  const [content, setContent] = useState<string | null | undefined>(undefined) // undefined = loading
  const [scrollPercent, setScrollPercent] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const category = useMemo(() => categorizeSkill(name), [name])
  const accentColor = useMemo(() => getSkillAccentColor(name), [name])
  const [gradFrom, gradTo] = useMemo(() => getSkillGradient(name), [name])

  // Load content
  useEffect(() => {
    let cancelled = false
    setContent(undefined)

    const load = async () => {
      if (window.api?.readSkillContent) {
        const result = await window.api.readSkillContent(path)
        if (!cancelled) setContent(result)
      } else {
        // Non-Electron fallback
        if (!cancelled) setContent(null)
      }
    }

    load()
    return () => { cancelled = true }
  }, [path])

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const maxScroll = scrollHeight - clientHeight
      setScrollPercent(maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0)
    }
  }, [])

  // Markdown component overrides (memoized to avoid re-creation)
  const markdownComponents = useMemo(() => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    a: (props: any) => (
      <a {...props} target="_blank" rel="noopener noreferrer">
        {props.children}
      </a>
    ),
  }), [])

  const isLoading = content === undefined
  const hasContent = typeof content === 'string' && content.length > 0
  const noContent = content === null || (typeof content === 'string' && content.length === 0)

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="skill-viewer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[16px]"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        key="skill-viewer-panel"
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
          w-[calc(100vw-120px)] max-w-3xl h-[calc(100vh-80px)] max-h-[820px]
          rounded-2xl bg-surface-elevated backdrop-blur-xl
          border border-border-subtle shadow-elevated
          overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent bar sweep on open */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-[2px] z-10 rounded-t-2xl origin-left"
          style={{
            background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`,
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.2, duration: 0.4, ease: EASE }}
        />

        {/* Reading progress bar */}
        <motion.div
          className="absolute top-0 left-0 h-[2px] z-20 rounded-t-2xl"
          style={{
            width: `${scrollPercent}%`,
            background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: scrollPercent > 0 ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3, ease: EASE }}
          className="relative px-6 pt-5 pb-4 shrink-0 border-b border-border-subtle"
          style={{
            background: `linear-gradient(135deg, ${gradFrom}12 0%, transparent 60%)`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Skill icon with gradient bg */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-200"
                style={{
                  background: `linear-gradient(135deg, ${gradFrom}20 0%, ${gradTo}14 100%)`,
                  borderColor: `${accentColor}30`,
                }}
              >
                <SkillIcon skillName={name} category={category} size={24} />
              </div>

              <div>
                <h2 className="text-[17px] font-bold text-content-primary tracking-tight">
                  {name}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold border"
                    style={{
                      color: accentColor,
                      borderColor: `${accentColor}30`,
                      background: `${accentColor}10`,
                    }}
                  >
                    {category}
                  </span>
                  <span className="text-[11px] text-content-tertiary">
                    Skill Documentation
                  </span>
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-content-tertiary hover:text-content-primary hover:bg-surface-tertiary transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </motion.div>

        {/* Content area */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto min-h-0 px-8 py-6"
        >
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="space-y-5 pt-2"
            >
              {[92, 70, 85, 60, 78].map((width, i) => (
                <div
                  key={i}
                  className="skill-viewer-skeleton-line rounded-md"
                  style={{
                    width: `${width}%`,
                    height: i === 0 ? '24px' : '14px',
                    background: 'var(--color-surface-tertiary)',
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </motion.div>
          )}

          {noContent && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="flex flex-col items-center justify-center h-full gap-4 py-16"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center border"
                style={{
                  background: `linear-gradient(135deg, ${gradFrom}12 0%, ${gradTo}08 100%)`,
                  borderColor: `${accentColor}20`,
                }}
              >
                <SkillIcon skillName={name} category={category} size={28} />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-semibold text-content-primary">
                  No documentation available
                </p>
                <p className="text-[12px] text-content-tertiary leading-relaxed mt-1.5 max-w-[300px]">
                  This skill does not have a SKILL.md file. The skill may still work, but no documentation was found.
                </p>
              </div>
            </motion.div>
          )}

          {hasContent && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3, ease: EASE }}
              className="skill-viewer-markdown max-w-[640px]"
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[[rehypeHighlight, { detect: true }]]}
                components={markdownComponents}
              >
                {content}
              </ReactMarkdown>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border-subtle flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div
              className="w-[5px] h-[5px] rounded-full"
              style={{ background: accentColor }}
            />
            <span className="text-[10px] text-content-tertiary">
              {name}
            </span>
          </div>
          <span className="text-[10px] text-content-tertiary/60">
            Press <kbd className="px-1.5 py-0.5 rounded bg-surface-tertiary border border-border-subtle text-[9px] font-mono font-semibold">Esc</kbd> to close
          </span>
        </div>
      </motion.div>
    </>
  )
}
