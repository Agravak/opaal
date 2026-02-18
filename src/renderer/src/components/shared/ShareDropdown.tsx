import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkflowStore } from '../../stores/workflow-store'
import { useUIStore } from '../../stores/ui-store'
import { useToastStore } from '../../stores/toast-store'
import type { Workflow } from '../../types/workflow'

interface ShareDropdownProps {
  open: boolean
  onClose: () => void
}

interface MenuItem {
  icon: JSX.Element
  label: string
  shortcut?: string
  action: () => void
}

export function ShareDropdown({ open, onClose }: ShareDropdownProps) {
  const ref = useRef<HTMLDivElement>(null)
  const workflow = useWorkflowStore((s) => s.workflow)
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow)
  const setView = useUIStore((s) => s.setView)
  const addToast = useToastStore((s) => s.addToast)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onClose])

  const handleCopyWorkflow = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(workflow, null, 2))
      addToast({ variant: 'success', message: 'Workflow copied to clipboard' })
    } catch {
      addToast({ variant: 'error', message: 'Failed to copy' })
    }
    onClose()
  }

  const handleImportClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const parsed = JSON.parse(text) as Workflow
      if (!parsed.id || !parsed.name || !parsed.agents || !parsed.columns) {
        addToast({ variant: 'error', message: 'Invalid workflow data in clipboard' })
        onClose()
        return
      }
      loadWorkflow(parsed)
      setView('canvas')
      addToast({ variant: 'success', message: 'Workflow imported from clipboard' })
    } catch {
      addToast({ variant: 'error', message: 'No valid workflow in clipboard' })
    }
    onClose()
  }

  const handleExportFile = () => {
    window.dispatchEvent(new CustomEvent('opaal:save-as'))
    onClose()
  }

  const handleExportPrompt = () => {
    window.dispatchEvent(new CustomEvent('opaal:export'))
    onClose()
  }

  const iconProps = { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  const items: MenuItem[] = [
    {
      icon: <svg {...iconProps}><rect x="2" y="2" width="12" height="12" rx="1.5" /><path d="M5 2v12" /><path d="M8 6h3" /><path d="M8 9h2" /></svg>,
      label: 'Copy Workflow',
      action: handleCopyWorkflow,
    },
    {
      icon: <svg {...iconProps}><path d="M12 2H6.5a1.5 1.5 0 00-1.5 1.5V5" /><polyline points="9 12 12 9 9 6" /><path d="M12 9H4" /><path d="M4 14h8a1.5 1.5 0 001.5-1.5V11" /></svg>,
      label: 'Import from Clipboard',
      action: handleImportClipboard,
    },
    {
      icon: <svg {...iconProps}><path d="M3 14V3a1 1 0 011-1h6l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1z" /><polyline points="10 2 10 5 13 5" /></svg>,
      label: 'Export .opaal',
      shortcut: 'Ctrl+Shift+S',
      action: handleExportFile,
    },
    {
      icon: <svg {...iconProps}><path d="M3 13V3.5A1.5 1.5 0 014.5 2h5L13 5.5V13a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 013 13z" /><path d="M6 7h4" /><path d="M6 10h4" /></svg>,
      label: 'Export Prompt',
      shortcut: 'Ctrl+E',
      action: handleExportPrompt,
    },
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="absolute top-full right-0 mt-1.5 w-[220px] py-1.5 rounded-[10px] border border-border-subtle bg-surface-elevated/95 backdrop-blur-xl shadow-elevated z-50"
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-surface-tertiary/80 transition-colors group"
            >
              <span className="text-content-tertiary group-hover:text-content-secondary transition-colors shrink-0">
                {item.icon}
              </span>
              <span className="text-[12px] font-medium text-content-secondary group-hover:text-content-primary transition-colors flex-1">
                {item.label}
              </span>
              {item.shortcut && (
                <span className="text-[10px] text-content-tertiary/50 font-mono">
                  {item.shortcut}
                </span>
              )}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
