import type { Workflow, AgentNode, Connection, Column, AgentRole, HandoffFormat, ConnectionFlowType } from '../types/workflow'
import { ROLE_META, SUBAGENT_TYPE_META, MODEL_META, FALLBACK_META, HANDOFF_FORMAT_META, FLOW_TYPE_META, getFlowType } from '../types/workflow'

export interface PromptSection {
  id: string
  type: 'preamble' | 'execution-order' | 'agent' | 'data-flow' | 'control-flow' | 'permissions' | 'deliverables' | 'suffix' | 'context-management' | 'error-handling'
  title: string
  content: string
  agentRole?: AgentRole
  agentId?: string
  skills?: string[]
}

export interface GeneratedPrompt {
  fullText: string
  sections: PromptSection[]
  wordCount: number
  agentCount: number
  waveCount: number
  completeness: number
  generatedAt: string
}

/** Sort agents by column order, then by vertical position within column */
function sortAgents(agents: AgentNode[], columns: Column[]): AgentNode[] {
  const colOrder = new Map(columns.map(c => [c.id, c.order]))
  return [...agents].sort((a, b) => {
    const orderA = colOrder.get(a.columnId) ?? 999
    const orderB = colOrder.get(b.columnId) ?? 999
    if (orderA !== orderB) return orderA - orderB
    return a.position.y - b.position.y
  })
}

/** Get agents in a specific column */
function agentsInColumn(agents: AgentNode[], columnId: string): AgentNode[] {
  return agents.filter(a => a.columnId === columnId)
}

/** Get incoming connections for an agent */
function incomingConnections(connections: Connection[], agentId: string): Connection[] {
  return connections.filter(c => c.targetAgentId === agentId)
}

/** Compute how complete agents are (0-1): name + description + output + instructions = 0.25 each */
function computeCompleteness(agents: AgentNode[]): number {
  if (agents.length === 0) return 0
  return agents.reduce((acc, agent) => {
    let score = 0
    if (agent.name && agent.name !== 'New Agent') score += 0.25
    if (agent.roleDescription) score += 0.25
    if (agent.outputDefinition) score += 0.25
    if (agent.instructions) score += 0.25
    return acc + score
  }, 0) / agents.length
}

/** Format a handoff format into human-readable instructions */
function formatHandoffInstructions(format: HandoffFormat): string {
  switch (format) {
    case 'summary':
      return 'Produce a concise summary with:\n  - Key Findings (bullet points)\n  - Recommendations (numbered list)\n  - File References (paths to relevant files)'
    case 'structured-json':
      return 'Produce output as a structured JSON object with clearly labeled fields'
    case 'file-reference':
      return 'Reference the files created or modified, with paths and brief descriptions of changes'
    case 'full-output':
      return 'Pass the complete output as-is to the next agent'
  }
}

/** Format tool names for display */
function formatToolName(tool: string): string {
  const map: Record<string, string> = {
    'read': 'Read',
    'write': 'Write',
    'edit': 'Edit',
    'bash': 'Bash',
    'glob': 'Glob',
    'grep': 'Grep',
    'web-search': 'WebSearch',
    'web-fetch': 'WebFetch',
  }
  return map[tool] || tool
}

/** Map skill names to natural-language usage guidance for general mode prompts */
function getSkillGuidance(skillName: string): string {
  const guidanceMap: Record<string, string> = {
    'pptx': 'Use the pptx skill to create the PowerPoint presentation. Invoke it with `/pptx` before starting the presentation work.',
    'docx': 'Use the docx skill to create or edit Word documents. Invoke it with `/docx` before starting document work.',
    'xlsx': 'Use the xlsx skill to create or work with Excel spreadsheets. Invoke it with `/xlsx` before starting spreadsheet work.',
    'remotion-best-practices': 'Use the remotion-best-practices skill for video creation guidance and Remotion framework patterns. Invoke it with `/remotion-best-practices` before starting video work.',
    'systematic-debugging': 'Use the systematic-debugging skill to apply a structured four-phase debugging methodology. Invoke it with `/systematic-debugging` when investigating issues.',
    'brainstorming': 'Use the brainstorming skill for collaborative ideation and exploring design options. Invoke it with `/brainstorming` at the start of the creative process.',
    'frontend-design': 'Use the frontend-design skill for building production-grade frontend interfaces. Invoke it with `/frontend-design` before starting UI work.',
    'imagegen': 'Use the imagegen skill to generate images using AI. Invoke it with `/imagegen` when visual assets are needed.',
    'algorithmic-art': 'Use the algorithmic-art skill for creating algorithmic art with p5.js. Invoke it with `/algorithmic-art` for generative visual work.',
    'writing-skills': 'Use the writing-skills skill for high-quality written content. Invoke it with `/writing-skills` before writing.',
    'prompt-engineering-patterns': 'Use the prompt-engineering-patterns skill for advanced prompt engineering techniques. Invoke it with `/prompt-engineering-patterns` when crafting prompts.',
    'postgresql-table-design': 'Use the postgresql-table-design skill for database schema design. Invoke it with `/postgresql-table-design` before designing tables.',
    'find-skills': 'Use the find-skills skill to discover and install additional agent skills.',
    'cambium-brand-skill': 'Use the cambium-brand-skill skill for Cambium Networks branded UI designs. Invoke it with `/cambium-brand-skill` before starting branded content.',
  }
  return guidanceMap[skillName] || `Use the ${skillName} skill by invoking it with \`/${skillName}\`.`
}

// ─────────────────────────────────────────────────────────────
// PREAMBLE GENERATORS
// ─────────────────────────────────────────────────────────────

function generateGeneralPreamble(workflow: Workflow): string {
  const lines: string[] = []
  if (workflow.settings.preamble) {
    lines.push(workflow.settings.preamble)
  } else {
    lines.push(`I need you to orchestrate a multi-agent workflow${workflow.description ? `: ${workflow.description}` : ''}.`)
    lines.push('')
    lines.push(`This is a ${workflow.agents.length}-agent pipeline organized into ${workflow.columns.length} wave${workflow.columns.length !== 1 ? 's' : ''}. Use the **Task tool** to launch each agent as a separate subagent.`)
    lines.push('')
    lines.push('**How to run this pipeline:**')
    lines.push('- Agents in the **same wave** should be launched **in parallel** -- make multiple Task tool calls in a single message.')
    lines.push('- **Wait** for all agents in a wave to finish before starting the next wave.')
    lines.push('- When launching each agent, include their full instructions and any relevant output from upstream agents in the Task prompt.')
    lines.push('- After all waves complete, compile the final deliverables and present them to me.')
  }
  return lines.join('\n')
}

function generateNativePreamble(workflow: Workflow): string {
  const lines: string[] = []
  if (workflow.settings.preamble) {
    lines.push(workflow.settings.preamble)
    lines.push('')
  }

  lines.push(`You are the orchestrator of a multi-agent workflow${workflow.description ? `: ${workflow.description}` : ''}. Your job is to:`)
  lines.push(`1. Launch agents in the specified wave order using the **Task tool**`)
  lines.push(`2. Pass outputs between agents as described in the data flow`)
  lines.push(`3. Verify each wave completes successfully before starting the next`)
  lines.push(`4. Report final deliverables when all waves finish`)
  lines.push('')
  lines.push(`The team consists of **${workflow.agents.length} agent${workflow.agents.length !== 1 ? 's' : ''}** organized into **${workflow.columns.length} wave${workflow.columns.length !== 1 ? 's' : ''}**.`)
  lines.push('')
  lines.push(`**Execution Rules:**`)
  lines.push(`- Agents in the **same wave** should be launched **IN PARALLEL** (multiple Task tool calls in a single message)`)
  lines.push(`- Agents in **subsequent waves** must wait for all previous wave agents to complete`)
  lines.push(`- For each agent, use: \`Task(subagent_type="...", prompt="...", description="...")\``)

  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────
// EXECUTION ORDER GENERATORS
// ─────────────────────────────────────────────────────────────

function generateExecutionOrder(workflow: Workflow): string {
  const native = workflow.settings.nativeMode
  const orderLines = ['## Execution Order', '']

  if (!native) {
    orderLines.push('Launch agents within each wave in parallel (multiple Task tool calls in one message). Wait for each wave to complete before starting the next.')
    orderLines.push('')
  }

  const sortedCols = [...workflow.columns].sort((a, b) => a.order - b.order)
  for (const col of sortedCols) {
    const colAgents = agentsInColumn(workflow.agents, col.id)
    if (colAgents.length === 0) continue

    // Check if any agents in this wave have conditional incoming connections
    const hasConditionalInputs = colAgents.some(agent =>
      workflow.connections.some(c =>
        c.targetAgentId === agent.id && getFlowType(c) === 'conditional'
      )
    )

    if (colAgents.length === 1) {
      const agent = colAgents[0]
      let line = `**${col.name}**: ${agent.name}`
      if (native && agent.subagentType && agent.subagentType !== 'auto') {
        line += ` _(${SUBAGENT_TYPE_META[agent.subagentType].label} agent)_`
      }
      // Annotate if this agent is conditionally reached
      const condIncoming = workflow.connections.filter(c =>
        c.targetAgentId === agent.id && getFlowType(c) === 'conditional'
      )
      if (condIncoming.length > 0) {
        const cond = condIncoming[0]
        const source = workflow.agents.find(a => a.id === cond.sourceAgentId)
        if (source && cond.condition) {
          line += ` — _${cond.isElseBranch ? 'otherwise' : `if: ${cond.condition}`}_`
        }
      }
      orderLines.push(line)
    } else {
      const waveLabel = hasConditionalInputs ? `**${col.name}** (conditional):` : `**${col.name}** (these agents run in parallel):`
      orderLines.push(waveLabel)
      for (const agent of colAgents) {
        let line = `- ${agent.name}`
        if (native && agent.subagentType && agent.subagentType !== 'auto') {
          line += ` _(${SUBAGENT_TYPE_META[agent.subagentType].label})_`
        }
        // Annotate conditional inputs
        const condIncoming = workflow.connections.filter(c =>
          c.targetAgentId === agent.id && getFlowType(c) === 'conditional'
        )
        if (condIncoming.length > 0) {
          const cond = condIncoming[0]
          if (cond.condition) {
            line += ` — _${cond.isElseBranch ? 'otherwise' : `if: ${cond.condition}`}_`
          }
        }
        orderLines.push(line)
      }
    }

    // Wave validation checkpoint (native mode)
    if (native && col.validationCriteria) {
      orderLines.push('')
      orderLines.push(`> **Checkpoint after ${col.name}:** ${col.validationCriteria}`)
    }

    orderLines.push('')
  }
  return orderLines.join('\n')
}

// ─────────────────────────────────────────────────────────────
// AGENT DEFINITION GENERATORS
// ─────────────────────────────────────────────────────────────

function generateAgentSection(agent: AgentNode, workflow: Workflow): string {
  const native = workflow.settings.nativeMode
  const incoming = incomingConnections(workflow.connections, agent.id)
  const roleMeta = ROLE_META[agent.role]
  const lines: string[] = []

  lines.push(`### ${agent.name} (${roleMeta.label})`)
  lines.push('')

  if (agent.roleDescription) {
    lines.push(agent.roleDescription)
    lines.push('')
  }

  // ── Native mode: subagent type ──
  if (native && agent.subagentType && agent.subagentType !== 'auto') {
    const typeMeta = SUBAGENT_TYPE_META[agent.subagentType]
    lines.push(`**Agent Type:** Use a \`${typeMeta.label}\` subagent — ${typeMeta.description}`)
    lines.push('')
  }

  // ── Native mode: model preference ──
  if (native && agent.preferredModel && agent.preferredModel !== 'auto') {
    const modelMeta = MODEL_META[agent.preferredModel]
    lines.push(`**Model:** Use \`${agent.preferredModel}\` — ${modelMeta.description}`)
    lines.push('')
  }

  // ── Native mode: tool permissions ──
  if (native && agent.allowedTools && agent.allowedTools.length > 0) {
    const allTools = ['read', 'write', 'edit', 'bash', 'glob', 'grep', 'web-search', 'web-fetch']
    const isFullAccess = allTools.every(t => agent.allowedTools!.includes(t as any))

    if (!isFullAccess) {
      const toolNames = agent.allowedTools.map(formatToolName).join(', ')
      lines.push(`**Allowed Tools:** ${toolNames} only.`)
      lines.push('')
    }
  }

  // ── Skills ──
  if (agent.skills.length > 0) {
    if (native) {
      lines.push('**Skills:** Before starting work, invoke these skills using the Skill tool:')
      for (const skill of agent.skills) {
        lines.push(`- \`${skill.name}\``)
      }
    } else {
      lines.push('**Skills:**')
      for (const skill of agent.skills) {
        lines.push(`- ${getSkillGuidance(skill.name)}`)
      }
    }
    lines.push('')
  }

  // ── Inputs ──
  if (incoming.length > 0) {
    // Check if any inputs have special flow types
    const hasControlFlow = incoming.some(c => getFlowType(c) !== 'always')
    const inputLabel = hasControlFlow ? '**Inputs (conditional):**' : '**Inputs:**'
    lines.push(inputLabel)
    for (const conn of incoming) {
      const source = workflow.agents.find(a => a.id === conn.sourceAgentId)
      if (source) {
        const desc = conn.dataDescription || source.outputDefinition || 'output'
        let inputLine = `- ${desc} from ${source.name}`
        const flow = getFlowType(conn)
        if (flow === 'conditional' && conn.condition) {
          inputLine += ` — **${conn.isElseBranch ? 'otherwise' : `only if`}**: ${conn.condition}`
        } else if (flow === 'approval-gate') {
          inputLine += ` — **pause and ask the user for approval** before proceeding`
        } else if (flow === 'loop') {
          const max = conn.maxIterations ?? 3
          inputLine += ` — **loop**: repeat until ${conn.loopCondition || 'condition met'} (max ${max} iterations)`
        }
        if (native && conn.handoffFormat) {
          inputLine += ` _(${HANDOFF_FORMAT_META[conn.handoffFormat].label} format)_`
        }
        lines.push(inputLine)
      }
    }
    lines.push('')
  }

  // ── Output ──
  if (agent.outputDefinition) {
    lines.push(`**Output:** ${agent.outputDefinition}`)

    // Native mode: add output format instructions based on outgoing connections
    if (native) {
      const outgoing = workflow.connections.filter(c => c.sourceAgentId === agent.id)
      const handoffFormats = outgoing
        .filter(c => c.handoffFormat)
        .map(c => c.handoffFormat!)
      const uniqueFormats = [...new Set(handoffFormats)]

      if (uniqueFormats.length === 1) {
        lines.push('')
        lines.push(`**Output Format:** ${formatHandoffInstructions(uniqueFormats[0])}`)
      } else if (uniqueFormats.length > 1) {
        lines.push('')
        lines.push(`**Output Format:** ${formatHandoffInstructions(uniqueFormats[0])}`)
      }
    }
    lines.push('')
  }

  // ── Instructions ──
  if (agent.instructions) {
    lines.push('**Instructions:**')
    lines.push(agent.instructions)
    lines.push('')
  }

  // ── Native mode: context notes ──
  if (native && agent.contextNotes) {
    lines.push(`**Context:** ${agent.contextNotes}`)
    lines.push('')
  }

  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────
// DATA FLOW GENERATOR
// ─────────────────────────────────────────────────────────────

function generateDataFlow(workflow: Workflow): string {
  const native = workflow.settings.nativeMode
  const flowLines = ['## Data Flow', '']

  for (const conn of workflow.connections) {
    const source = workflow.agents.find(a => a.id === conn.sourceAgentId)
    const target = workflow.agents.find(a => a.id === conn.targetAgentId)
    if (source && target) {
      const desc = conn.dataDescription || source.outputDefinition || 'output'
      let line = `- **${source.name}** --> **${target.name}**: ${desc}`
      // Annotate flow type
      const flow = getFlowType(conn)
      if (flow === 'conditional') {
        if (conn.isElseBranch) {
          line += ` _(else)_`
        } else if (conn.condition) {
          line += ` _(if: ${conn.condition})_`
        } else {
          line += ` _(conditional)_`
        }
      } else if (flow === 'approval-gate') {
        line += ` _(approval gate)_`
      } else if (flow === 'loop') {
        const max = conn.maxIterations ?? 3
        line += ` _(loop: ${conn.loopCondition || 'until condition met'}, max ${max})_`
      }
      if (native && conn.handoffFormat) {
        line += ` _(${HANDOFF_FORMAT_META[conn.handoffFormat].label})_`
      }
      flowLines.push(line)
    }
  }
  flowLines.push('')
  return flowLines.join('\n')
}

// ─────────────────────────────────────────────────────────────
// CONTROL FLOW RULES GENERATOR
// ─────────────────────────────────────────────────────────────

function generateControlFlowRules(workflow: Workflow): string | null {
  const controlFlowConns = workflow.connections.filter(c => getFlowType(c) !== 'always')
  if (controlFlowConns.length === 0) return null

  const lines = ['## Control Flow Rules', '']

  // ── Conditional Routing ──
  // Group conditional connections by source agent
  const conditionalConns = controlFlowConns.filter(c => getFlowType(c) === 'conditional')
  if (conditionalConns.length > 0) {
    const bySource = new Map<string, Connection[]>()
    for (const conn of conditionalConns) {
      const list = bySource.get(conn.sourceAgentId) || []
      list.push(conn)
      bySource.set(conn.sourceAgentId, list)
    }

    lines.push('### Conditional Routing')
    for (const [sourceId, conns] of bySource) {
      const source = workflow.agents.find(a => a.id === sourceId)
      if (!source) continue

      lines.push(`After **${source.name}** completes:`)
      for (const conn of conns) {
        const target = workflow.agents.find(a => a.id === conn.targetAgentId)
        if (!target) continue
        if (conn.isElseBranch) {
          lines.push(`- ELSE → route output to **${target.name}**`)
        } else {
          lines.push(`- IF ${conn.condition || '(condition not specified)'} → route output to **${target.name}**`)
        }
      }
      lines.push('Only execute ONE branch — do not run both.')
      lines.push('')
    }
  }

  // ── Approval Gates ──
  const approvalConns = controlFlowConns.filter(c => getFlowType(c) === 'approval-gate')
  if (approvalConns.length > 0) {
    lines.push('### Approval Gates')
    for (const conn of approvalConns) {
      const source = workflow.agents.find(a => a.id === conn.sourceAgentId)
      const target = workflow.agents.find(a => a.id === conn.targetAgentId)
      if (!source || !target) continue

      const prompt = conn.approvalPrompt || `Review the output from ${source.name} and approve to continue to ${target.name}.`
      lines.push(`After **${source.name}** completes, **STOP** and ask the user:`)
      lines.push(`"${prompt}"`)
      lines.push(`Only proceed to **${target.name}** after explicit user approval.`)
      lines.push('')
    }
  }

  // ── Loops ──
  const loopConns = controlFlowConns.filter(c => getFlowType(c) === 'loop')
  if (loopConns.length > 0) {
    lines.push('### Loops')
    for (const conn of loopConns) {
      const source = workflow.agents.find(a => a.id === conn.sourceAgentId)
      const target = workflow.agents.find(a => a.id === conn.targetAgentId)
      if (!source || !target) continue

      const max = conn.maxIterations ?? 3
      const exitCond = conn.loopCondition || 'the exit condition is met'
      lines.push(`**${source.name}** and **${target.name}** form a loop:`)
      lines.push(`1. Run **${target.name}**`)
      lines.push(`2. Run **${source.name}** on the output`)
      lines.push(`3. If ${exitCond}: exit the loop and proceed to the next wave`)
      lines.push(`4. If not: feed **${source.name}**'s output back to **${target.name}** and repeat`)
      lines.push(`5. Maximum **${max} iterations**. If still not resolved after ${max} attempts, proceed anyway and note the outstanding issues.`)
      lines.push('')
    }
  }

  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────
// PERMISSIONS GENERATOR
// ─────────────────────────────────────────────────────────────

function generatePermissions(workflow: Workflow): string {
  const native = workflow.settings.nativeMode

  if (native && workflow.settings.permissions) {
    const perms = workflow.settings.permissions
    const permLines = ['## Permissions', '']
    permLines.push('This workflow requires the following permissions (approve all upfront):')

    // Always include read access
    permLines.push('- File read access (all agents)')

    if (perms.allowFileCreation || perms.allowFileModification) {
      const writeAgents = workflow.agents
        .filter(a => a.allowedTools?.some(t => t === 'write' || t === 'edit'))
        .map(a => a.name)
      const agentNote = writeAgents.length > 0 ? ` (${writeAgents.join(', ')})` : ''
      if (perms.allowFileCreation && perms.allowFileModification) {
        permLines.push(`- File creation and modification${agentNote}`)
      } else if (perms.allowFileCreation) {
        permLines.push(`- File creation${agentNote}`)
      } else {
        permLines.push(`- File modification${agentNote}`)
      }
    }

    if (perms.allowBashExecution) {
      const bashAgents = workflow.agents
        .filter(a => a.allowedTools?.includes('bash'))
        .map(a => a.name)
      const agentNote = bashAgents.length > 0 ? ` (${bashAgents.join(', ')})` : ''
      permLines.push(`- Bash/command execution${agentNote}`)
    }

    if (perms.allowWebAccess) {
      permLines.push('- Web search and fetch access')
    }

    if (perms.allowGitOperations) {
      permLines.push('- Git operations (commit, branch, etc.)')
    }

    if (perms.customPermissions) {
      permLines.push(`- ${perms.customPermissions}`)
    }

    permLines.push('')
    return permLines.join('\n')
  }

  // General mode: explicit permissions section
  const permLines = ['## Permissions', '']
  permLines.push('Before starting any work, ask for **all** permissions you will need across the entire pipeline (file creation, file modification, bash execution, web access, etc.) so that the full workflow can run autonomously without interruption.')
  permLines.push('')
  permLines.push('I want to approve everything upfront and check the final result when the entire pipeline is done.')
  return permLines.join('\n')
}

// ─────────────────────────────────────────────────────────────
// CONTEXT MANAGEMENT (Native only)
// ─────────────────────────────────────────────────────────────

function generateContextManagement(workflow: Workflow): string {
  const lines = ['## Context Management', '']
  lines.push('When launching each agent via the Task tool, provide **ONLY** the information relevant to that agent\'s task in the prompt parameter. Do NOT pass the full conversation history.')
  lines.push('')
  lines.push('For each agent, include in the Task prompt:')
  lines.push('- The specific task description from their instructions below')
  lines.push('- Relevant output from upstream agents (as specified in Data Flow)')
  lines.push('- File paths and code references they need to work with')
  lines.push('')
  lines.push('Do NOT include:')
  lines.push('- Full conversation history')
  lines.push('- Output from agents in unrelated waves')
  lines.push('- Redundant context they don\'t need for their specific task')

  // Include per-agent context notes if any agent has them
  const agentsWithContextNotes = workflow.agents.filter(a => a.contextNotes)
  if (agentsWithContextNotes.length > 0) {
    lines.push('')
    lines.push('**Per-Agent Context Notes:**')
    for (const agent of agentsWithContextNotes) {
      lines.push(`- **${agent.name}:** ${agent.contextNotes}`)
    }
  }

  lines.push('')
  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────
// ERROR HANDLING (Native only)
// ─────────────────────────────────────────────────────────────

function generateErrorHandling(workflow: Workflow): string | null {
  const agentsWithFallback = workflow.agents.filter(a => a.fallbackStrategy)
  if (agentsWithFallback.length === 0) return null

  const lines = ['## Error Handling', '']
  lines.push('If any agent fails or produces insufficient output:')

  for (const agent of agentsWithFallback) {
    if (!agent.fallbackStrategy) continue
    const fallbackMeta = FALLBACK_META[agent.fallbackStrategy]
    let line = `- **${agent.name}:** ${fallbackMeta.description}`
    if (agent.fallbackInstructions) {
      line += `. ${agent.fallbackInstructions}`
    }
    lines.push(line)
  }

  lines.push('')
  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────
// MAIN GENERATOR
// ─────────────────────────────────────────────────────────────

/** Build the natural-language prompt from a workflow */
export function generatePrompt(workflow: Workflow): GeneratedPrompt {
  if (workflow.agents.length === 0) {
    return {
      fullText: '',
      sections: [],
      wordCount: 0,
      agentCount: 0,
      waveCount: 0,
      completeness: 0,
      generatedAt: new Date().toISOString()
    }
  }

  const native = workflow.settings.nativeMode
  const textSections: string[] = []
  const structuredSections: PromptSection[] = []

  // ── Preamble ──
  const preambleText = native
    ? generateNativePreamble(workflow)
    : generateGeneralPreamble(workflow)
  textSections.push(preambleText)
  structuredSections.push({
    id: 'preamble',
    type: 'preamble',
    title: 'Preamble',
    content: preambleText
  })

  // ── Execution Order ──
  if (workflow.columns.length > 0) {
    const orderText = generateExecutionOrder(workflow)
    textSections.push(orderText)
    structuredSections.push({
      id: 'execution-order',
      type: 'execution-order',
      title: 'Execution Order',
      content: orderText
    })
  }

  // ── Context Management (Native mode only) ──
  if (native) {
    const contextText = generateContextManagement(workflow)
    textSections.push(contextText)
    structuredSections.push({
      id: 'context-management',
      type: 'context-management',
      title: 'Context Management',
      content: contextText
    })
  }

  // ── Agent Definitions ──
  const sortedAgents = sortAgents(workflow.agents, workflow.columns)
  for (const agent of sortedAgents) {
    const roleMeta = ROLE_META[agent.role]
    const agentText = generateAgentSection(agent, workflow)
    textSections.push(agentText)
    structuredSections.push({
      id: `agent-${agent.id}`,
      type: 'agent',
      title: `${agent.name} (${roleMeta.label})`,
      content: agentText,
      agentRole: agent.role,
      agentId: agent.id,
      skills: agent.skills.map(s => s.name)
    })
  }

  // ── Data Flow ──
  if (workflow.connections.length > 0) {
    const flowText = generateDataFlow(workflow)
    textSections.push(flowText)
    structuredSections.push({
      id: 'data-flow',
      type: 'data-flow',
      title: 'Data Flow',
      content: flowText
    })
  }

  // ── Control Flow Rules ──
  const controlFlowText = generateControlFlowRules(workflow)
  if (controlFlowText) {
    textSections.push(controlFlowText)
    structuredSections.push({
      id: 'control-flow',
      type: 'control-flow',
      title: 'Control Flow Rules',
      content: controlFlowText
    })
  }

  // ── Error Handling (Native mode only) ──
  if (native) {
    const errorText = generateErrorHandling(workflow)
    if (errorText) {
      textSections.push(errorText)
      structuredSections.push({
        id: 'error-handling',
        type: 'error-handling',
        title: 'Error Handling',
        content: errorText
      })
    }
  }

  // ── Permissions ──
  if (workflow.settings.includePermissions) {
    const permText = generatePermissions(workflow)
    textSections.push(permText)
    structuredSections.push({
      id: 'permissions',
      type: 'permissions',
      title: 'Permissions',
      content: permText
    })
  }

  // ── Deliverables ──
  if (workflow.settings.includeDeliverables) {
    const agentsWithOutput = workflow.agents.filter(a => a.outputDefinition)
    if (agentsWithOutput.length > 0) {
      const deliverableLines = ['## Expected Deliverables', '']
      deliverableLines.push('At the end of this workflow, the following should be produced:')
      for (const a of agentsWithOutput) {
        deliverableLines.push(`- ${a.outputDefinition} (from ${a.name})`)
      }
      deliverableLines.push('')
      const delivText = deliverableLines.join('\n')
      textSections.push(delivText)
      structuredSections.push({
        id: 'deliverables',
        type: 'deliverables',
        title: 'Expected Deliverables',
        content: delivText
      })
    }
  }

  // ── Custom Suffix ──
  if (workflow.settings.customSuffix) {
    textSections.push(workflow.settings.customSuffix)
    structuredSections.push({
      id: 'suffix',
      type: 'suffix',
      title: 'Additional Instructions',
      content: workflow.settings.customSuffix
    })
  }

  // ── Join ──
  const fullText = textSections.filter(Boolean).join('\n---\n\n')

  return {
    fullText,
    sections: structuredSections,
    wordCount: fullText.split(/\s+/).filter(Boolean).length,
    agentCount: workflow.agents.length,
    waveCount: workflow.columns.length,
    completeness: computeCompleteness(workflow.agents),
    generatedAt: new Date().toISOString()
  }
}
