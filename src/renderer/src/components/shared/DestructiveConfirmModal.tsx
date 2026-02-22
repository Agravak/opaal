import { AnimatePresence, motion } from 'framer-motion'

interface DestructiveConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function DestructiveConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading,
}: DestructiveConfirmModalProps) {
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
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-[6px]"
            onClick={onCancel}
          />

          <motion.div
            className="relative w-[400px] rounded-[12px] border border-red-400/20 bg-surface-elevated shadow-elevated overflow-hidden"
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          >
            <div className="flex items-center gap-2.5 px-5 pt-5 pb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 border border-red-500/20">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 1.5L1 14h14L8 1.5z" />
                  <path d="M8 6v3" />
                  <circle cx="8" cy="11.5" r="0.5" fill="#ef4444" stroke="none" />
                </svg>
              </div>
              <span className="text-[14px] font-semibold text-content-primary">
                {title}
              </span>
            </div>

            <p className="px-5 py-3 text-[12px] text-content-secondary leading-relaxed">
              {message}
            </p>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-subtle">
              <button
                onClick={onCancel}
                disabled={loading}
                className={`px-3 py-1.5 text-[12px] font-medium transition-colors rounded-[7px] ${
                  loading
                    ? 'text-content-tertiary/50 cursor-not-allowed'
                    : 'text-content-tertiary hover:text-content-secondary'
                }`}
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`px-3.5 py-1.5 text-[12px] font-semibold text-white rounded-[7px] transition-all ${
                  loading
                    ? 'bg-red-500/50 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {loading ? 'Deleting...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
