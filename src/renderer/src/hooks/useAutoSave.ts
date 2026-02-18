import { useEffect, useRef } from 'react'
import { useWorkflowStore } from '../stores/workflow-store'

const AUTO_SAVE_INTERVAL = 30_000 // 30 seconds

export function useAutoSave() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const { dirty, workflow } = useWorkflowStore.getState()
      if (dirty && window.api?.saveDraft) {
        window.api.saveDraft(JSON.stringify(workflow))
      }
    }, AUTO_SAVE_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])
}
