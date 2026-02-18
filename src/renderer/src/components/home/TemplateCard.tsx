import { motion } from 'framer-motion'
import { ROLE_ACCENT, type AgentRole } from '../../types/workflow'
import type { WorkflowTemplate } from '../../lib/templates'

interface TemplateCardProps {
  template: WorkflowTemplate
  index: number
  onClick: () => void
}

// Mini schematic data for each template
const TEMPLATE_SCHEMATICS: Record<string, { nodes: { role: AgentRole; x: number; y: number }[]; edges: [number, number][] }> = {
  'code-review': {
    nodes: [
      { role: 'researcher', x: 20, y: 24 },
      { role: 'reviewer', x: 80, y: 24 },
      { role: 'documenter', x: 140, y: 24 },
    ],
    edges: [[0, 1], [1, 2]],
  },
  'feature-build': {
    nodes: [
      { role: 'researcher', x: 15, y: 24 },
      { role: 'architect', x: 60, y: 24 },
      { role: 'developer', x: 105, y: 16 },
      { role: 'tester', x: 105, y: 32 },
      { role: 'reviewer', x: 150, y: 24 },
    ],
    edges: [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4]],
  },
  'bug-fix': {
    nodes: [
      { role: 'researcher', x: 15, y: 24 },
      { role: 'developer', x: 60, y: 24 },
      { role: 'tester', x: 105, y: 24 },
      { role: 'documenter', x: 150, y: 24 },
    ],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
  'content-research-production': {
    nodes: [
      { role: 'researcher', x: 15, y: 16 },
      { role: 'researcher', x: 15, y: 32 },
      { role: 'blog_post_writer', x: 60, y: 24 },
      { role: 'architect', x: 105, y: 24 },
      { role: 'developer', x: 150, y: 16 },
      { role: 'powerpoint_presentation_builder', x: 150, y: 32 },
    ],
    edges: [[0, 2], [1, 2], [2, 3], [3, 4], [3, 5]],
  },
}

function MiniSchematic({ templateId }: { templateId: string }) {
  const schematic = TEMPLATE_SCHEMATICS[templateId]
  if (!schematic) return null

  return (
    <svg width="170" height="48" viewBox="0 0 170 48" className="mx-auto">
      {/* Edges */}
      {schematic.edges.map(([from, to], i) => {
        const a = schematic.nodes[from]
        const b = schematic.nodes[to]
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="var(--color-border-strong)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        )
      })}
      {/* Nodes */}
      {schematic.nodes.map((node, i) => (
        <circle
          key={i}
          cx={node.x}
          cy={node.y}
          r="5"
          fill={ROLE_ACCENT[node.role]}
          opacity="0.85"
        />
      ))}
    </svg>
  )
}

export function TemplateCard({ template, index, onClick }: TemplateCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.05, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex flex-col gap-3 w-[260px] min-w-[260px] p-5 rounded-[10px] border border-border-subtle bg-surface-elevated hover:border-accent/30 hover:shadow-card-hover transition-all duration-200 text-left group"
    >
      {/* Mini schematic */}
      <div className="w-full h-12 flex items-center justify-center rounded-lg bg-surface-tertiary/50 group-hover:bg-surface-tertiary/80 transition-colors">
        <MiniSchematic templateId={template.id} />
      </div>

      {/* Name */}
      <span className="text-[13px] font-semibold text-content-primary">
        {template.name}
      </span>

      {/* Description */}
      <span className="text-[11px] text-content-tertiary leading-relaxed line-clamp-2">
        {template.description}
      </span>

      {/* Flow preview */}
      <span className="text-[10px] text-content-tertiary/60 font-mono">
        {template.preview}
      </span>
    </motion.button>
  )
}
