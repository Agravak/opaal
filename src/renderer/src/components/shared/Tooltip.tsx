import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface TooltipProps {
  content: string
  children: ReactNode
  delay?: number
}

interface TooltipPosition {
  x: number
  y: number
  placement: 'above' | 'below'
}

const EASE = [0.25, 0.46, 0.45, 0.94] as const

export function Tooltip({ content, children, delay = 400 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<TooltipPosition | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const triggerRef = useRef<HTMLDivElement>(null)

  const computePosition = useCallback((): TooltipPosition | null => {
    if (!triggerRef.current) return null

    const rect = triggerRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const aboveY = rect.top

    // If less than 48px from viewport top, flip tooltip below the trigger
    if (aboveY < 48) {
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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const lines = content.split('\n')
  const yOffset = position?.placement === 'below' ? -4 : 4

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {createPortal(
        <AnimatePresence>
          {visible && position && (
            <motion.div
              initial={{ opacity: 0, y: yOffset, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: yOffset, scale: 0.95 }}
              transition={{ duration: 0.12, ease: EASE }}
              className="fixed z-[9999] pointer-events-none"
              style={{
                left: position.x,
                top: position.y,
                transform: position.placement === 'above'
                  ? 'translate(-50%, calc(-100% - 6px))'
                  : 'translate(-50%, 6px)',
              }}
            >
              <div className="px-2.5 py-1.5 rounded-lg bg-surface-primary/95 backdrop-blur-sm border border-border-subtle shadow-elevated whitespace-nowrap">
                {lines.map((line, i) => (
                  <p
                    key={i}
                    className={`text-[10.5px] leading-snug ${
                      i === 0
                        ? 'font-semibold text-content-primary'
                        : 'text-content-tertiary'
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
    </div>
  )
}
