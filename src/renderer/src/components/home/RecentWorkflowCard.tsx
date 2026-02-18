import { motion } from 'framer-motion'
import { ROLE_ACCENT, type AgentRole } from '../../types/workflow'

interface RecentWorkflowCardProps {
  name: string
  filePath: string
  agentCount: number
  waveCount: number
  roleColors: string[]
  lastOpened: string
  index: number
  onClick: () => void
  onRemove: () => void
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

export function RecentWorkflowCard({
  name,
  agentCount,
  waveCount,
  roleColors,
  lastOpened,
  index,
  onClick,
  onRemove,
}: RecentWorkflowCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative flex flex-col gap-2.5 w-[220px] min-w-[220px] p-4 rounded-[10px] border border-border-subtle bg-surface-elevated hover:border-accent/30 hover:shadow-card-hover transition-all duration-200 text-left group"
    >
      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-surface-tertiary transition-all"
      >
        <svg width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>

      {/* Role color dots */}
      <div className="flex items-center gap-1.5">
        {roleColors.slice(0, 5).map((role, i) => (
          <div
            key={i}
            className="w-[6px] h-[6px] rounded-full"
            style={{ background: ROLE_ACCENT[role as AgentRole] || '#71717a' }}
          />
        ))}
        {roleColors.length === 0 && (
          <div className="w-[6px] h-[6px] rounded-full bg-content-tertiary/30" />
        )}
      </div>

      {/* Name */}
      <span className="text-[13px] font-semibold text-content-primary truncate pr-4">
        {name}
      </span>

      {/* Stats */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-content-tertiary">
          {agentCount} agent{agentCount !== 1 ? 's' : ''}
        </span>
        <span className="text-[10px] text-content-tertiary opacity-40">·</span>
        <span className="text-[10px] text-content-tertiary">
          {waveCount} wave{waveCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Time */}
      <span className="text-[10px] text-content-tertiary/60">
        {timeAgo(lastOpened)}
      </span>
    </motion.button>
  )
}
