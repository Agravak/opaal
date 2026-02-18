import { useRef, useState, useCallback } from 'react'
import { useOnViewportChange } from '@xyflow/react'
import { motion, AnimatePresence } from 'framer-motion'

export function ZoomIndicator() {
  const [zoom, setZoom] = useState(1)
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useOnViewportChange({
    onChange: useCallback((viewport: { zoom: number }) => {
      setZoom(viewport.zoom)
      setVisible(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setVisible(false), 1500)
    }, [])
  })

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute bottom-[132px] left-4 z-10 px-2.5 py-1 rounded-full bg-surface-elevated/90 backdrop-blur-sm border border-border-subtle text-[10px] font-medium text-content-secondary tabular-nums shadow-card"
        >
          {Math.round(zoom * 100)}%
        </motion.div>
      )}
    </AnimatePresence>
  )
}
