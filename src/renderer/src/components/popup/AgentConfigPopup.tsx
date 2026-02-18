import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../stores/ui-store'
import { useWorkflowStore } from '../../stores/workflow-store'
import { useCustomAgentsStore } from '../../stores/custom-agents-store'
import { useToastStore } from '../../stores/toast-store'
import { ALL_AGENT_ROLES, ROLE_META, ROLE_ACCENT, MAX_ABILITY_SLOTS, type AgentRole, type SubagentType, type ModelPreference, type FallbackStrategy, type AgentTool, SKILL_CATEGORY_META, categorizeSkill, getSkillAccentColor, getSkillGradient, SUBAGENT_TYPE_META, MODEL_META, FALLBACK_META, ALL_AGENT_TOOLS, ROLE_SUBAGENT_DEFAULTS, ROLE_MODEL_DEFAULTS, SUBAGENT_TOOL_DEFAULTS } from '../../types/workflow'
import { RoleIcon } from '../shared/RoleIcon'
import { SkillIcon } from '../nodes/SkillIcon'
import { SkillSelectorDropdown } from '../shared/SkillSelectorDropdown'
import { InfoTooltip } from '../shared/InfoTooltip'
import { AGENT_FIELD_INFO } from '../../lib/field-info-text'

const EASE = [0.25, 0.46, 0.45, 0.94] as const
const roles: AgentRole[] = ALL_AGENT_ROLES
const DRAFT_COMMIT_DELAY_MS = 180

export function AgentConfigPopup() {
  const agentId = useUIStore((s) => s.configPopupAgentId)
  const closeConfigPopup = useUIStore((s) => s.closeConfigPopup)
  const agent = useWorkflowStore((s) =>
    s.workflow.agents.find(a => a.id === agentId)
  )
  const nativeMode = useWorkflowStore((s) => s.workflow.settings.nativeMode)
  const updateAgent = useWorkflowStore((s) => s.updateAgent)
  const removeAgent = useWorkflowStore((s) => s.removeAgent)
  const removeSkillFromAgent = useWorkflowStore((s) => s.removeSkillFromAgent)
  const clearSelection = useUIStore((s) => s.clearSelection)

  const [roleDescriptionDraft, setRoleDescriptionDraft] = useState('')
  const [outputDefinitionDraft, setOutputDefinitionDraft] = useState('')
  const [instructionsDraft, setInstructionsDraft] = useState('')

  const timersRef = useRef<{
    roleDescription?: ReturnType<typeof setTimeout>
    outputDefinition?: ReturnType<typeof setTimeout>
    instructions?: ReturnType<typeof setTimeout>
  }>({})

  const draftsRef = useRef({
    roleDescription: '',
    outputDefinition: '',
    instructions: '',
  })
  const agentIdRef = useRef<string | null>(null)

  const commitField = useCallback((field: 'roleDescription' | 'outputDefinition' | 'instructions', value: string) => {
    if (!agentId) return
    const current = useWorkflowStore.getState().workflow.agents.find((a) => a.id === agentId)
    if (!current) return

    if (field === 'roleDescription') {
      if (current.roleDescription !== value) updateAgent(agentId, { roleDescription: value })
      return
    }
    if (field === 'outputDefinition') {
      if (current.outputDefinition !== value) updateAgent(agentId, { outputDefinition: value })
      return
    }
    if (current.instructions !== value) updateAgent(agentId, { instructions: value })
  }, [agentId, updateAgent])

  const scheduleCommit = useCallback((field: 'roleDescription' | 'outputDefinition' | 'instructions', value: string) => {
    const currentTimer = timersRef.current[field]
    if (currentTimer) clearTimeout(currentTimer)
    timersRef.current[field] = setTimeout(() => {
      commitField(field, value)
      timersRef.current[field] = undefined
    }, DRAFT_COMMIT_DELAY_MS)
  }, [commitField])

  const flushCommit = useCallback((field: 'roleDescription' | 'outputDefinition' | 'instructions', value: string) => {
    const currentTimer = timersRef.current[field]
    if (currentTimer) clearTimeout(currentTimer)
    timersRef.current[field] = undefined
    commitField(field, value)
  }, [commitField])

  const flushAllDrafts = useCallback(() => {
    flushCommit('roleDescription', draftsRef.current.roleDescription)
    flushCommit('outputDefinition', draftsRef.current.outputDefinition)
    flushCommit('instructions', draftsRef.current.instructions)
  }, [flushCommit])

  useEffect(() => {
    agentIdRef.current = agentId ?? null
  }, [agentId])

  useEffect(() => {
    if (!agent) return
    setRoleDescriptionDraft(agent.roleDescription)
    setOutputDefinitionDraft(agent.outputDefinition)
    setInstructionsDraft(agent.instructions)
    draftsRef.current = {
      roleDescription: agent.roleDescription,
      outputDefinition: agent.outputDefinition,
      instructions: agent.instructions,
    }
  }, [agent?.id])

  useEffect(() => {
    draftsRef.current.roleDescription = roleDescriptionDraft
  }, [roleDescriptionDraft])

  useEffect(() => {
    draftsRef.current.outputDefinition = outputDefinitionDraft
  }, [outputDefinitionDraft])

  useEffect(() => {
    draftsRef.current.instructions = instructionsDraft
  }, [instructionsDraft])

  useEffect(() => {
    return () => {
      const activeAgentId = agentIdRef.current
      if (!activeAgentId) return

      const { workflow, updateAgent: storeUpdateAgent } = useWorkflowStore.getState()
      const current = workflow.agents.find((a) => a.id === activeAgentId)
      if (!current) return

      const roleDescription = draftsRef.current.roleDescription
      const outputDefinition = draftsRef.current.outputDefinition
      const instructions = draftsRef.current.instructions

      if (timersRef.current.roleDescription) clearTimeout(timersRef.current.roleDescription)
      if (timersRef.current.outputDefinition) clearTimeout(timersRef.current.outputDefinition)
      if (timersRef.current.instructions) clearTimeout(timersRef.current.instructions)

      if (current.roleDescription !== roleDescription) {
        storeUpdateAgent(activeAgentId, { roleDescription })
      }
      if (current.outputDefinition !== outputDefinition) {
        storeUpdateAgent(activeAgentId, { outputDefinition })
      }
      if (current.instructions !== instructions) {
        storeUpdateAgent(activeAgentId, { instructions })
      }
    }
  }, [])

  const handleDelete = useCallback(() => {
    if (!agentId) return
    removeAgent(agentId)
    closeConfigPopup()
    clearSelection()
  }, [agentId, removeAgent, closeConfigPopup, clearSelection])

  const handleSaveAsTemplate = useCallback(async () => {
    if (!agentId) return
    flushAllDrafts()
    // Read latest agent state after flushing drafts
    const latestAgent = useWorkflowStore.getState().workflow.agents.find((a) => a.id === agentId)
    if (!latestAgent) return
    try {
      await useCustomAgentsStore.getState().saveTemplate({
        name: latestAgent.name,
        role: latestAgent.role,
        roleDescription: latestAgent.roleDescription,
        skills: [...latestAgent.skills],
        outputDefinition: latestAgent.outputDefinition,
        instructions: latestAgent.instructions,
      })
      useToastStore.getState().addToast({
        variant: 'success',
        message: `Saved "${latestAgent.name}" as template`,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      useToastStore.getState().addToast({
        variant: 'error',
        message: `Failed to save template: ${msg}`,
      })
    }
  }, [agentId, flushAllDrafts])

  const handleClosePopup = useCallback(() => {
    flushAllDrafts()
    closeConfigPopup()
  }, [flushAllDrafts, closeConfigPopup])

  const handleBackdropClick = useCallback(() => {
    handleClosePopup()
  }, [handleClosePopup])

  const isOpen = !!agentId && !!agent

  return (
    <AnimatePresence>
      {isOpen && agent && (
        <>
          {/* Backdrop */}
          <motion.div
            key="config-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[6px]"
            onClick={handleBackdropClick}
          />

          {/* Panel */}
          <motion.div
            key="config-panel"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 28,
              mass: 0.8
            }}
            className="fixed z-50 top-1/2 left-[calc(50%-218px)] -translate-x-1/2 -translate-y-1/2
              w-[480px] max-h-[80vh] rounded-2xl
              bg-surface-elevated/95 backdrop-blur-xl
              border border-border-subtle shadow-elevated
              overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="relative px-6 pt-5 pb-4 shrink-0 border-b border-border-subtle">
              {/* Role accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                style={{
                  background: `linear-gradient(90deg, ${ROLE_ACCENT[agent.role]}, ${ROLE_ACCENT[agent.role]}40)`
                }}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Role icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${ROLE_ACCENT[agent.role]}15`,
                      border: `1px solid ${ROLE_ACCENT[agent.role]}25`,
                      color: ROLE_ACCENT[agent.role]
                    }}
                  >
                    <RoleIcon role={agent.role} size={20} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-content-primary tracking-tight">
                      {agent.name}
                    </h2>
                    <span
                      className="text-[11px] font-semibold"
                      style={{ color: ROLE_ACCENT[agent.role] }}
                    >
                      {ROLE_META[agent.role].label}
                    </span>
                  </div>
                </div>

                {/* Close button */}
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClosePopup}
                  className="w-8 h-8 rounded-lg flex items-center justify-center
                    text-content-tertiary hover:text-content-primary
                    hover:bg-surface-tertiary transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="4" y1="4" x2="12" y2="12" />
                    <line x1="12" y1="4" x2="4" y2="12" />
                  </svg>
                </motion.button>
              </div>
            </div>

            {/* ── Form Body ── */}
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-5">
              {/* Name */}
              <FormField label="Name" index={0} infoTip={AGENT_FIELD_INFO.name}>
                <input
                  value={agent.name}
                  onChange={(e) => updateAgent(agent.id, { name: e.target.value })}
                  className="w-full px-3 py-2 rounded-button bg-surface-tertiary border border-border-subtle text-[13px] text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 focus:shadow-[0_0_0_3px_var(--color-accent-glow)] transition-all"
                  placeholder="Agent name..."
                />
              </FormField>

              {/* Role */}
              <FormField label="Role" index={1} infoTip={AGENT_FIELD_INFO.role}>
                <div className="grid grid-cols-5 gap-1.5">
                  {roles.map((r) => {
                    const isActive = agent.role === r
                    const accent = ROLE_ACCENT[r]
                    return (
                      <motion.button
                        key={r}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => updateAgent(agent.id, { role: r })}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-[7px] text-[11px] font-medium border transition-all duration-150 ${
                          isActive
                            ? 'border-accent/30 shadow-[0_0_0_1px_var(--color-accent-glow)]'
                            : 'border-border-subtle hover:border-border-default bg-surface-tertiary/50'
                        }`}
                        style={isActive ? {
                          background: `${accent}12`,
                          color: accent,
                          borderColor: `${accent}40`,
                        } : undefined}
                      >
                        <div className="w-4 h-4 flex items-center justify-center" style={{ color: isActive ? accent : 'var(--color-content-tertiary)' }}>
                          <RoleIcon role={r} size={12} />
                        </div>
                        <span className={isActive ? '' : 'text-content-secondary'}>
                          {ROLE_META[r].abbr}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </FormField>

              {/* Description */}
              <FormField label="Description" index={2} infoTip={AGENT_FIELD_INFO.description}>
                <textarea
                  value={roleDescriptionDraft}
                  onChange={(e) => {
                    const next = e.target.value
                    setRoleDescriptionDraft(next)
                    scheduleCommit('roleDescription', next)
                  }}
                  onBlur={(e) => flushCommit('roleDescription', e.currentTarget.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-button bg-surface-tertiary border border-border-subtle text-[12px] text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/35 focus:shadow-[0_0_0_4px_var(--color-accent-glow)] transition-colors duration-150 resize-none leading-relaxed"
                  placeholder="What does this agent do?"
                />
              </FormField>

              {/* Output */}
              <FormField label="Output" index={3} infoTip={AGENT_FIELD_INFO.output}>
                <input
                  value={outputDefinitionDraft}
                  onChange={(e) => {
                    const next = e.target.value
                    setOutputDefinitionDraft(next)
                    scheduleCommit('outputDefinition', next)
                  }}
                  onBlur={(e) => flushCommit('outputDefinition', e.currentTarget.value)}
                  className="w-full px-3 py-2 rounded-button bg-surface-tertiary border border-border-subtle text-[12px] text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/35 focus:shadow-[0_0_0_4px_var(--color-accent-glow)] transition-colors duration-150"
                  placeholder="What does this agent produce?"
                />
              </FormField>

              {/* Instructions */}
              <FormField label="Instructions" index={4} infoTip={AGENT_FIELD_INFO.instructions}>
                <textarea
                  value={instructionsDraft}
                  onChange={(e) => {
                    const next = e.target.value
                    setInstructionsDraft(next)
                    scheduleCommit('instructions', next)
                  }}
                  onBlur={(e) => flushCommit('instructions', e.currentTarget.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-button bg-surface-tertiary border border-border-subtle text-[12px] text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/35 focus:shadow-[0_0_0_4px_var(--color-accent-glow)] transition-colors duration-150 resize-none leading-relaxed font-mono"
                  placeholder="Detailed instructions for this agent..."
                />
              </FormField>

              {/* ── Native Mode Fields ── */}
              {nativeMode && (
                <>
                  {/* Divider */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative py-1"
                  >
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border-subtle" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-2 bg-surface-elevated text-[9px] font-semibold uppercase tracking-widest text-indigo-400/70">
                        Claude Code Native
                      </span>
                    </div>
                  </motion.div>

                  {/* Subagent Type */}
                  <FormField label="Agent Type" index={5} infoTip={AGENT_FIELD_INFO.agentType}>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(['auto', 'explore', 'plan', 'bash', 'general-purpose'] as SubagentType[]).map((type) => {
                        const meta = SUBAGENT_TYPE_META[type]
                        const isActive = (agent.subagentType || 'auto') === type
                        return (
                          <motion.button
                            key={type}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                              updateAgent(agent.id, {
                                subagentType: type,
                                // Auto-set tools when changing subagent type
                                allowedTools: SUBAGENT_TOOL_DEFAULTS[type],
                              })
                            }}
                            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-[7px] text-[10px] font-medium border transition-all duration-150 ${
                              isActive
                                ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 shadow-[0_0_0_1px_rgba(99,102,241,0.15)]'
                                : 'border-border-subtle hover:border-border-default bg-surface-tertiary/50 text-content-secondary'
                            }`}
                            title={meta.description}
                          >
                            <span className="text-[11px] font-semibold">{meta.label}</span>
                          </motion.button>
                        )
                      })}
                    </div>
                    <p className="text-[10px] text-content-tertiary mt-1">
                      {SUBAGENT_TYPE_META[agent.subagentType || 'auto'].description}
                    </p>
                  </FormField>

                  {/* Model Selection */}
                  <FormField label="Model" index={6} infoTip={AGENT_FIELD_INFO.model}>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['auto', 'haiku', 'sonnet', 'opus'] as ModelPreference[]).map((model) => {
                        const meta = MODEL_META[model]
                        const isActive = (agent.preferredModel || 'auto') === model
                        return (
                          <motion.button
                            key={model}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => updateAgent(agent.id, { preferredModel: model })}
                            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-[7px] text-[10px] font-medium border transition-all duration-150 ${
                              isActive
                                ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 shadow-[0_0_0_1px_rgba(99,102,241,0.15)]'
                                : 'border-border-subtle hover:border-border-default bg-surface-tertiary/50 text-content-secondary'
                            }`}
                            title={meta.description}
                          >
                            <span className="text-[11px] font-semibold">{meta.label}</span>
                          </motion.button>
                        )
                      })}
                    </div>
                    <p className="text-[10px] text-content-tertiary mt-1">
                      {MODEL_META[agent.preferredModel || 'auto'].description}
                    </p>
                  </FormField>

                  {/* Tool Permissions */}
                  <FormField label="Allowed Tools" index={7} infoTip={AGENT_FIELD_INFO.allowedTools}>
                    <div className="grid grid-cols-4 gap-1.5">
                      {ALL_AGENT_TOOLS.map((tool) => {
                        const isActive = agent.allowedTools?.includes(tool) ?? true
                        const toolLabel: Record<AgentTool, string> = {
                          'read': 'Read',
                          'write': 'Write',
                          'edit': 'Edit',
                          'bash': 'Bash',
                          'glob': 'Glob',
                          'grep': 'Grep',
                          'web-search': 'Search',
                          'web-fetch': 'Fetch',
                        }
                        return (
                          <motion.button
                            key={tool}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                              const current = agent.allowedTools ?? ALL_AGENT_TOOLS
                              const next = isActive
                                ? current.filter(t => t !== tool)
                                : [...current, tool]
                              updateAgent(agent.id, { allowedTools: next })
                            }}
                            className={`px-2 py-1 rounded-[6px] text-[10px] font-medium border transition-all duration-150 ${
                              isActive
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                : 'border-border-subtle bg-surface-tertiary/30 text-content-tertiary line-through opacity-50'
                            }`}
                          >
                            {toolLabel[tool]}
                          </motion.button>
                        )
                      })}
                    </div>
                  </FormField>

                  {/* Fallback Strategy */}
                  <FormField label="On Failure" index={8} infoTip={AGENT_FIELD_INFO.onFailure}>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['retry-once', 'skip-and-continue', 'ask-user', 'use-default'] as FallbackStrategy[]).map((strategy) => {
                        const meta = FALLBACK_META[strategy]
                        const isActive = agent.fallbackStrategy === strategy
                        return (
                          <motion.button
                            key={strategy}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => updateAgent(agent.id, {
                              fallbackStrategy: isActive ? undefined : strategy
                            })}
                            className={`flex flex-col items-start px-2.5 py-1.5 rounded-[7px] text-left border transition-all duration-150 ${
                              isActive
                                ? 'border-amber-500/30 bg-amber-500/8 text-amber-400'
                                : 'border-border-subtle hover:border-border-default bg-surface-tertiary/50 text-content-secondary'
                            }`}
                          >
                            <span className="text-[10px] font-semibold">{meta.label}</span>
                            <span className="text-[9px] text-content-tertiary leading-tight">{meta.description}</span>
                          </motion.button>
                        )
                      })}
                    </div>
                    {agent.fallbackStrategy && (
                      <textarea
                        value={agent.fallbackInstructions || ''}
                        onChange={(e) => updateAgent(agent.id, { fallbackInstructions: e.target.value })}
                        rows={2}
                        className="w-full mt-2 px-3 py-2 rounded-button bg-surface-tertiary border border-border-subtle text-[11px] text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all resize-none leading-relaxed"
                        placeholder="Additional fallback instructions..."
                      />
                    )}
                  </FormField>

                  {/* Context Notes */}
                  <FormField label="Context Notes" index={9} infoTip={AGENT_FIELD_INFO.contextNotes}>
                    <textarea
                      value={agent.contextNotes || ''}
                      onChange={(e) => updateAgent(agent.id, { contextNotes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 rounded-button bg-surface-tertiary border border-border-subtle text-[11px] text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all resize-none leading-relaxed"
                      placeholder="What specific context should be passed to this agent?"
                    />
                  </FormField>
                </>
              )}

              {/* Assigned Skills */}
              <FormField label="Equipped Skills" index={nativeMode ? 10 : 5} infoTip={AGENT_FIELD_INFO.equippedSkills}>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence mode="popLayout">
                    {agent.skills.map((skill) => {
                      const category = categorizeSkill(skill.name)
                      const skillAccent = getSkillAccentColor(skill.name)
                      const [gFrom, gTo] = getSkillGradient(skill.name)
                      return (
                        <motion.span
                          key={skill.id}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                            text-[12px] font-medium tracking-normal border transition-colors"
                          style={{
                            background: `linear-gradient(135deg, ${gFrom}14 0%, ${gTo}10 100%)`,
                            color: skillAccent,
                            borderColor: `${skillAccent}28`,
                          }}
                        >
                          <SkillIcon skillName={skill.name} category={category} size={12} />
                          {skill.name}
                          <motion.button
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.8 }}
                            onClick={() => removeSkillFromAgent(agent.id, skill.id)}
                            className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                          >
                            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <line x1="4" y1="4" x2="12" y2="12" />
                              <line x1="12" y1="4" x2="4" y2="12" />
                            </svg>
                          </motion.button>
                        </motion.span>
                      )
                    })}
                  </AnimatePresence>
                  {agent.skills.length === 0 && (
                    <span className="text-[10.5px] text-content-tertiary italic py-1">
                      Add skills below or drag from the skills strip
                    </span>
                  )}
                </div>
                <SkillSelectorDropdown
                  agentId={agent.id}
                  equippedSkillIds={agent.skills.map((s) => s.id)}
                  disabled={agent.skills.length >= MAX_ABILITY_SLOTS}
                />
              </FormField>
            </div>

            {/* ── Footer ── */}
            <div className="px-6 py-3 border-t border-border-subtle shrink-0 flex items-center justify-between">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-[11px] font-medium
                  text-red-400/70 hover:text-red-400 hover:bg-red-500/8 border border-transparent hover:border-red-500/15
                  transition-all duration-150"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete Agent
              </motion.button>

              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveAsTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-[11px] font-medium
                    text-accent/80 hover:text-accent hover:bg-accent/8 border border-transparent hover:border-accent/15
                    transition-all duration-150"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save as Template
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClosePopup}
                  className="px-4 py-1.5 rounded-button text-[11px] font-medium
                    bg-accent text-white hover:bg-accent-hover transition-colors"
                >
                  Done
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function FormField({ label, index, infoTip, children }: { label: string; index: number; infoTip?: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25, ease: EASE }}
      className="space-y-1.5"
    >
      <label className="flex items-center gap-1.5 text-[11px] font-medium text-content-tertiary uppercase tracking-wider">
        {label}
        {infoTip && <InfoTooltip content={infoTip} />}
      </label>
      {children}
    </motion.div>
  )
}
