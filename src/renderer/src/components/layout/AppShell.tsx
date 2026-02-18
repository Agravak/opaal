import { useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TitleBar } from './TitleBar'
import { StatusBar } from './StatusBar'
import { WorkflowCanvas } from '../canvas/WorkflowCanvas'
import { SkillsStrip } from '../sidebar/SkillsStrip'
import { PromptPanel } from '../sidebar/PromptPanel'
import { AgentConfigPopup } from '../popup/AgentConfigPopup'
import { SettingsPopup } from '../popup/SettingsPopup'
import { PromptModal } from '../popup/PromptModal'
import { AgentManagerPopup } from '../popup/AgentManagerPopup'
import { ConnectionConfigPopup } from '../popup/ConnectionConfigPopup'
import { ConfirmModal } from '../shared/ConfirmModal'
import { CommandBar } from './CommandBar'
import { HomeScreen } from '../home/HomeScreen'
import { useUIStore } from '../../stores/ui-store'
import { useWorkflowStore } from '../../stores/workflow-store'

const viewTransition = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] },
}

export function AppShell() {
  const view = useUIStore((s) => s.view)
  const skillsPanelCollapsed = useUIStore((s) => s.skillsPanelCollapsed)
  const promptPanelCollapsed = useUIStore((s) => s.promptPanelCollapsed)
  const expandRightPanels = useUIStore((s) => s.expandRightPanels)
  const confirmModal = useUIStore((s) => s.confirmModal)
  const closeConfirmModal = useUIStore((s) => s.closeConfirmModal)

  const handleConfirmSave = useCallback(async () => {
    // Save then proceed
    window.dispatchEvent(new CustomEvent('opaal:save'))
    // Wait a tick for save to complete, then proceed
    setTimeout(() => {
      const modal = useUIStore.getState().confirmModal
      if (modal.onProceed) modal.onProceed()
      closeConfirmModal()
    }, 500)
  }, [closeConfirmModal])

  const handleConfirmDiscard = useCallback(() => {
    const modal = useUIStore.getState().confirmModal
    if (modal.onProceed) modal.onProceed()
    closeConfirmModal()
    // If closing the app, force close
    if (modal.action === 'close' && window.api?.forceClose) {
      window.api.forceClose()
    }
  }, [closeConfirmModal])

  const handleConfirmCancel = useCallback(() => {
    closeConfirmModal()
  }, [closeConfirmModal])

  useEffect(() => {
    if (view === 'canvas') {
      expandRightPanels()
    }
  }, [view, expandRightPanels])

  return (
    <div className="grid grid-rows-[40px_1fr_32px] h-screen w-screen overflow-hidden bg-surface-primary">
      <TitleBar />

      <AnimatePresence mode="wait">
        {view === 'home' ? (
          <motion.div key="home" className="min-h-0 overflow-hidden" {...viewTransition}>
            <HomeScreen />
          </motion.div>
        ) : (
          <motion.div key="canvas" className="relative grid grid-rows-[1fr] grid-cols-[1fr] min-h-0 overflow-hidden" {...viewTransition}>
            <div
              className="relative grid min-h-0 min-w-0 overflow-hidden"
              style={{
                gridTemplateColumns: [
                  'minmax(0,1fr)',
                  skillsPanelCollapsed ? '34px' : 'minmax(236px,272px)',
                  promptPanelCollapsed ? '34px' : '380px',
                ].join(' '),
              }}
            >
              <WorkflowCanvas />
              <SkillsStrip />
              <PromptPanel />
            </div>
            {/* CommandBar spans full width, floating above all columns */}
            <CommandBar />
          </motion.div>
        )}
      </AnimatePresence>

      <StatusBar />
      <AgentConfigPopup />
      <ConnectionConfigPopup />
      <SettingsPopup />
      <PromptModal />
      <AgentManagerPopup />

      {/* Confirm Modal for unsaved changes */}
      <ConfirmModal
        open={confirmModal.open}
        onSave={handleConfirmSave}
        onDiscard={handleConfirmDiscard}
        onCancel={handleConfirmCancel}
      />
    </div>
  )
}
