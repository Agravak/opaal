import { useEffect, useState, useMemo } from 'react'

interface DeployEffectProps {
  /** Position in flow coordinates (rendered inside React Flow viewport) */
  x: number
  y: number
  accentColor: string
  onComplete: () => void
}

function randomOffset(range: number): number {
  return (Math.random() - 0.5) * 2 * range
}

export function DeployEffect({ x, y, accentColor, onComplete }: DeployEffectProps) {
  const [visible, setVisible] = useState(true)

  // Generate particle positions once on mount
  const particles = useMemo(() =>
    Array.from({ length: 8 }, () => ({
      px: randomOffset(80),
      py: randomOffset(80),
      delay: Math.random() * 0.06,
    })),
    []
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onComplete()
    }, 1000)
    return () => clearTimeout(timer)
  }, [onComplete])

  if (!visible) return null

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        '--deploy-accent': accentColor,
      } as React.CSSProperties}
    >
      {/* Phase 1: Shockwave ring */}
      <div
        className="absolute deploy-shockwave-anim"
        style={{
          width: 80,
          height: 80,
          left: -40,
          top: -40,
          borderRadius: '50%',
          border: `3px solid ${accentColor}`,
        }}
      />

      {/* Phase 2: Converging energy particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute deploy-particle-anim"
          style={{
            width: 6,
            height: 6,
            left: -3,
            top: -3,
            borderRadius: '50%',
            background: accentColor,
            boxShadow: `0 0 8px ${accentColor}, 0 0 14px ${accentColor}60`,
            '--px': `${p.px}px`,
            '--py': `${p.py}px`,
            animationDelay: `${p.delay + 0.05}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* Phase 3: Glow burst (large radial gradient) */}
      <div
        className="absolute deploy-glow-burst-anim"
        style={{
          width: 200,
          height: 200,
          left: -100,
          top: -100,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}50 0%, ${accentColor}15 40%, transparent 70%)`,
        }}
      />

      {/* Phase 4: Inner flash */}
      <div
        className="absolute deploy-inner-flash-anim"
        style={{
          width: 40,
          height: 40,
          left: -20,
          top: -20,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}80 0%, transparent 60%)`,
        }}
      />
    </div>
  )
}
