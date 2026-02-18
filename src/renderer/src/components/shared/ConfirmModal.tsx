import { motion, AnimatePresence } from 'framer-motion'

interface ConfirmModalProps {
  open: boolean
  title?: string
  message?: string
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title = 'Unsaved Changes',
  message = 'You have unsaved changes. Would you like to save before continuing?',
  onSave,
  onDiscard,
  onCancel,
}: ConfirmModalProps) {
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
          <motion.div
            className="absolute inset-0 bg-black/25 backdrop-blur-[6px]"
            onClick={onCancel}
          />

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
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-400/10">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 1.5L1 14h14L8 1.5z" />
                  <path d="M8 6v3" />
                  <circle cx="8" cy="11.5" r="0.5" fill="#f59e0b" stroke="none" />
                </svg>
              </div>
              <span className="text-[14px] font-semibold text-content-primary">
                {title}
              </span>
            </div>

            {/* Message */}
            <p className="px-5 py-3 text-[12px] text-content-secondary leading-relaxed">
              {message}
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-subtle">
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-[12px] font-medium text-content-tertiary hover:text-content-secondary transition-colors rounded-[7px]"
              >
                Cancel
              </button>
              <button
                onClick={onDiscard}
                className="px-3.5 py-1.5 text-[12px] font-medium text-content-secondary border border-border-subtle rounded-[7px] hover:bg-surface-tertiary transition-all"
              >
                Discard
              </button>
              <button
                onClick={onSave}
                className="px-3.5 py-1.5 text-[12px] font-semibold text-white bg-accent hover:bg-accent-hover rounded-[7px] transition-all"
              >
                Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
