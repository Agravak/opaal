import { useCallback, useMemo, useState, useRef } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  BackgroundVariant,
  MarkerType,
  SelectionMode,
  useReactFlow
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import AgentNodeComponent from '../nodes/AgentNode'
import ColumnHeaderNode from './ColumnHeader'
import { CanvasControls } from './CanvasControls'
import { ZoomIndicator } from './ZoomIndicator'
import { GradientEdge } from './GradientEdge'
import { SelectionActionBar } from './SelectionActionBar'
import { ContextMenu } from './ContextMenu'
import { PlacementGhost } from './PlacementGhost'
// CommandBar moved to AppShell for full-width rendering
import { DeployEffect } from './DeployEffect'
import { useWorkflowStore } from '../../stores/workflow-store'
import { useUIStore } from '../../stores/ui-store'
import { useCustomAgentsStore } from '../../stores/custom-agents-store'
import { ROLE_ACCENT, FLOW_TYPE_META, getFlowType, type AgentRole, type Column } from '../../types/workflow'
import { templates } from '../../lib/templates'
import { motion } from 'framer-motion'

const nodeTypes = {
  agentCard: AgentNodeComponent,
  columnHeader: ColumnHeaderNode
}

const edgeTypes = {
  gradient: GradientEdge,
}

const COLUMN_WIDTH = 340
const COLUMN_GAP = 80

export function WorkflowCanvas() {
  const workflow = useWorkflowStore((s) => s.workflow)
  const updateAgent = useWorkflowStore((s) => s.updateAgent)
  const addConnection = useWorkflowStore((s) => s.addConnection)
  const addColumn = useWorkflowStore((s) => s.addColumn)
  const addAgent = useWorkflowStore((s) => s.addAgent)
  const addAgentAtPosition = useWorkflowStore((s) => s.addAgentAtPosition)
  const addAgentFromTemplate = useWorkflowStore((s) => s.addAgentFromTemplate)
  const addAgentFromTemplateAtPosition = useWorkflowStore((s) => s.addAgentFromTemplateAtPosition)
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow)
  const moveAgentToColumn = useWorkflowStore((s) => s.moveAgentToColumn)
  const selectedEdgeIds = useUIStore((s) => s.selectedEdgeIds)
  const selectEdges = useUIStore((s) => s.selectEdges)
  const selectNodes = useUIStore((s) => s.selectNodes)
  const setSelection = useUIStore((s) => s.setSelection)
  const clearSelection = useUIStore((s) => s.clearSelection)
  const openContextMenu = useUIStore((s) => s.openContextMenu)
  const closeContextMenu = useUIStore((s) => s.closeContextMenu)
  const canvasMode = useUIStore((s) => s.canvasMode)
  const placementMode = useUIStore((s) => s.placementMode)
  const placementRole = useUIStore((s) => s.placementRole)
  const placementTemplateId = useUIStore((s) => s.placementTemplateId)
  const exitPlacementMode = useUIStore((s) => s.exitPlacementMode)

  const reactFlowInstance = useReactFlow()

  // Mouse tracking for placement ghost
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Deploy effects state
  const [deployEffects, setDeployEffects] = useState<Array<{
    id: string; x: number; y: number; accentColor: string
  }>>([])
  const [recentlyDeployedId, setRecentlyDeployedId] = useState<string | null>(null)

  // Interaction tracking for smooth zoom/pan
  const [isInteracting, setIsInteracting] = useState(false)
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // Node drag tracking for snap-on-release
  const [isDraggingNode, setIsDraggingNode] = useState(false)

  const onMoveStart = useCallback(() => {
    setIsInteracting(true)
    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current)
  }, [])

  const onMoveEnd = useCallback(() => {
    interactionTimeoutRef.current = setTimeout(() => setIsInteracting(false), 150)
  }, [])

  const onNodeDragStart = useCallback(() => {
    setIsDraggingNode(true)
  }, [])

  const onNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    setIsDraggingNode(false)
    if (node.id.startsWith('col-header-')) return

    const { columns, agents } = useWorkflowStore.getState().workflow
    const currentAgent = agents.find(a => a.id === node.id)
    if (!currentAgent) return

    // Find nearest column based on the dropped card's center X
    const cardCenterX = node.position.x + COLUMN_WIDTH / 2
    let nearestCol: Column | null = null
    let minDist = Infinity
    for (const col of columns) {
      const colCenterX = col.order * (COLUMN_WIDTH + COLUMN_GAP) + 40 + COLUMN_WIDTH / 2
      const dist = Math.abs(cardCenterX - colCenterX)
      if (dist < minDist) { minDist = dist; nearestCol = col }
    }

    if (nearestCol && nearestCol.id !== currentAgent.columnId) {
      // Agent was dragged into a different column — reassign it
      moveAgentToColumn(node.id, nearestCol.id)
    } else {
      // Same column: snap X to canonical column X, snap Y to 12px grid
      const canonicalX = nearestCol
        ? nearestCol.order * (COLUMN_WIDTH + COLUMN_GAP) + 40
        : Math.round(node.position.x / 12) * 12
      const snappedY = Math.round(node.position.y / 12) * 12
      updateAgent(node.id, { position: { x: canonicalX, y: snappedY } })
    }
  }, [updateAgent, moveAgentToColumn])

  // Convert workflow columns + agents to React Flow nodes
  const nodes: Node[] = useMemo(() => {
    const columnHeaderNodes: Node[] = workflow.columns.map((column) => ({
      id: `col-header-${column.id}`,
      type: 'columnHeader',
      position: {
        x: column.order * (COLUMN_WIDTH + COLUMN_GAP) + 40,
        y: 20
      },
      data: { column },
      draggable: false,
      selectable: false,
      connectable: false,
      width: COLUMN_WIDTH,
      height: 32,
    }))

    const agentNodes: Node[] = workflow.agents.map((agent) => ({
      id: agent.id,
      type: 'agentCard',
      position: agent.position,
      data: { agent, isDeploying: agent.id === recentlyDeployedId },
      draggable: true,
      width: 280,
      height: 220,
    }))

    return [...columnHeaderNodes, ...agentNodes]
  }, [workflow.agents, workflow.columns, recentlyDeployedId])

  // Convert workflow connections to React Flow edges
  const edges: Edge[] = useMemo(() =>
    workflow.connections.map((conn) => {
      const sourceAgent = workflow.agents.find(a => a.id === conn.sourceAgentId)
      const targetAgent = workflow.agents.find(a => a.id === conn.targetAgentId)
      const accentColor = sourceAgent ? ROLE_ACCENT[sourceAgent.role] : '#6366f1'
      const targetColor = targetAgent ? ROLE_ACCENT[targetAgent.role] : '#818cf8'
      const flowType = getFlowType(conn)
      const flowMeta = FLOW_TYPE_META[flowType]
      const markerColor = flowType === 'always' ? targetColor : flowMeta.color

      return {
        id: conn.id,
        source: conn.sourceAgentId,
        target: conn.targetAgentId,
        type: 'gradient',
        selectable: true,
        data: {
          sourceColor: accentColor,
          targetColor: targetColor,
          flowType,
          conditionLabel: conn.conditionLabel,
          isElseBranch: conn.isElseBranch,
          loopCondition: conn.loopCondition,
          maxIterations: conn.maxIterations,
          approvalPrompt: conn.approvalPrompt,
        },
        style: {
          strokeWidth: 2,
          opacity: 0.65,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: markerColor,
        },
        label: flowType === 'always' ? (conn.dataDescription || undefined) : undefined,
        labelStyle: {
          fontSize: 10,
          fontWeight: 500,
          fill: 'var(--color-content-tertiary)',
        },
        labelBgStyle: {
          fill: 'var(--color-surface-elevated)',
          fillOpacity: 0.9,
        },
      }
    }),
    [workflow.connections, workflow.agents]
  )

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        // Skip column header pseudo-nodes
        if (change.id.startsWith('col-header-')) continue
        updateAgent(change.id, { position: change.position })
      }
    }
  }, [updateAgent])

  const onEdgesChange: OnEdgesChange = useCallback(() => {
    // Edge changes handled through workflow store
  }, [])

  const onConnect: OnConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      addConnection(connection.source, connection.target, 'manual')
    }
  }, [addConnection])

  // Mouse move handler for placement ghost
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (placementMode) {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
  }, [placementMode])

  const onPaneClick = useCallback((event: React.MouseEvent) => {
    closeContextMenu()

    // ── Click-to-Deploy Logic ──
    if (placementMode) {
      const { screenToFlowPosition } = reactFlowInstance
      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const { columns } = useWorkflowStore.getState().workflow

      // Find nearest column or create one
      let targetColumnId: string
      let snapX: number

      if (columns.length === 0) {
        targetColumnId = addColumn()
        snapX = 40
      } else {
        let nearestCol: Column | null = null
        let minDist = Infinity
        for (const col of columns) {
          const colCenterX = col.order * (COLUMN_WIDTH + COLUMN_GAP) + 40 + COLUMN_WIDTH / 2
          const dist = Math.abs(flowPos.x - colCenterX)
          if (dist < minDist) { minDist = dist; nearestCol = col }
        }
        targetColumnId = nearestCol!.id
        snapX = nearestCol!.order * (COLUMN_WIDTH + COLUMN_GAP) + 40
      }

      // Snap Y to 12px grid, minimum 80 (below column headers)
      const snapY = Math.max(80, Math.round(flowPos.y / 12) * 12)
      const position = { x: snapX, y: snapY }

      let newAgentId: string
      let accentColor: string

      if (placementTemplateId) {
        const template = useCustomAgentsStore.getState().templates.find((t) => t.id === placementTemplateId)
        if (!template) { exitPlacementMode(); return }
        newAgentId = addAgentFromTemplateAtPosition(targetColumnId, template, position)
        accentColor = ROLE_ACCENT[template.role] || ROLE_ACCENT.custom
      } else if (placementRole) {
        newAgentId = addAgentAtPosition(targetColumnId, placementRole, position)
        accentColor = ROLE_ACCENT[placementRole] || ROLE_ACCENT.custom
      } else {
        exitPlacementMode()
        return
      }

      // Trigger deploy effects
      const effectId = `deploy-${Date.now()}`
      setDeployEffects((prev) => [...prev, {
        id: effectId,
        x: snapX + 140, // Center of card (280/2)
        y: snapY + 60,  // Near top of card
        accentColor,
      }])

      // Track recently deployed agent for enhanced materialization
      setRecentlyDeployedId(newAgentId)
      setTimeout(() => setRecentlyDeployedId(null), 800)

      // Select the new agent
      selectNodes([newAgentId])

      // Exit placement mode after deploy
      exitPlacementMode()
      return
    }

    clearSelection()
  }, [placementMode, placementRole, placementTemplateId, clearSelection, closeContextMenu, exitPlacementMode, addColumn, addAgentAtPosition, addAgentFromTemplateAtPosition, selectNodes])

  // Marquee/click selection sync: React Flow selection -> ui-store
  const handleSelectionChange = useCallback(({ nodes: selectedNodes, edges: selectedEdges }: { nodes: Node[]; edges: Edge[] }) => {
    const agentIds = selectedNodes
      .filter(n => !n.id.startsWith('col-header-'))
      .map(n => n.id)
    const edgeIds = selectedEdges.map(edge => edge.id)
    setSelection(agentIds, edgeIds)
  }, [setSelection])

  const openConnectionConfig = useUIStore((s) => s.openConnectionConfigPopup)

  const handleEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    openConnectionConfig(edge.id)
  }, [openConnectionConfig])

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault()
    event.stopPropagation()

    if (!selectedEdgeIds.has(edge.id)) {
      selectEdges([edge.id])
    }

    openContextMenu(event.clientX, event.clientY, null, edge.id)
  }, [selectedEdgeIds, selectEdges, openContextMenu])

  // Right-click on canvas pane (also cancels placement mode)
  const handlePaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
    event.preventDefault()
    if (placementMode) {
      exitPlacementMode()
      return
    }
    openContextMenu((event as React.MouseEvent).clientX, (event as React.MouseEvent).clientY, null, null)
  }, [placementMode, exitPlacementMode, openContextMenu])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()

    // Handle custom template drop
    const customTemplateId = event.dataTransfer.getData('application/opaal-custom-template')
    if (customTemplateId) {
      const template = useCustomAgentsStore.getState().templates.find((t) => t.id === customTemplateId)
      if (template) {
        let columnId: string
        if (workflow.columns.length === 0) {
          columnId = addColumn()
        } else {
          columnId = workflow.columns[workflow.columns.length - 1].id
        }
        addAgentFromTemplate(columnId, template)
      }
      return
    }

    // Handle built-in role drop
    const role = event.dataTransfer.getData('application/opaal-role') as AgentRole
    if (!role) return

    let columnId: string
    if (workflow.columns.length === 0) {
      columnId = addColumn()
    } else {
      columnId = workflow.columns[workflow.columns.length - 1].id
    }
    addAgent(columnId, role)
  }, [workflow.columns, addColumn, addAgent, addAgentFromTemplate])

  // Callback to remove a deploy effect after it completes
  const handleDeployEffectComplete = useCallback((effectId: string) => {
    setDeployEffects((prev) => prev.filter((e) => e.id !== effectId))
  }, [])

  return (
    <div
      className={`relative w-full h-full ${isInteracting ? 'rf-interacting' : ''} ${placementMode ? 'placement-cursor' : ''}`}
      onMouseMove={handleMouseMove}
    >
      <CanvasControls />
      <ZoomIndicator />
      <SelectionActionBar />
      <ContextMenu />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onMoveStart={onMoveStart}
        onMoveEnd={onMoveEnd}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onSelectionChange={handleSelectionChange}
        onPaneContextMenu={handlePaneContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        onEdgeDoubleClick={handleEdgeDoubleClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        proOptions={{ hideAttribution: true }}
        defaultViewport={{ x: 40, y: 40, zoom: 1 }}
        minZoom={0.15}
        maxZoom={2.5}
        snapToGrid={!isDraggingNode}
        snapGrid={[12, 12]}
        selectionOnDrag={canvasMode === 'select' && !placementMode}
        panOnDrag={placementMode ? false : canvasMode === 'pan' ? [0, 1] : [1]}
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode="Shift"
        selectionKeyCode={null}
        deleteKeyCode={null}
        className="bg-surface-canvas"
        connectionLineStyle={{ stroke: 'var(--color-accent)', strokeWidth: 2, strokeDasharray: '6 3' }}
        defaultEdgeOptions={{
          type: 'gradient',
          style: { strokeWidth: 2 }
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.2}
          color="var(--color-surface-canvas-dot)"
        />
        <MiniMap
          position="bottom-right"
          style={{
            background: 'var(--color-surface-secondary)',
            borderRadius: '10px',
            border: '1px solid var(--color-border-subtle)',
            width: 160,
            height: 100,
            marginBottom: 80,
          }}
          maskColor="rgba(0,0,0,0.25)"
          nodeColor={(node) => {
            if (node.type === 'columnHeader') return 'transparent'
            const agent = node.data?.agent
            if (agent?.role) return ROLE_ACCENT[agent.role as AgentRole] ?? '#6366f1'
            return '#6366f1'
          }}
          pannable
          zoomable
        />
        <Controls
          position="bottom-left"
          showInteractive={false}
          style={{ marginBottom: 80 }}
        />
      </ReactFlow>

      {/* Deploy effects rendered inside React Flow viewport */}
      {deployEffects.map((effect) => (
        <DeployEffect
          key={effect.id}
          x={effect.x}
          y={effect.y}
          accentColor={effect.accentColor}
          onComplete={() => handleDeployEffectComplete(effect.id)}
        />
      ))}

      {/* Empty state with template selection */}
      {workflow.agents.length === 0 && !placementMode && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-6 animate-fade-in pointer-events-auto">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-tertiary/50 border border-border-subtle">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-content-tertiary">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <path d="M10 6.5h4" />
                <path d="M6.5 10v4" />
                <path d="M17.5 10v4" />
                <path d="M10 17.5h4" />
              </svg>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-[14px] font-semibold text-content-secondary tracking-tight">
                Design your agent workflow
              </p>
              <p className="text-[12px] text-content-tertiary max-w-[280px] text-center leading-relaxed">
                Start from a template below, or press 1-9 to deploy agents.
              </p>
            </div>

            {/* Template Cards */}
            <div className="flex gap-3 mt-2">
              {templates.map((tmpl) => (
                <motion.button
                  key={tmpl.id}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => loadWorkflow(tmpl.create())}
                  className="flex flex-col gap-2 p-4 rounded-card border border-border-subtle bg-surface-elevated hover:border-accent/30 hover:shadow-card-hover transition-all duration-200 text-left w-[200px] group"
                >
                  <span className="text-[12px] font-semibold text-content-primary group-hover:text-accent transition-colors">
                    {tmpl.name}
                  </span>
                  <span className="text-[10.5px] text-content-tertiary leading-relaxed line-clamp-2">
                    {tmpl.description}
                  </span>
                  <span className="text-[9.5px] font-mono text-content-tertiary opacity-60 mt-1">
                    {tmpl.preview}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Placement ghost overlay (follows cursor) */}
      <PlacementGhost mouseX={mousePos.x} mouseY={mousePos.y} />

      {/* CommandBar rendered in AppShell for full-width layout */}
    </div>
  )
}
