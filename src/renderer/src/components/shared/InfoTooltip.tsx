import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface InfoTooltipProps {
  content: string
  delay?: number
}

const EASE = [0.25, 0.46, 0.45, 0.94] as const

interface TooltipPosition {
  x: number
  y: number
  placement: 'above' | 'below'
}

export function InfoTooltip({ content, delay = 200 }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [position, setPosition] = useState<TooltipPosition | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const iconRef = useRef<HTMLSpanElement>(null)

  const computePosition = useCallback((): TooltipPosition | null => {
    if (!iconRef.current) return null
    const rect = iconRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const aboveY = rect.top

    // Flip below if less than 80px from viewport top
    if (aboveY < 80) {
      return { x: centerX, y: rect.bottom, placement: 'below' }
    }
    return { x: centerX, y: aboveY, placement: 'above' }
  }, [])

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      const pos = computePosition()
      if (pos) {
        setPosition(pos)
        setVisible(true)
      }
    }, delay)
  }, [delay, computePosition])

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setVisible(false)
  }, [])

  const handleMouseEnter = useCallback(() => {
    setHovered(true)
    show()
  }, [show])

  const handleMouseLeave = useCallback(() => {
    setHovered(false)
    hide()
  }, [hide])

  const handleFocus = useCallback(() => {
    setHovered(true)
    show()
  }, [show])

  const handleBlur = useCallback(() => {
    setHovered(false)
    hide()
  }, [hide])

  // Dismiss on scroll of any ancestor
  useEffect(() => {
    if (!visible) return
    const handleScroll = () => hide()
    // Capture phase to catch scrolling on any ancestor
    window.addEventListener('scroll', handleScroll, true)
    return () => window.removeEventListener('scroll', handleScroll, true)
  }, [visible, hide])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const lines = content.split('\n')
  const yOffset = position?.placement === 'below' ? -6 : 6

  return (
    <span
      ref={iconRef}
      className="inline-flex items-center justify-center cursor-help"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex={0}
      role="button"
      aria-label="More information"
      style={{ outline: 'none' }}
    >
      {/* Info icon */}
      <motion.span
        className="inline-flex items-center justify-center rounded-full"
        animate={{
          opacity: hovered ? 1 : 0.45,
          scale: hovered ? 1.1 : 1,
        }}
        transition={{ duration: 0.2, ease: EASE }}
        style={{
          color: hovered ? 'var(--color-accent)' : 'var(--color-content-tertiary)',
          filter: hovered ? 'drop-shadow(0 0 6px var(--color-accent-glow))' : 'none',
        }}
      >
        <svg
          width={13}
          height={13}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 7v4" />
          <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      </motion.span>

      {/* Tooltip portal */}
      {createPortal(
        <AnimatePresence>
          {visible && position && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: yOffset }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: yOffset * 0.6 }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30,
                mass: 0.6,
                opacity: { duration: 0.15 },
              }}
              className="fixed z-[9999] pointer-events-none"
              style={{
                left: position.x,
                top: position.y,
                transform: position.placement === 'above'
                  ? 'translate(-50%, calc(-100% - 8px))'
                  : 'translate(-50%, 8px)',
              }}
            >
              <div
                className="max-w-[280px] px-3.5 py-2.5 rounded-[10px]
                  bg-surface-elevated/95 backdrop-blur-xl
                  border border-accent/20
                  shadow-[0_8px_32px_rgba(0,0,0,0.15),0_0_16px_var(--color-accent-glow)]"
              >
                {/* Tiny accent arrow */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rotate-45
                    bg-surface-elevated/95 border-accent/20"
                  style={{
                    ...(position.placement === 'above'
                      ? { bottom: -4, borderBottom: '1px solid', borderRight: '1px solid', borderColor: 'var(--color-accent-glow)' }
                      : { top: -4, borderTop: '1px solid', borderLeft: '1px solid', borderColor: 'var(--color-accent-glow)' }
                    ),
                  }}
                />
                {lines.map((line, i) => (
                  <p
                    key={i}
                    className={`text-[11px] leading-relaxed ${
                      i === 0
                        ? 'font-semibold text-accent mb-0.5'
                        : 'text-content-secondary'
                    }`}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </span>
  )
}
