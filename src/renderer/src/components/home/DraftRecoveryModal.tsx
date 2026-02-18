import { motion, AnimatePresence } from 'framer-motion'

interface DraftRecoveryModalProps {
  open: boolean
  savedAt: string
  onRecover: () => void
  onDiscard: () => void
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return 'unknown time'
  }
}

export function DraftRecoveryModal({ open, savedAt, onRecover, onDiscard }: DraftRecoveryModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/25 backdrop-blur-[6px]" />

          {/* Panel */}
          <motion.div
            className="relative w-[380px] rounded-[12px] border border-border-subtle bg-surface-elevated shadow-elevated overflow-hidden"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-5 pt-5 pb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent/10">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 8a6 6 0 1112 0A6 6 0 012 8z" />
                  <path d="M8 4.5v4l2.5 1.5" />
                </svg>
              </div>
              <span className="text-[14px] font-semibold text-content-primary">
                Unsaved Work Recovered
              </span>
            </div>

            {/* Message */}
            <p className="px-5 py-3 text-[12px] text-content-secondary leading-relaxed">
              An auto-saved draft was found from <span className="font-medium text-content-primary">{formatDate(savedAt)}</span>.
              Would you like to recover it?
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-subtle">
              <button
                onClick={onDiscard}
                className="px-3.5 py-1.5 text-[12px] font-medium text-content-secondary border border-border-subtle rounded-[7px] hover:bg-surface-tertiary transition-all"
              >
                Discard
              </button>
              <button
                onClick={onRecover}
                className="px-3.5 py-1.5 text-[12px] font-semibold text-white bg-accent hover:bg-accent-hover rounded-[7px] transition-all"
              >
                Recover Draft
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
