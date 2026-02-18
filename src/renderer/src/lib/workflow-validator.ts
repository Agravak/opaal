import type { Workflow } from '../types/workflow'
import { getFlowType } from '../types/workflow'

export interface ValidationWarning {
  severity: 'error' | 'warning' | 'info'
  code: string
  message: string
  affectedAgentIds?: string[]
}

/** Validate a workflow and return any warnings/errors */
export function validateWorkflow(workflow: Workflow): ValidationWarning[] {
  const warnings: ValidationWarning[] = []

  if (workflow.agents.length === 0) return warnings

  // ── Error: Circular Dependencies ──
  const cycleAgents = detectCycles(workflow)
  if (cycleAgents.length > 0) {
    warnings.push({
      severity: 'error',
      code: 'CIRCULAR_DEPENDENCY',
      message: `Circular dependency detected involving: ${cycleAgents.map(id => {
        const a = workflow.agents.find(a => a.id === id)
        return a?.name || id
      }).join(', ')}`,
      affectedAgentIds: cycleAgents,
    })
  }

  // ── Warning: Agents with no output definition ──
  const noOutput = workflow.agents.filter(a => !a.outputDefinition)
  for (const agent of noOutput) {
    const hasDownstream = workflow.connections.some(c => c.sourceAgentId === agent.id)
    if (hasDownstream) {
      warnings.push({
        severity: 'warning',
        code: 'NO_OUTPUT_DEFINITION',
        message: `"${agent.name}" has no output definition but feeds into other agents`,
        affectedAgentIds: [agent.id],
      })
    }
  }

  // ── Warning: Agents with no instructions ──
  const noInstructions = workflow.agents.filter(a => !a.instructions || a.instructions.length < 10)
  for (const agent of noInstructions) {
    warnings.push({
      severity: 'warning',
      code: 'VAGUE_INSTRUCTIONS',
      message: `"${agent.name}" has no or very short instructions — agent will lack clear direction`,
      affectedAgentIds: [agent.id],
    })
  }

  // ── Warning: Orphan agents (disconnected) ──
  if (workflow.agents.length > 1) {
    const connectedIds = new Set([
      ...workflow.connections.map(c => c.sourceAgentId),
      ...workflow.connections.map(c => c.targetAgentId),
    ])
    const orphans = workflow.agents.filter(a => !connectedIds.has(a.id))
    for (const orphan of orphans) {
      warnings.push({
        severity: 'warning',
        code: 'ORPHAN_AGENT',
        message: `"${orphan.name}" is not connected to any other agent`,
        affectedAgentIds: [orphan.id],
      })
    }
  }

  // ── Warning: Multiple write agents in same wave ── (Native mode)
  if (workflow.settings.nativeMode) {
    for (const col of workflow.columns) {
      const colAgents = workflow.agents.filter(a => a.columnId === col.id)
      const writeAgents = colAgents.filter(a =>
        a.allowedTools?.some(t => t === 'write' || t === 'edit')
      )
      if (writeAgents.length > 1) {
        warnings.push({
          severity: 'warning',
          code: 'PARALLEL_WRITE_CONFLICT',
          message: `Wave "${col.name}" has ${writeAgents.length} agents with write access — risk of file conflicts`,
          affectedAgentIds: writeAgents.map(a => a.id),
        })
      }
    }

    // ── Info: Read-only agents using Haiku ──
    for (const agent of workflow.agents) {
      if (agent.subagentType === 'explore' && agent.preferredModel !== 'haiku') {
        warnings.push({
          severity: 'info',
          code: 'HAIKU_SUGGESTION',
          message: `"${agent.name}" is read-only (Explore) — consider using Haiku model for faster, cheaper execution`,
          affectedAgentIds: [agent.id],
        })
      }
    }

    // ── Info: No wave validation checkpoints ──
    if (workflow.columns.length > 1) {
      const colsWithValidation = workflow.columns.filter(c => c.validationCriteria)
      if (colsWithValidation.length === 0) {
        warnings.push({
          severity: 'info',
          code: 'NO_CHECKPOINTS',
          message: 'No wave validation checkpoints — consider adding verification criteria between waves',
        })
      }
    }
  }

  // ── Warning: All agents in one wave ──
  if (workflow.columns.length > 0) {
    const usedColumns = new Set(workflow.agents.map(a => a.columnId))
    if (usedColumns.size === 1 && workflow.agents.length > 2) {
      warnings.push({
        severity: 'warning',
        code: 'SINGLE_WAVE',
        message: 'All agents are in a single wave — consider splitting into sequential phases for better coordination',
      })
    }
  }

  // ── Control Flow Validation ──
  const conditionalConns = workflow.connections.filter(c => getFlowType(c) === 'conditional')
  const loopConns = workflow.connections.filter(c => getFlowType(c) === 'loop')

  // Warning: Conditional connection with no condition text
  for (const conn of conditionalConns) {
    if (!conn.condition || conn.condition.trim().length === 0) {
      const source = workflow.agents.find(a => a.id === conn.sourceAgentId)
      const target = workflow.agents.find(a => a.id === conn.targetAgentId)
      warnings.push({
        severity: 'warning',
        code: 'CONDITIONAL_MISSING_CONDITION',
        message: `Conditional connection from "${source?.name || '?'}" to "${target?.name || '?'}" has no condition text — add a condition so the orchestrator knows when to use this path`,
        affectedAgentIds: [conn.sourceAgentId, conn.targetAgentId],
      })
    }
  }

  // Warning: Conditional routing with no else branch
  const conditionalSources = new Set(conditionalConns.map(c => c.sourceAgentId))
  for (const sourceId of conditionalSources) {
    const outgoing = conditionalConns.filter(c => c.sourceAgentId === sourceId)
    const hasElse = outgoing.some(c => c.isElseBranch)
    if (!hasElse && outgoing.length > 0) {
      const source = workflow.agents.find(a => a.id === sourceId)
      warnings.push({
        severity: 'warning',
        code: 'DEAD_END_CONDITIONAL',
        message: `"${source?.name || '?'}" has conditional routing but no "else" branch — some outputs may be dropped if no condition matches`,
        affectedAgentIds: [sourceId],
      })
    }
  }

  // Error: Loop with no non-loop exit path
  for (const conn of loopConns) {
    const targetId = conn.targetAgentId
    const nonLoopExits = workflow.connections.filter(
      c => c.sourceAgentId === targetId && getFlowType(c) !== 'loop'
    )
    if (nonLoopExits.length === 0) {
      const target = workflow.agents.find(a => a.id === targetId)
      warnings.push({
        severity: 'error',
        code: 'LOOP_NO_EXIT',
        message: `"${target?.name || '?'}" is in a loop but has no non-loop exit path — the workflow will loop indefinitely`,
        affectedAgentIds: [conn.sourceAgentId, targetId],
      })
    }
  }

  // Info: High iteration count on loops
  for (const conn of loopConns) {
    if (conn.maxIterations && conn.maxIterations > 5) {
      const source = workflow.agents.find(a => a.id === conn.sourceAgentId)
      const target = workflow.agents.find(a => a.id === conn.targetAgentId)
      warnings.push({
        severity: 'info',
        code: 'LOOP_HIGH_ITERATIONS',
        message: `Loop between "${source?.name || '?'}" and "${target?.name || '?'}" allows ${conn.maxIterations} iterations — consider reducing for faster execution`,
        affectedAgentIds: [conn.sourceAgentId, conn.targetAgentId],
      })
    }
  }

  return warnings
}

/** Detect cycles in the workflow graph using DFS (skip loop connections — they are intentional) */
function detectCycles(workflow: Workflow): string[] {
  const adj = new Map<string, string[]>()
  for (const agent of workflow.agents) {
    adj.set(agent.id, [])
  }
  for (const conn of workflow.connections) {
    // Skip loop connections — they represent intentional cycles
    if (getFlowType(conn) === 'loop') continue
    const list = adj.get(conn.sourceAgentId)
    if (list) list.push(conn.targetAgentId)
  }

  const visited = new Set<string>()
  const inStack = new Set<string>()
  const cycleNodes = new Set<string>()

  function dfs(node: string): boolean {
    visited.add(node)
    inStack.add(node)

    const neighbors = adj.get(node) || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          cycleNodes.add(node)
          return true
        }
      } else if (inStack.has(neighbor)) {
        cycleNodes.add(node)
        cycleNodes.add(neighbor)
        return true
      }
    }

    inStack.delete(node)
    return false
  }

  for (const agent of workflow.agents) {
    if (!visited.has(agent.id)) {
      dfs(agent.id)
    }
  }

  return Array.from(cycleNodes)
}
