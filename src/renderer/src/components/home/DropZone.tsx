import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useWorkflowStore } from '../../stores/workflow-store'
import { useUIStore } from '../../stores/ui-store'
import { useToastStore } from '../../stores/toast-store'
import type { Workflow } from '../../types/workflow'

export function DropZone() {
  const [isDragOver, setIsDragOver] = useState(false)
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow)
  const setView = useUIStore((s) => s.setView)
  const addToast = useToastStore((s) => s.addToast)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const file = e.dataTransfer.files[0]
    if (!file || (!file.name.endsWith('.opaal') && !file.name.endsWith('.json'))) {
      addToast({ variant: 'error', message: 'Invalid file', detail: 'Please drop a .opaal file' })
      return
    }

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as Workflow
      if (!parsed.id || !parsed.name || !parsed.agents || !parsed.columns) {
        addToast({ variant: 'error', message: 'Invalid file', detail: 'Not a valid Opaal workflow' })
        return
      }
      loadWorkflow(parsed)
      setView('canvas')
      addToast({ variant: 'success', message: 'Workflow imported', detail: file.name })
    } catch {
      addToast({ variant: 'error', message: 'Failed to import', detail: 'Could not parse file' })
    }
  }, [loadWorkflow, setView, addToast])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        flex items-center justify-center gap-3 h-[72px] rounded-[10px] border-2 border-dashed transition-all duration-200
        ${isDragOver
          ? 'border-accent bg-accent/5 shadow-[0_0_24px_rgba(99,102,241,0.12)]'
          : 'border-border-subtle/60 hover:border-border-default'
        }
      `}
    >
      {/* Download icon */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={isDragOver ? 'text-accent' : 'text-content-tertiary/50'}>
        <path d="M8 2v8" />
        <polyline points="4 7 8 11 12 7" />
        <path d="M2 14h12" />
      </svg>
      <span className={`text-[11px] font-medium ${isDragOver ? 'text-accent' : 'text-content-tertiary/50'}`}>
        {isDragOver ? 'Release to import' : 'Drop .opaal file to import'}
      </span>
    </motion.div>
  )
}
