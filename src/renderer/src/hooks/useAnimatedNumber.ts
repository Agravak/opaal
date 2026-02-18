import { useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { useEffect } from 'react'

export function useAnimatedNumber(
  value: number,
  config = { stiffness: 120, damping: 20, mass: 0.5 }
): MotionValue<string> {
  const motionValue = useMotionValue(value)
  const spring = useSpring(motionValue, config)
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString())

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  return display
}
