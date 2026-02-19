import { useEffect, useCallback, useRef } from 'react'
import { useWorkflowStore } from '../stores/workflow-store'
import { useUIStore } from '../stores/ui-store'
import { useCustomAgentsStore, getUnifiedVisibleAgents } from '../stores/custom-agents-store'

function isEditableElement(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tagName = el.tagName
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return true
  if (el.isContentEditable) return true
  return Boolean(el.closest('[contenteditable="true"], [contenteditable="plaintext-only"]'))
}

export function useKeyboard() {
  const workflow = useWorkflowStore((s) => s.workflow)
  const removeAgent = useWorkflowStore((s) => s.removeAgent)
  const removeConnection = useWorkflowStore((s) => s.removeConnection)
  const copyAgents = useWorkflowStore((s) => s.copyAgents)
  const pasteAgents = useWorkflowStore((s) => s.pasteAgents)
  const duplicateAgents = useWorkflowStore((s) => s.duplicateAgents)
  const selectedNodeIds = useUIStore((s) => s.selectedNodeIds)
  const selectedEdgeIds = useUIStore((s) => s.selectedEdgeIds)
  const clearSelection = useUIStore((s) => s.clearSelection)
  const selectNodes = useUIStore((s) => s.selectNodes)
  const saveControlGroup = useUIStore((s) => s.saveControlGroup)
  const recallControlGroup = useUIStore((s) => s.recallControlGroup)
  const setCanvasMode = useUIStore((s) => s.setCanvasMode)
  const toggleCanvasMode = useUIStore((s) => s.toggleCanvasMode)
  const undo = useWorkflowStore((s) => s.undo)
  const redo = useWorkflowStore((s) => s.redo)
  const modeBeforeSpaceRef = useRef<'select' | 'pan' | null>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.isComposing) return

    const target = e.target as Element | null
    const active = document.activeElement
    const isEditing =
      isEditableElement(target) ||
      (active !== target && isEditableElement(active))

    // Ctrl+S: Save (always available, including while editing text fields)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault()
      const currentView = useUIStore.getState().view
      if (currentView === 'workshop') {
        window.dispatchEvent(new CustomEvent('opaal:workshop-save'))
      } else {
        window.dispatchEvent(new CustomEvent('opaal:save'))
      }
      return
    }

    // In editable fields, keep shortcuts native except Save
    if (isEditing) return

    // Ctrl+Z / Ctrl+Shift+Z: Undo/Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      if (e.shiftKey) {
        redo()
      } else {
        undo()
      }
      return
    }

    // Ctrl+Shift+S: Save As (always show file dialog)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('opaal:save-as'))
      return
    }

    // Ctrl+N: New workflow (with dirty guard)
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('opaal:new'))
      return
    }

    // Ctrl+O: Open
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('opaal:load'))
      return
    }

    // Ctrl+E: Export prompt
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('opaal:export'))
      return
    }

    // Ctrl+Shift+L: Launch in Claude Code
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault()
      if (useUIStore.getState().claudeIntegrationEnabled) {
        window.dispatchEvent(new CustomEvent('opaal:launch-claude'))
      }
      return
    }

    // Ctrl+Shift+1-9: Recall control group (moved from bare 1-9)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key >= '1' && e.key <= '9') {
      e.preventDefault()
      recallControlGroup(parseInt(e.key))
      return
    }

    // Ctrl+1-9 (no shift): Save control group
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key >= '1' && e.key <= '9') {
      e.preventDefault()
      saveControlGroup(parseInt(e.key))
      return
    }

    // Ctrl/Cmd+A: Select all agents
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault()
      selectNodes(workflow.agents.map(agent => agent.id))
      return
    }

    // V: Toggle canvas mode (select <-> pan) — but not during placement
    if (e.key === 'v' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const { placementMode } = useUIStore.getState()
      if (!placementMode) toggleCanvasMode()
      return
    }

    // Space (hold): Temporarily switch to pan mode (not during placement)
    if (e.code === 'Space' && !e.repeat) {
      const { placementMode, canvasMode } = useUIStore.getState()
      if (!placementMode) {
        e.preventDefault()
        modeBeforeSpaceRef.current = canvasMode as 'select' | 'pan'
        setCanvasMode('pan')
      }
      return
    }

    // Ctrl+C: Copy selected agents
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault()
      const ids = Array.from(selectedNodeIds)
      if (ids.length > 0) {
        copyAgents(ids)
      }
      return
    }

    // Ctrl+V: Paste agents
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault()
      const newIds = pasteAgents()
      if (newIds.length > 0) {
        selectNodes(newIds)
      }
      return
    }

    // Ctrl+D: Duplicate in place
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault()
      const ids = Array.from(selectedNodeIds)
      if (ids.length > 0) {
        const newIds = duplicateAgents(ids)
        selectNodes(newIds)
      }
      return
    }

    // 0-9 (no modifier): Enter placement mode for agent (respects unified order + visibility)
    if (e.key >= '0' && e.key <= '9' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      const { placementMode, placementRole, placementTemplateId, enterPlacementMode, enterPlacementModeCustom, exitPlacementMode } = useUIStore.getState()
      const { hiddenDefaultRoles, unifiedOrder, templates } = useCustomAgentsStore.getState()

      const unifiedAgents = getUnifiedVisibleAgents(unifiedOrder, templates, hiddenDefaultRoles)

      // Map key to agent index: 1->0, 2->1, ..., 9->8, 0->9
      const keyNum = parseInt(e.key)
      const agentIndex = keyNum === 0 ? 9 : keyNum - 1

      if (agentIndex < unifiedAgents.length) {
        const agent = unifiedAgents[agentIndex]
        if (agent.type === 'default') {
          if (placementMode && placementRole === agent.role) {
            exitPlacementMode()
          } else {
            enterPlacementMode(agent.role)
          }
        } else {
          if (placementMode && placementTemplateId === agent.key) {
            exitPlacementMode()
          } else {
            enterPlacementModeCustom(agent.key)
          }
        }
      }
      return
    }

    // Delete / Backspace: Remove selected agents/connectors
    if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedNodeIds.size > 0 || selectedEdgeIds.size > 0)) {
      e.preventDefault()
      Array.from(selectedNodeIds).forEach(id => removeAgent(id))
      Array.from(selectedEdgeIds).forEach(id => removeConnection(id))
      clearSelection()
      return
    }

    // P: Open prompt modal (non-input, no modifier)
    if (e.key === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const { promptModalOpen, openPromptModal, closePromptModal } = useUIStore.getState()
      if (promptModalOpen) { closePromptModal() } else { openPromptModal() }
      return
    }

    // Escape: Exit skill viewer first, then placement mode, then close popups, then deselect
    if (e.key === 'Escape') {
      const state = useUIStore.getState()
      if (state.skillViewerSkill) { state.closeSkillViewer(); return }
      if (state.executionModalOpen) { state.closeExecutionModal(); return }
      if (state.agentManagerOpen) { state.closeAgentManager(); return }
      if (state.placementMode) { state.exitPlacementMode(); return }
      if (state.promptModalOpen) { state.closePromptModal(); return }
      if (state.settingsOpen) { state.toggleSettings(); return }
      if (state.configPopupAgentId) { state.closeConfigPopup(); return }
      clearSelection()
      return
    }
  }, [workflow.agents, selectedNodeIds, selectedEdgeIds, removeAgent, removeConnection, clearSelection, selectNodes, undo, redo, copyAgents, pasteAgents, duplicateAgents, saveControlGroup, recallControlGroup, toggleCanvasMode, setCanvasMode])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    // Space release: restore previous canvas mode
    if (e.code === 'Space' && modeBeforeSpaceRef.current !== null) {
      setCanvasMode(modeBeforeSpaceRef.current)
      modeBeforeSpaceRef.current = null
    }
  }, [setCanvasMode])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])
}
