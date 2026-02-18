import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import type { ConnectionFlowType } from '../../types/workflow'

interface GradientEdgeData {
  sourceColor?: string
  targetColor?: string
  flowType?: ConnectionFlowType
  conditionLabel?: string
  isElseBranch?: boolean
  loopCondition?: string
  maxIterations?: number
  approvalPrompt?: string
}

const FLOW_COLORS: Record<ConnectionFlowType, string> = {
  'always': '',  // uses gradient
  'conditional': '#f59e0b',
  'approval-gate': '#6366f1',
  'loop': '#10b981',
}

export function GradientEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
}: EdgeProps) {
  const edgeData = data as GradientEdgeData | undefined
  const flowType = edgeData?.flowType ?? 'always'

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const gradientId = `edge-gradient-${id}`
  const sourceColor = edgeData?.sourceColor || '#6366f1'
  const targetColor = edgeData?.targetColor || '#818cf8'

  // Flow-type-specific stroke styling
  const flowColor = FLOW_COLORS[flowType]
  const isElse = edgeData?.isElseBranch
  let strokeDasharray: string | undefined
  let strokeWidth = 2
  let strokeOpacity = 1
  let animationClass = ''

  switch (flowType) {
    case 'conditional':
      strokeWidth = isElse ? 2 : 2.5
      strokeDasharray = isElse ? '6 4' : undefined
      strokeOpacity = isElse ? 0.6 : 0.85
      break
    case 'approval-gate':
      strokeDasharray = '3 4'
      strokeOpacity = 0.8
      break
    case 'loop':
      animationClass = 'edge-loop-animated'
      strokeDasharray = '8 4'
      strokeOpacity = 0.85
      break
  }

  // Build the label text for non-always connections
  let badgeLabel = ''
  let badgeIcon = ''
  if (flowType === 'conditional') {
    badgeIcon = '◆'
    badgeLabel = isElse ? 'Otherwise' : (edgeData?.conditionLabel || '')
  } else if (flowType === 'approval-gate') {
    badgeIcon = '⏸'
    badgeLabel = 'Approval'
  } else if (flowType === 'loop') {
    badgeIcon = '↻'
    const cond = edgeData?.loopCondition
    const max = edgeData?.maxIterations ?? 3
    badgeLabel = cond ? `${cond.slice(0, 30)}${cond.length > 30 ? '…' : ''} (max ${max})` : `Loop (max ${max})`
  }

  return (
    <>
      <defs>
        {flowType === 'always' ? (
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={sourceColor} stopOpacity={0.7} />
            <stop offset="100%" stopColor={targetColor} stopOpacity={0.35} />
          </linearGradient>
        ) : (
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={flowColor} stopOpacity={strokeOpacity} />
            <stop offset="100%" stopColor={flowColor} stopOpacity={strokeOpacity * 0.5} />
          </linearGradient>
        )}
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        className={animationClass}
        style={{
          ...style,
          stroke: `url(#${gradientId})`,
          strokeWidth,
          strokeDasharray,
        }}
      />
      {/* Flow type badge label */}
      {flowType !== 'always' && badgeLabel && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium whitespace-nowrap border"
              style={{
                backgroundColor: `${flowColor}15`,
                borderColor: `${flowColor}30`,
                color: flowColor,
              }}
            >
              <span className="text-[8px]">{badgeIcon}</span>
              <span>{badgeLabel}</span>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
