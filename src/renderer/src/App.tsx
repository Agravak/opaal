import { useEffect, useCallback } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { AppShell } from './components/layout/AppShell'
import { ToastContainer } from './components/shared/Toast'
import { useUIStore } from './stores/ui-store'
import { useWorkflowStore } from './stores/workflow-store'
import { useToastStore } from './stores/toast-store'
import { useKeyboard } from './hooks/useKeyboard'
import { useAutoSave } from './hooks/useAutoSave'
import { generatePrompt } from './lib/prompt-generator'
import type { Workflow } from './types/workflow'

export default function App() {
  const theme = useUIStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  // Keyboard shortcuts
  useKeyboard()

  // Auto-save drafts every 30s when dirty
  useAutoSave()

  // File operation event handlers
  const workflow = useWorkflowStore((s) => s.workflow)
  const filePath = useWorkflowStore((s) => s.filePath)
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow)
  const setFilePath = useWorkflowStore((s) => s.setFilePath)
  const markClean = useWorkflowStore((s) => s.markClean)
  const addToast = useToastStore((s) => s.addToast)
  const setView = useUIStore((s) => s.setView)

  const handleSave = useCallback(async () => {
    if (!window.api?.saveWorkflow) return
    const data = JSON.stringify(workflow, null, 2)
    const savedPath = await window.api.saveWorkflow(data, filePath || undefined)
    if (savedPath) {
      setFilePath(savedPath)
      markClean()
      if (window.api.clearDraft) window.api.clearDraft()
      if (window.api.addRecentFile) {
        const roleColors = [...new Set(workflow.agents.map(a => a.role))].slice(0, 5)
        window.api.addRecentFile({
          filePath: savedPath,
          name: workflow.name,
          agentCount: workflow.agents.length,
          waveCount: workflow.columns.length,
          roleColors,
          lastOpened: new Date().toISOString(),
        })
      }
      addToast({
        variant: 'success',
        message: 'Workflow saved',
        detail: savedPath.replace(/^.*[\\/]/, ''),
      })
    }
  }, [workflow, filePath, setFilePath, markClean, addToast])

  const handleSaveAs = useCallback(async () => {
    if (!window.api?.saveWorkflow) return
    const data = JSON.stringify(workflow, null, 2)
    const savedPath = await window.api.saveWorkflow(data, undefined)
    if (savedPath) {
      setFilePath(savedPath)
      markClean()
      if (window.api.clearDraft) window.api.clearDraft()
      if (window.api.addRecentFile) {
        const roleColors = [...new Set(workflow.agents.map(a => a.role))].slice(0, 5)
        window.api.addRecentFile({
          filePath: savedPath,
          name: workflow.name,
          agentCount: workflow.agents.length,
          waveCount: workflow.columns.length,
          roleColors,
          lastOpened: new Date().toISOString(),
        })
      }
      addToast({
        variant: 'success',
        message: 'Workflow saved as',
        detail: savedPath.replace(/^.*[\\/]/, ''),
      })
    }
  }, [workflow, setFilePath, markClean, addToast])

  const handleLoad = useCallback(async () => {
    if (!window.api?.loadWorkflow) return
    const result = await window.api.loadWorkflow()
    if (result) {
      try {
        const parsed = JSON.parse(result.data) as Workflow
        loadWorkflow(parsed, result.filePath)
        setView('canvas')
        if (window.api.clearDraft) window.api.clearDraft()
        if (window.api.addRecentFile) {
          const roleColors = [...new Set(parsed.agents.map(a => a.role))].slice(0, 5)
          window.api.addRecentFile({
            filePath: result.filePath,
            name: parsed.name,
            agentCount: parsed.agents.length,
            waveCount: parsed.columns.length,
            roleColors,
            lastOpened: new Date().toISOString(),
          })
        }
        addToast({
          variant: 'success',
          message: 'Workflow loaded',
          detail: result.filePath.replace(/^.*[\\/]/, ''),
        })
      } catch {
        addToast({
          variant: 'error',
          message: 'Failed to load workflow',
          detail: 'The file contains invalid data',
        })
      }
    }
  }, [loadWorkflow, addToast, setView])

  const handleExport = useCallback(async () => {
    if (!window.api?.exportPrompt) return
    const generated = generatePrompt(workflow)
    if (generated.fullText) {
      const exportedPath = await window.api.exportPrompt(generated.fullText)
      if (exportedPath) {
        addToast({
          variant: 'success',
          message: 'Prompt exported',
          detail: exportedPath.replace(/^.*[\\/]/, ''),
        })
      }
    }
  }, [workflow, addToast])

  const handleNew = useCallback(() => {
    const dirty = useWorkflowStore.getState().dirty
    const resetWorkflow = useWorkflowStore.getState().resetWorkflow
    if (dirty) {
      useUIStore.getState().openConfirmModal('new', () => {
        resetWorkflow()
        if (window.api?.clearDraft) window.api.clearDraft()
        setView('home')
      })
    } else {
      resetWorkflow()
      if (window.api?.clearDraft) window.api.clearDraft()
      setView('home')
    }
  }, [setView])

  useEffect(() => {
    const onSave = () => handleSave()
    const onSaveAs = () => handleSaveAs()
    const onLoad = () => handleLoad()
    const onExport = () => handleExport()
    const onNew = () => handleNew()

    window.addEventListener('opaal:save', onSave)
    window.addEventListener('opaal:save-as', onSaveAs)
    window.addEventListener('opaal:load', onLoad)
    window.addEventListener('opaal:export', onExport)
    window.addEventListener('opaal:new', onNew)
    return () => {
      window.removeEventListener('opaal:save', onSave)
      window.removeEventListener('opaal:save-as', onSaveAs)
      window.removeEventListener('opaal:load', onLoad)
      window.removeEventListener('opaal:export', onExport)
      window.removeEventListener('opaal:new', onNew)
    }
  }, [handleSave, handleSaveAs, handleLoad, handleExport, handleNew])

  // Window close guard: check dirty state before closing
  useEffect(() => {
    if (!window.api?.onBeforeClose) return
    const cleanup = window.api.onBeforeClose(() => {
      const isDirty = useWorkflowStore.getState().dirty
      if (!isDirty) {
        if (window.api?.clearDraft) window.api.clearDraft()
        if (window.api?.forceClose) window.api.forceClose()
        return
      }
      // onProceed is called after Save completes in the modal's handleConfirmSave
      useUIStore.getState().openConfirmModal('close', () => {
        if (window.api?.clearDraft) window.api.clearDraft()
        if (window.api?.forceClose) window.api.forceClose()
      })
    })
    return cleanup
  }, [])

  // Global file drop handler
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer?.files[0]
      if (!file || (!file.name.endsWith('.opaal') && !file.name.endsWith('.json'))) return

      try {
        const text = await file.text()
        const parsed = JSON.parse(text) as Workflow
        if (!parsed.id || !parsed.name || !parsed.agents || !parsed.columns) {
          addToast({ variant: 'error', message: 'Invalid file', detail: 'Not a valid Opaal workflow' })
          return
        }

        const dirty = useWorkflowStore.getState().dirty
        if (dirty) {
          useUIStore.getState().openConfirmModal('load', () => {
            loadWorkflow(parsed)
            setView('canvas')
            addToast({ variant: 'success', message: 'Workflow imported', detail: file.name })
          })
        } else {
          loadWorkflow(parsed)
          setView('canvas')
          addToast({ variant: 'success', message: 'Workflow imported', detail: file.name })
        }
      } catch {
        addToast({ variant: 'error', message: 'Invalid file', detail: 'Could not parse file' })
      }
    }

    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)
    return () => {
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [loadWorkflow, addToast, setView])

  return (
    <ReactFlowProvider>
      <AppShell />
      <ToastContainer />
    </ReactFlowProvider>
  )
}
