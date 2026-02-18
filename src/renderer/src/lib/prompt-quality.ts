import type { Workflow } from '../types/workflow'
import { getFlowType } from '../types/workflow'

export interface QualityBreakdown {
  agentCompleteness: number
  handoffClarity: number
  orchestrationPattern: number
  contextIsolation: number
  permissionGranularity: number
}

export interface PromptQualityScore {
  overall: number  // 0-100
  breakdown: QualityBreakdown
  suggestions: string[]
}

/** Score the quality of a workflow's generated prompt (0-100) */
export function scorePromptQuality(workflow: Workflow): PromptQualityScore {
  const suggestions: string[] = []
  const native = workflow.settings.nativeMode

  // ── Agent Completeness (0-30) ──
  let agentCompleteness = 0
  if (workflow.agents.length > 0) {
    const perAgent = workflow.agents.map(agent => {
      let score = 0
      if (agent.name && agent.name !== 'New Agent' && agent.name !== 'Custom Agent') score += 25
      if (agent.roleDescription && agent.roleDescription.length > 10) score += 25
      if (agent.outputDefinition && agent.outputDefinition.length > 5) score += 25
      if (agent.instructions && agent.instructions.length > 20) score += 25
      return score
    })
    agentCompleteness = Math.round(perAgent.reduce((a, b) => a + b, 0) / perAgent.length)

    // Suggestions
    for (const agent of workflow.agents) {
      if (!agent.outputDefinition) {
        suggestions.push(`"${agent.name}" has no output definition — downstream agents won't know what to expect`)
      }
      if (!agent.instructions || agent.instructions.length < 20) {
        suggestions.push(`"${agent.name}" has vague instructions — add detailed task description`)
      }
      if (!agent.roleDescription) {
        suggestions.push(`"${agent.name}" has no description — other agents need to understand its role`)
      }
    }
  }

  // ── Handoff Clarity (0-25) ──
  let handoffClarity = 0
  if (workflow.connections.length > 0) {
    const connsWithDesc = workflow.connections.filter(c => c.dataDescription && c.dataDescription.length > 3)
    handoffClarity = Math.round((connsWithDesc.length / workflow.connections.length) * 100)

    if (native) {
      const connsWithFormat = workflow.connections.filter(c => c.handoffFormat)
      const formatScore = workflow.connections.length > 0
        ? Math.round((connsWithFormat.length / workflow.connections.length) * 100)
        : 0
      handoffClarity = Math.round((handoffClarity + formatScore) / 2)
    }

    // Control flow: conditional connections without condition text reduce clarity
    const conditionalNoCondition = workflow.connections.filter(
      c => getFlowType(c) === 'conditional' && (!c.condition || c.condition.trim().length === 0)
    )
    if (conditionalNoCondition.length > 0) {
      const penalty = Math.round((conditionalNoCondition.length / workflow.connections.length) * 30)
      handoffClarity = Math.max(0, handoffClarity - penalty)
      suggestions.push(`${conditionalNoCondition.length} conditional connection(s) have no condition — the orchestrator won't know when to route`)
    }

    // Control flow: loop connections without exit condition reduce clarity
    const loopsNoCondition = workflow.connections.filter(
      c => getFlowType(c) === 'loop' && (!c.loopCondition || c.loopCondition.trim().length === 0)
    )
    if (loopsNoCondition.length > 0) {
      const penalty = Math.round((loopsNoCondition.length / workflow.connections.length) * 20)
      handoffClarity = Math.max(0, handoffClarity - penalty)
      suggestions.push(`${loopsNoCondition.length} loop connection(s) have no exit condition — add a condition to stop iteration`)
    }

    const connsWithoutDesc = workflow.connections.filter(c => !c.dataDescription || c.dataDescription.length <= 3)
    if (connsWithoutDesc.length > 0) {
      suggestions.push(`${connsWithoutDesc.length} connection(s) have no data description — specify what flows between agents`)
    }

    if (native) {
      const connsWithoutFormat = workflow.connections.filter(c => !c.handoffFormat)
      if (connsWithoutFormat.length > 0) {
        suggestions.push(`${connsWithoutFormat.length} connection(s) have no handoff format — specify Summary, JSON, File Reference, or Full Output`)
      }
    }
  } else if (workflow.agents.length > 1) {
    suggestions.push('No connections between agents — agents will work in isolation')
  } else {
    handoffClarity = 100 // Single agent, no connections needed
  }

  // ── Orchestration Pattern (0-20) ──
  let orchestrationPattern = 0
  if (workflow.columns.length > 0) {
    // Has wave structure
    orchestrationPattern += 40

    // Agents are distributed across waves (not all in one)
    const usedColumns = new Set(workflow.agents.map(a => a.columnId))
    if (usedColumns.size > 1) orchestrationPattern += 30

    // Has parallel agents (good use of waves)
    const hasParallel = workflow.columns.some(col => {
      const colAgents = workflow.agents.filter(a => a.columnId === col.id)
      return colAgents.length > 1
    })
    if (hasParallel) orchestrationPattern += 15

    // No orphan agents (agents without connections when there are multiple)
    if (workflow.agents.length > 1) {
      const connectedAgentIds = new Set([
        ...workflow.connections.map(c => c.sourceAgentId),
        ...workflow.connections.map(c => c.targetAgentId),
      ])
      const orphans = workflow.agents.filter(a => !connectedAgentIds.has(a.id))
      if (orphans.length === 0) {
        orchestrationPattern += 15
      } else {
        for (const orphan of orphans) {
          suggestions.push(`"${orphan.name}" is disconnected — it won't receive or send data to other agents`)
        }
      }
    } else {
      orchestrationPattern += 15
    }

    // Bonus: well-configured control flow connections
    const controlFlowConns = workflow.connections.filter(c => getFlowType(c) !== 'always')
    if (controlFlowConns.length > 0) {
      const wellConfigured = controlFlowConns.filter(c => {
        const ft = getFlowType(c)
        if (ft === 'conditional') return !!c.condition && c.condition.trim().length > 0
        if (ft === 'loop') return !!c.loopCondition && c.loopCondition.trim().length > 0
        if (ft === 'approval-gate') return true // approval gates are always "configured"
        return false
      })
      if (wellConfigured.length === controlFlowConns.length) {
        orchestrationPattern += 15
      }
    }

    orchestrationPattern = Math.min(100, orchestrationPattern)

    // Native mode: check for validation checkpoints
    if (native) {
      const colsWithValidation = workflow.columns.filter(c => c.validationCriteria)
      if (colsWithValidation.length === 0 && workflow.columns.length > 1) {
        suggestions.push('No wave validation checkpoints — add criteria to verify agent outputs before proceeding')
      }
    }
  } else {
    suggestions.push('No waves defined — organize agents into execution phases')
  }

  // ── Context Isolation (0-15, native only, otherwise 100) ──
  let contextIsolation = 100
  if (native) {
    contextIsolation = 0

    // Check if agents have subagent types set
    const agentsWithType = workflow.agents.filter(a => a.subagentType && a.subagentType !== 'auto')
    if (agentsWithType.length > 0) {
      contextIsolation += Math.round((agentsWithType.length / workflow.agents.length) * 40)
    } else if (workflow.agents.length > 0) {
      suggestions.push('No subagent types set — specify Explore, Plan, Bash, or General Purpose for each agent')
    }

    // Check if agents have tool scoping
    const agentsWithTools = workflow.agents.filter(a => a.allowedTools && a.allowedTools.length > 0)
    if (agentsWithTools.length > 0) {
      // Check if any agent has restricted tools (not all 8)
      const agentsWithRestriction = agentsWithTools.filter(a => a.allowedTools!.length < 8)
      if (agentsWithRestriction.length > 0) {
        contextIsolation += 30
      } else {
        contextIsolation += 15
        suggestions.push('All agents have full tool access — consider restricting read-only agents to Read, Glob, Grep')
      }
    }

    // Check if agents have context notes
    const agentsWithContext = workflow.agents.filter(a => a.contextNotes)
    if (agentsWithContext.length > 0) {
      contextIsolation += 30
    }

    contextIsolation = Math.min(100, contextIsolation)
  }

  // ── Permission Granularity (0-10) ──
  let permissionGranularity = 0
  if (workflow.settings.includePermissions) {
    permissionGranularity += 30

    if (native && workflow.settings.permissions) {
      // Has granular permissions configured
      permissionGranularity += 70
    } else if (!native) {
      permissionGranularity += 70 // General mode gets full credit for the toggle
    } else {
      suggestions.push('Enable granular permissions in settings for more precise control')
    }
  } else {
    suggestions.push('Enable permissions section — agents need permission grants to work autonomously')
  }

  // ── Calculate Overall Score ──
  // Weights: completeness 30%, handoff 25%, orchestration 20%, isolation 15%, permissions 10%
  const overall = Math.round(
    agentCompleteness * 0.30 +
    handoffClarity * 0.25 +
    orchestrationPattern * 0.20 +
    contextIsolation * 0.15 +
    permissionGranularity * 0.10
  )

  return {
    overall,
    breakdown: {
      agentCompleteness,
      handoffClarity,
      orchestrationPattern,
      contextIsolation,
      permissionGranularity,
    },
    suggestions: suggestions.slice(0, 8), // Cap at 8 suggestions
  }
}
