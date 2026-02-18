import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToastStore, type ToastVariant } from '../../stores/toast-store'

const VARIANT_COLORS: Record<ToastVariant, string> = {
  success: '#10b981',
  error: '#ef4444',
  info: 'var(--color-accent)',
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const size = 15
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: VARIANT_COLORS[variant],
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (variant) {
    case 'success':
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="6.5" strokeWidth={1.5} />
          <path d="M5.5 8l2 2 3.5-3.5" />
        </svg>
      )
    case 'error':
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="6.5" strokeWidth={1.5} />
          <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" />
        </svg>
      )
    case 'info':
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="6.5" strokeWidth={1.5} />
          <path d="M8 7v4" />
          <circle cx="8" cy="5" r="0.5" fill={VARIANT_COLORS[variant]} stroke="none" />
        </svg>
      )
  }
}

function ToastCard({ id, variant, message, detail, duration }: {
  id: string
  variant: ToastVariant
  message: string
  detail?: string
  duration: number
}) {
  const removeToast = useToastStore((s) => s.removeToast)

  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, removeToast])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="relative flex items-start gap-2.5 w-[320px] px-3.5 py-3 rounded-[10px] border border-border-subtle bg-surface-elevated/95 backdrop-blur-xl overflow-hidden cursor-pointer group"
      onClick={() => removeToast(id)}
    >
      {/* Left accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[10px]"
        style={{ background: VARIANT_COLORS[variant] }}
      />

      {/* Icon */}
      <div className="shrink-0 mt-0.5">
        <ToastIcon variant={variant} />
      </div>

      {/* Text */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[12px] font-medium text-content-primary leading-tight">
          {message}
        </span>
        {detail && (
          <span className="text-[11px] text-content-tertiary leading-tight truncate">
            {detail}
          </span>
        )}
      </div>

      {/* Close hint on hover */}
      <div className="absolute top-1.5 right-2 opacity-0 group-hover:opacity-60 transition-opacity">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </div>
    </motion.div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 pointer-events-auto">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} {...toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
