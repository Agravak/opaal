import type { Workflow, Connection, Column, AgentNode } from '../types/workflow'
import { getFlowType } from '../types/workflow'
import { v4 as uuid } from 'uuid'

/**
 * Smart 1-to-1 positional auto-connection system.
 *
 * Rules:
 * - Agents in adjacent columns are paired by vertical position (Y)
 * - source[0]→target[0], source[1]→target[1], etc.
 * - If more sources than targets: extras connect to the last target
 * - If more targets than sources: extras connect from the last source
 * - If a manual connection already exists for a pair, skip auto
 * - Auto-connections have type 'auto', manual ones have type 'manual'
 * - When recalculating, only touch auto connections (preserve all manual)
 */
export function recalculateAutoConnections(workflow: Workflow): Connection[] {
  const manualConnections = workflow.connections.filter(c => c.type === 'manual')
  const manualSet = new Set(
    manualConnections.map(c => `${c.sourceAgentId}:${c.targetAgentId}`)
  )
  const excludedPairs = new Set(workflow.settings.autoConnectionExclusions ?? [])

  const sortedColumns = [...workflow.columns].sort((a, b) => a.order - b.order)
  const autoConnections: Connection[] = []

  for (let i = 0; i < sortedColumns.length - 1; i++) {
    const currentCol = sortedColumns[i]
    const nextCol = sortedColumns[i + 1]

    const sourceAgents = workflow.agents
      .filter(a => a.columnId === currentCol.id)
      .sort((a, b) => a.position.y - b.position.y)
    const targetAgents = workflow.agents
      .filter(a => a.columnId === nextCol.id)
      .sort((a, b) => a.position.y - b.position.y)

    if (sourceAgents.length === 0 || targetAgents.length === 0) continue

    const pairCount = Math.max(sourceAgents.length, targetAgents.length)
    const seenPairs = new Set<string>()

    for (let j = 0; j < pairCount; j++) {
      const source = sourceAgents[Math.min(j, sourceAgents.length - 1)]
      const target = targetAgents[Math.min(j, targetAgents.length - 1)]
      const key = `${source.id}:${target.id}`

      if (manualSet.has(key) || excludedPairs.has(key) || seenPairs.has(key)) continue
      seenPairs.add(key)

      autoConnections.push({
        id: uuid(),
        sourceAgentId: source.id,
        targetAgentId: target.id,
        type: 'auto',
        flowType: 'always',
      })
    }
  }

  return [...manualConnections, ...autoConnections]
}

/**
 * Check if adding a connection would create a cycle.
 * When ignoreLoops is true, existing loop connections are excluded from
 * the adjacency graph (they represent intentional cycles).
 */
export function wouldCreateCycle(
  agents: AgentNode[],
  connections: Connection[],
  sourceId: string,
  targetId: string,
  ignoreLoops = false
): boolean {
  const adjacency = new Map<string, Set<string>>()
  for (const agent of agents) {
    adjacency.set(agent.id, new Set())
  }
  for (const conn of connections) {
    // Skip loop connections if ignoreLoops is set
    if (ignoreLoops && getFlowType(conn) === 'loop') continue
    adjacency.get(conn.sourceAgentId)?.add(conn.targetAgentId)
  }
  // Add the proposed connection
  adjacency.get(sourceId)?.add(targetId)

  // DFS from target to see if we can reach source (cycle)
  const visited = new Set<string>()
  const stack = [targetId]
  while (stack.length > 0) {
    const current = stack.pop()!
    if (current === sourceId) return true
    if (visited.has(current)) continue
    visited.add(current)
    const neighbors = adjacency.get(current)
    if (neighbors) {
      neighbors.forEach(n => stack.push(n))
    }
  }
  return false
}
