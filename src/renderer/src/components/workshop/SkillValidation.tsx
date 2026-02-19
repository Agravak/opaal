import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkshopStore, type ValidationResult } from '../../stores/workshop-store'

const EASE = [0.25, 0.46, 0.45, 0.94] as const

export function SkillValidation() {
  const validation = useWorkshopStore((s) => s.validation)

  const items = useMemo(() => {
    const result: { type: 'error' | 'warning' | 'ok'; text: string; key: string }[] = []

    for (const err of validation.errors) {
      result.push({ type: 'error', text: err.message, key: `err-${err.rule}` })
    }
    for (const warn of validation.warnings) {
      result.push({ type: 'warning', text: warn.message, key: `warn-${warn.rule}` })
    }

    return result
  }, [validation])

  const allClear = validation.valid && validation.warnings.length === 0

  return (
    <div className="flex items-center gap-2 flex-wrap min-w-0">
      <AnimatePresence mode="popLayout">
        {allClear && (
          <motion.div
            key="valid-badge"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
              <polyline points="4 12 10 18 20 6" />
            </svg>
            <span className="text-[10px] font-semibold text-emerald-400">Valid</span>
          </motion.div>
        )}

        {items.map((item) => (
          <ValidationItem key={item.key} type={item.type} text={item.text} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ValidationItem({ type, text }: { type: 'error' | 'warning' | 'ok'; text: string }) {
  const config = type === 'error'
    ? { icon: 'cross', color: 'text-red-400', bg: 'bg-red-500/8', border: 'border-red-500/15' }
    : type === 'warning'
      ? { icon: 'warn', color: 'text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/15' }
      : { icon: 'check', color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/15' }

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -4 }}
      transition={{ duration: 0.15, ease: EASE }}
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${config.bg} border ${config.border}`}
    >
      {config.icon === 'cross' && (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={config.color}>
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      )}
      {config.icon === 'warn' && (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={config.color}>
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      )}
      {config.icon === 'check' && (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={config.color}>
          <polyline points="4 12 10 18 20 6" />
        </svg>
      )}
      <span className={`text-[10px] font-medium ${config.color} truncate max-w-[200px]`}>{text}</span>
    </motion.div>
  )
}
