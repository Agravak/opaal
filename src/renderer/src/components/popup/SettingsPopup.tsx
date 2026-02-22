import { useCallback, useMemo, useRef, useState } from 'react'
import { motion, Reorder } from 'framer-motion'
import { useUIStore } from '../../stores/ui-store'
import { useWorkflowStore } from '../../stores/workflow-store'
import { useCustomAgentsStore, getUnifiedAllAgents } from '../../stores/custom-agents-store'
import { useToastStore } from '../../stores/toast-store'
import { ALL_AGENT_ROLES, ROLE_META, ROLE_ACCENT, ROLE_TAGLINES, categorizeSkill, getSkillAccentColor } from '../../types/workflow'
import type { AgentRole, WorkflowPermissions } from '../../types/workflow'
import type { CustomAgentTemplate } from '../../types/custom-agent'
import { RoleIcon } from '../shared/RoleIcon'
import { SkillIcon } from '../nodes/SkillIcon'
import { DestructiveConfirmModal } from '../shared/DestructiveConfirmModal'

const EASE = [0.25, 0.46, 0.45, 0.94] as const
const DISPLAY_ROLES = ALL_AGENT_ROLES.filter((r) => r !== 'custom')

type SettingsTab = 'workflow' | 'agents' | 'claude'

export function SettingsPopup() {
  const settingsOpen = useUIStore((s) => s.settingsOpen)
  const toggleSettings = useUIStore((s) => s.toggleSettings)
  const [activeTab, setActiveTab] = useState<SettingsTab>('workflow')

  const workflow = useWorkflowStore((s) => s.workflow)
  const updateSettings = useWorkflowStore((s) => s.updateSettings)
  const setWorkflowName = useWorkflowStore((s) => s.setWorkflowName)
  const setWorkflowDescription = useWorkflowStore((s) => s.setWorkflowDescription)

  const commandBarExpanded = useUIStore((s) => s.commandBarExpanded)
  const toggleCommandBarExpanded = useUIStore((s) => s.toggleCommandBarExpanded)

  const claudeIntegrationEnabled = useUIStore((s) => s.claudeIntegrationEnabled)
  const setClaudeIntegrationEnabled = useUIStore((s) => s.setClaudeIntegrationEnabled)
  const claudeApiKey = useUIStore((s) => s.claudeApiKey)
  const setClaudeApiKey = useUIStore((s) => s.setClaudeApiKey)

  return (
    <>
      {/* Backdrop — always in DOM, controlled by animate + pointer-events */}
      <motion.div
        initial={false}
        animate={{ opacity: settingsOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        style={{ pointerEvents: settingsOpen ? 'auto' : 'none' }}
        className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[6px]"
        onClick={toggleSettings}
      />

      {/* Panel — always in DOM, controlled by animate + pointer-events */}
      <motion.div
        initial={false}
        animate={settingsOpen
          ? { opacity: 1, scale: 1, y: 0 }
          : { opacity: 0, scale: 0.98, y: 6 }
        }
        transition={settingsOpen
          ? { type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }
          : { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }
        }
        style={{ pointerEvents: settingsOpen ? 'auto' : 'none' }}
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-[540px] max-h-[85vh] rounded-2xl
          bg-surface-elevated border border-border-subtle shadow-elevated
          overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
              {/* ── Header ── */}
              <div className="relative px-6 pt-5 pb-4 shrink-0">
                {/* Accent bar */}
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-accent to-accent/40" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/8 border border-accent/12 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-accent">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold text-content-primary tracking-tight">
                        Settings
                      </h2>
                      <span className="text-[11px] text-content-tertiary">
                        Workflow & agent configuration
                      </span>
                    </div>
                  </div>

                  {/* Close button */}
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleSettings}
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

              {/* ── Tab Bar ── */}
              <div className="flex gap-1 px-6 pb-2 border-b border-border-subtle shrink-0">
                <TabButton
                  active={activeTab === 'workflow'}
                  onClick={() => setActiveTab('workflow')}
                  label="Workflow"
                  icon={
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  }
                />
                <TabButton
                  active={activeTab === 'agents'}
                  onClick={() => setActiveTab('agents')}
                  label="Agents"
                  icon={
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="4" y1="21" x2="4" y2="14" />
                      <line x1="4" y1="10" x2="4" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12" y2="3" />
                      <line x1="20" y1="21" x2="20" y2="16" />
                      <line x1="20" y1="12" x2="20" y2="3" />
                      <line x1="1" y1="14" x2="7" y2="14" />
                      <line x1="9" y1="8" x2="15" y2="8" />
                      <line x1="17" y1="16" x2="23" y2="16" />
                    </svg>
                  }
                />
                <TabButton
                  active={activeTab === 'claude'}
                  onClick={() => setActiveTab('claude')}
                  label="Claude"
                  icon={
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 17 10 11 4 5" />
                      <line x1="12" y1="19" x2="20" y2="19" />
                    </svg>
                  }
                />
              </div>

              {/* ── Tab Content ── */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {activeTab === 'workflow' ? (
                  <div className="px-6 py-5 space-y-5">
                    <WorkflowTabContent
                      workflow={workflow}
                      updateSettings={updateSettings}
                      setWorkflowName={setWorkflowName}
                      setWorkflowDescription={setWorkflowDescription}
                      commandBarExpanded={commandBarExpanded}
                      toggleCommandBarExpanded={toggleCommandBarExpanded}
                    />
                  </div>
                ) : activeTab === 'agents' ? (
                  <div className="py-3">
                    <AgentsTabContent />
                  </div>
                ) : (
                  <div className="px-6 py-5 space-y-5">
                    <ClaudeTabContent
                      enabled={claudeIntegrationEnabled}
                      setEnabled={setClaudeIntegrationEnabled}
                      apiKey={claudeApiKey}
                      setApiKey={setClaudeApiKey}
                    />
                  </div>
                )}
              </div>

              {/* ── Footer ── */}
              <div className="px-6 py-3 border-t border-border-subtle shrink-0 flex items-center justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={toggleSettings}
                  className="px-4 py-1.5 rounded-button text-[11px] font-medium
                    bg-accent text-white hover:bg-accent-hover transition-colors"
                >
                  Done
                </motion.button>
              </div>
            </motion.div>
    </>
  )
}

/* ══════════════════════════════════════════════════════
   TAB BUTTON
   ══════════════════════════════════════════════════════ */

function TabButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 ${
        active
          ? 'text-accent bg-accent/8'
          : 'text-content-tertiary hover:text-content-secondary hover:bg-surface-tertiary/50'
      }`}
    >
      <span className={active ? 'text-accent' : 'text-content-tertiary'}>{icon}</span>
      {label}
      {active && (
        <motion.div
          layoutId="settings-tab-indicator"
          className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-accent"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
    </button>
  )
}

/* ══════════════════════════════════════════════════════
   WORKFLOW TAB
   ══════════════════════════════════════════════════════ */

function WorkflowTabContent({
  workflow,
  updateSettings,
  setWorkflowName,
  setWorkflowDescription,
  commandBarExpanded,
  toggleCommandBarExpanded,
}: {
  workflow: ReturnType<typeof useWorkflowStore.getState>['workflow']
  updateSettings: ReturnType<typeof useWorkflowStore.getState>['updateSettings']
  setWorkflowName: ReturnType<typeof useWorkflowStore.getState>['setWorkflowName']
  setWorkflowDescription: ReturnType<typeof useWorkflowStore.getState>['setWorkflowDescription']
  commandBarExpanded: boolean
  toggleCommandBarExpanded: () => void
}) {
  return (
    <>
      <SettingsField label="Workflow Name" index={0}>
        <input
          value={workflow.name}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="w-full px-3 py-2 rounded-button bg-surface-tertiary border border-border-subtle text-[13px] text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 focus:shadow-[0_0_0_3px_var(--color-accent-glow)] transition-all"
          placeholder="My Workflow..."
        />
      </SettingsField>

      <SettingsField label="Description" index={1}>
        <textarea
          value={workflow.description}
          onChange={(e) => setWorkflowDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-button bg-surface-tertiary border border-border-subtle text-[12px] text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 focus:shadow-[0_0_0_3px_var(--color-accent-glow)] transition-all resize-none leading-relaxed"
          placeholder="What does this workflow accomplish?"
        />
      </SettingsField>

      <SettingsField label="Prompt Mode" index={2}>
        <div className="space-y-3">
          <ToggleRow
            label="Claude Code Native Mode"
            description="Generate prompts optimized for Claude Code's agent architecture with subagent types, model routing, tool scoping, and structured handoffs"
            checked={workflow.settings.nativeMode}
            onChange={(v) => updateSettings({ nativeMode: v })}
            accent
          />
          {workflow.settings.nativeMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="ml-11 text-[10.5px] text-content-tertiary leading-relaxed space-y-1"
            >
              <p>When enabled, the generated prompt will include:</p>
              <ul className="list-disc ml-4 space-y-0.5">
                <li>Orchestrator instructions with Task tool syntax</li>
                <li>Subagent type per agent (Explore, Plan, Bash, General)</li>
                <li>Model hints (Haiku, Sonnet, Opus)</li>
                <li>Tool permission scoping per agent</li>
                <li>Context isolation guidance</li>
                <li>Wave validation checkpoints</li>
                <li>Error handling & fallback strategies</li>
              </ul>
            </motion.div>
          )}
        </div>
      </SettingsField>

      <SettingsField label="Custom Preamble" index={3}>
        <textarea
          value={workflow.settings.preamble}
          onChange={(e) => updateSettings({ preamble: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 rounded-button bg-surface-tertiary border border-border-subtle text-[12px] text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 focus:shadow-[0_0_0_3px_var(--color-accent-glow)] transition-all resize-none leading-relaxed"
          placeholder="Override the auto-generated preamble..."
        />
      </SettingsField>

      <SettingsField label="Options" index={4}>
        <div className="space-y-3">
          <ToggleRow
            label="Include permissions request"
            description="Ask for all permissions upfront so the team works autonomously"
            checked={workflow.settings.includePermissions}
            onChange={(v) => updateSettings({ includePermissions: v })}
          />
          <ToggleRow
            label="Include deliverables section"
            description="List all expected outputs at the end of the prompt"
            checked={workflow.settings.includeDeliverables}
            onChange={(v) => updateSettings({ includeDeliverables: v })}
          />
        </div>
      </SettingsField>

      {workflow.settings.nativeMode && workflow.settings.includePermissions && (
        <SettingsField label="Permission Details" index={5}>
          <div className="space-y-2.5">
            <p className="text-[10.5px] text-content-tertiary leading-relaxed">
              Specify exactly what the agent team is allowed to do.
            </p>
            <ToggleRow
              label="File creation"
              description="Allow agents to create new files"
              checked={workflow.settings.permissions?.allowFileCreation ?? true}
              onChange={(v) => updateSettings({ permissions: { ...getDefaultPermissions(workflow), allowFileCreation: v } })}
            />
            <ToggleRow
              label="File modification"
              description="Allow agents to edit existing files"
              checked={workflow.settings.permissions?.allowFileModification ?? true}
              onChange={(v) => updateSettings({ permissions: { ...getDefaultPermissions(workflow), allowFileModification: v } })}
            />
            <ToggleRow
              label="Bash execution"
              description="Allow agents to run shell commands"
              checked={workflow.settings.permissions?.allowBashExecution ?? true}
              onChange={(v) => updateSettings({ permissions: { ...getDefaultPermissions(workflow), allowBashExecution: v } })}
            />
            <ToggleRow
              label="Web access"
              description="Allow agents to search the web and fetch URLs"
              checked={workflow.settings.permissions?.allowWebAccess ?? false}
              onChange={(v) => updateSettings({ permissions: { ...getDefaultPermissions(workflow), allowWebAccess: v } })}
            />
            <ToggleRow
              label="Git operations"
              description="Allow agents to commit, branch, and push"
              checked={workflow.settings.permissions?.allowGitOperations ?? false}
              onChange={(v) => updateSettings({ permissions: { ...getDefaultPermissions(workflow), allowGitOperations: v } })}
            />
            <textarea
              value={workflow.settings.permissions?.customPermissions || ''}
              onChange={(e) => updateSettings({ permissions: { ...getDefaultPermissions(workflow), customPermissions: e.target.value } })}
              rows={2}
              className="w-full px-3 py-2 rounded-button bg-surface-tertiary border border-border-subtle text-[11px] text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all resize-none leading-relaxed"
              placeholder="Custom permissions (e.g., 'Access to Docker containers')"
            />
          </div>
        </SettingsField>
      )}

      <SettingsField label="Custom Suffix" index={6}>
        <textarea
          value={workflow.settings.customSuffix || ''}
          onChange={(e) => updateSettings({ customSuffix: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 rounded-button bg-surface-tertiary border border-border-subtle text-[12px] text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 focus:shadow-[0_0_0_3px_var(--color-accent-glow)] transition-all resize-none leading-relaxed"
          placeholder="Additional instructions to append..."
        />
      </SettingsField>

      {/* About */}
      <SettingsField label="About" index={7}>
        <div className="space-y-2">
          <p className="text-[11px] text-content-secondary leading-relaxed">
            Opaal is an independent, open-source project. It is not affiliated with, endorsed by, or sponsored by Anthropic, PBC.
          </p>
          <p className="text-[10px] text-content-tertiary leading-relaxed">
            &quot;Claude&quot; and &quot;Claude Code&quot; are trademarks of Anthropic, PBC. Opaal generates text prompts locally and does not access any external APIs or services.
          </p>
          <p className="text-[10px] text-content-tertiary">
            Licensed under MIT &middot; v1.0.0
          </p>
        </div>
      </SettingsField>

      {/* Command Bar */}
      <SettingsField label="Command Bar" index={8}>
        <ToggleRow
          label="Expanded view"
          description="Show larger agent tabs with labels instead of compact icons"
          checked={commandBarExpanded}
          onChange={() => toggleCommandBarExpanded()}
        />
      </SettingsField>

      {/* Keyboard Shortcuts */}
      <SettingsField label="Keyboard Shortcuts" index={9}>
        <div className="space-y-1.5 text-[11px] text-content-secondary">
          <p className="text-[10px] text-content-tertiary/80 pb-1">
            While typing in text fields, only <span className="font-semibold text-content-secondary">Ctrl/Cmd+S</span> stays global.
          </p>
          <ShortcutRow keys="Ctrl+S" label="Save workflow (global)" />
          <ShortcutRow keys="Ctrl+O" label="Open workflow" />
          <ShortcutRow keys="Ctrl+E" label="Export prompt" />
          <ShortcutRow keys="Ctrl+Z" label="Undo" />
          <ShortcutRow keys="Ctrl+Shift+Z" label="Redo" />
          <ShortcutRow keys="Ctrl+C" label="Copy selected agents" />
          <ShortcutRow keys="Ctrl+V" label="Paste agents" />
          <ShortcutRow keys="Ctrl+D" label="Duplicate selected" />
          <ShortcutRow keys="Ctrl+A" label="Select all agents" />
          <ShortcutRow keys="Ctrl+1-9" label="Save control group" />
          <ShortcutRow keys="1-9" label="Recall control group" />
          <ShortcutRow keys="Shift+Click" label="Multi-select" />
          <ShortcutRow keys="V" label="Toggle Select/Pan mode" />
          <ShortcutRow keys="Space (hold)" label="Pan canvas" />
          <ShortcutRow keys="Delete" label="Remove selected agents/connectors" />
          <ShortcutRow keys="Escape" label="Close popup / Deselect" />
        </div>
      </SettingsField>
    </>
  )
}

/* ══════════════════════════════════════════════════════
   AGENTS TAB — Single Unified Reorder.Group
   ══════════════════════════════════════════════════════ */

function AgentsTabContent() {
  const templates = useCustomAgentsStore((s) => s.templates)
  const removeTemplate = useCustomAgentsStore((s) => s.removeTemplate)
  const hiddenDefaultRoles = useCustomAgentsStore((s) => s.hiddenDefaultRoles)
  const hideDefaultRole = useCustomAgentsStore((s) => s.hideDefaultRole)
  const unhideDefaultRole = useCustomAgentsStore((s) => s.unhideDefaultRole)
  const resetDefaultRoles = useCustomAgentsStore((s) => s.resetDefaultRoles)
  const unifiedOrder = useCustomAgentsStore((s) => s.unifiedOrder)
  const setUnifiedOrder = useCustomAgentsStore((s) => s.setUnifiedOrder)
  const addAgent = useWorkflowStore((s) => s.addAgent)
  const addAgentFromTemplate = useWorkflowStore((s) => s.addAgentFromTemplate)
  const addColumn = useWorkflowStore((s) => s.addColumn)
  const workflow = useWorkflowStore((s) => s.workflow)

  const [deleteTarget, setDeleteTarget] = useState<CustomAgentTemplate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const reorderTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const isDeletingRef = useRef(false)

  // Build unified agent list
  const unifiedItems = useMemo(
    () => getUnifiedAllAgents(unifiedOrder, templates, hiddenDefaultRoles),
    [unifiedOrder, templates, hiddenDefaultRoles]
  )

  // Build string keys for Reorder.Group (stable identity)
  const unifiedKeys = useMemo(
    () => unifiedItems.map((item) => (item.type === 'custom' ? `custom:${item.key}` : item.key)),
    [unifiedItems]
  )

  const handleUnifiedReorder = useCallback(
    (newKeys: string[]) => {
      if (isDeletingRef.current) return
      setUnifiedOrder(newKeys)

      if (reorderTimeoutRef.current) clearTimeout(reorderTimeoutRef.current)
      reorderTimeoutRef.current = setTimeout(() => {
        useToastStore.getState().addToast({
          variant: 'info',
          message: 'Agent order updated',
        })
      }, 800)
    },
    [setUnifiedOrder]
  )

  const handleAddToCanvas = useCallback(
    (template: CustomAgentTemplate) => {
      let columnId: string
      if (workflow.columns.length === 0) {
        columnId = addColumn()
      } else {
        columnId = workflow.columns[workflow.columns.length - 1].id
      }
      addAgentFromTemplate(columnId, template)
      useToastStore.getState().addToast({ variant: 'success', message: `Added "${template.name}" to canvas` })
    },
    [workflow.columns, addColumn, addAgentFromTemplate]
  )

  const handleAddDefaultToCanvas = useCallback(
    (role: AgentRole) => {
      let columnId: string
      if (workflow.columns.length === 0) {
        columnId = addColumn()
      } else {
        columnId = workflow.columns[workflow.columns.length - 1].id
      }
      addAgent(columnId, role)
      useToastStore.getState().addToast({ variant: 'success', message: `Added "${ROLE_META[role].label}" to canvas` })
    },
    [workflow.columns, addColumn, addAgent]
  )

  const handleToggleDefaultVisibility = useCallback(
    (role: AgentRole) => {
      const label = ROLE_META[role]?.label ?? role
      if (hiddenDefaultRoles.includes(role)) {
        unhideDefaultRole(role)
        useToastStore.getState().addToast({ variant: 'info', message: `Showing "${label}" in toolbar` })
      } else {
        hideDefaultRole(role)
        useToastStore.getState().addToast({ variant: 'info', message: `Hidden "${label}" from toolbar` })
      }
    },
    [hiddenDefaultRoles, hideDefaultRole, unhideDefaultRole]
  )

  const handleResetDefaults = useCallback(async () => {
    await resetDefaultRoles()
    useToastStore.getState().addToast({ variant: 'info', message: 'Default agents restored' })
  }, [resetDefaultRoles])

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    isDeletingRef.current = true
    setIsDeleting(true)
    await removeTemplate(deleteTarget.id)
    useToastStore.getState().addToast({ variant: 'info', message: `Deleted "${deleteTarget.name}"` })
    setDeleteTarget(null)
    setIsDeleting(false)
    requestAnimationFrame(() => {
      isDeletingRef.current = false
    })
  }, [deleteTarget, removeTemplate])

  const visibleDefaultCount = DISPLAY_ROLES.length - hiddenDefaultRoles.filter((r) => r !== 'custom').length

  return (
    <>
      {/* Summary */}
      <div className="px-6 pb-2">
        <p className="text-[10px] text-content-tertiary">
          {visibleDefaultCount} visible · {templates.length} saved · drag to reorder
        </p>
      </div>

      {/* Single unified Reorder.Group */}
      <Reorder.Group
        axis="y"
        values={unifiedKeys}
        onReorder={handleUnifiedReorder}
        className="space-y-1 px-3 pb-2"
        as="div"
      >
        {unifiedKeys.map((key) => {
          const item = unifiedItems.find((i) =>
            i.type === 'custom' ? `custom:${i.key}` === key : i.key === key
          )
          if (!item) return null

          return (
            <Reorder.Item
              key={key}
              value={key}
              as="div"
              className="list-none"
              whileDrag={{
                scale: 1.02,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px rgba(99,102,241,0.3)',
                zIndex: 50,
              }}
            >
              {item.type === 'default' ? (
                <DefaultAgentCard
                  role={item.role}
                  isHidden={item.isHidden}
                  onToggleVisibility={() => handleToggleDefaultVisibility(item.role)}
                  onAddToCanvas={() => handleAddDefaultToCanvas(item.role)}
                />
              ) : (
                <AgentTemplateCard
                  template={item.template!}
                  onAddToCanvas={() => handleAddToCanvas(item.template!)}
                  onDelete={() => setDeleteTarget(item.template!)}
                />
              )}
            </Reorder.Item>
          )
        })}
      </Reorder.Group>

      {/* Reset footer */}
      <div className="px-6 pt-3 pb-1">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleResetDefaults}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-[11px] font-medium
            text-content-tertiary hover:text-content-secondary hover:bg-surface-tertiary
            border border-transparent hover:border-border-subtle transition-all duration-150"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Reset Defaults
        </motion.button>
      </div>

      <DestructiveConfirmModal
        open={!!deleteTarget}
        title="Delete Saved Agent"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={isDeleting}
      />
    </>
  )
}

/* ══════════════════════════════════════════════════════
   AGENT CARDS (for Agents tab)
   ══════════════════════════════════════════════════════ */

function DefaultAgentCard({
  role,
  isHidden,
  onToggleVisibility,
  onAddToCanvas,
}: {
  role: AgentRole
  isHidden?: boolean
  onToggleVisibility: () => void
  onAddToCanvas: () => void
}) {
  const accent = ROLE_ACCENT[role]
  const roleMeta = ROLE_META[role]
  const tagline = ROLE_TAGLINES[role] ?? 'Specialized role'

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border-subtle
        hover:border-border-default hover:bg-surface-tertiary/40 transition-all duration-150 group
        ${isHidden ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center justify-center w-5 shrink-0 cursor-grab active:cursor-grabbing text-content-tertiary/30 group-hover:text-content-tertiary/60 transition-colors">
        <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
          <circle cx="2" cy="2" r="1.2" />
          <circle cx="6" cy="2" r="1.2" />
          <circle cx="2" cy="7" r="1.2" />
          <circle cx="6" cy="7" r="1.2" />
          <circle cx="2" cy="12" r="1.2" />
          <circle cx="6" cy="12" r="1.2" />
        </svg>
      </div>

      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${accent}12`, border: `1px solid ${accent}25`, color: accent }}
      >
        <RoleIcon role={role} size={16} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[12px] font-semibold text-content-primary truncate ${isHidden ? 'line-through decoration-content-tertiary' : ''}`}>
            {roleMeta.label}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0" style={{ background: `${accent}12`, color: accent }}>
            {roleMeta.abbr}
          </span>
          {isHidden && (
            <span className="text-[9px] font-medium text-content-tertiary bg-surface-tertiary px-1.5 py-0.5 rounded shrink-0">Hidden</span>
          )}
        </div>
        <p className="text-[10px] text-content-tertiary truncate mt-0.5">{tagline}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isHidden && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); onAddToCanvas() }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-button text-[10px] font-medium bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="8" y1="3" x2="8" y2="13" />
              <line x1="3" y1="8" x2="13" y2="8" />
            </svg>
            Add
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); onToggleVisibility() }}
          className={`w-7 h-7 rounded-button flex items-center justify-center transition-colors ${
            isHidden ? 'text-content-tertiary hover:text-accent hover:bg-accent/8' : 'text-content-tertiary hover:text-amber-400 hover:bg-amber-500/8'
          }`}
          title={isHidden ? 'Show in toolbar' : 'Hide from toolbar'}
        >
          {isHidden ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          )}
        </motion.button>
      </div>
    </div>
  )
}

function AgentTemplateCard({
  template,
  onAddToCanvas,
  onDelete,
}: {
  template: CustomAgentTemplate
  onAddToCanvas: () => void
  onDelete: () => void
}) {
  const role = template.role as AgentRole
  const accent = ROLE_ACCENT[role] || ROLE_ACCENT.custom
  const roleMeta = ROLE_META[role] || ROLE_META.custom

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border-subtle
        hover:border-border-default hover:bg-surface-tertiary/40 transition-all duration-150 group"
    >
      <div className="flex items-center justify-center w-5 shrink-0 cursor-grab active:cursor-grabbing text-content-tertiary/30 group-hover:text-content-tertiary/60 transition-colors">
        <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
          <circle cx="2" cy="2" r="1.2" />
          <circle cx="6" cy="2" r="1.2" />
          <circle cx="2" cy="7" r="1.2" />
          <circle cx="6" cy="7" r="1.2" />
          <circle cx="2" cy="12" r="1.2" />
          <circle cx="6" cy="12" r="1.2" />
        </svg>
      </div>

      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${accent}12`, border: `1px solid ${accent}25`, color: accent }}
      >
        <RoleIcon role={role} size={16} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-content-primary truncate">{template.name}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0" style={{ background: `${accent}12`, color: accent }}>
            {roleMeta.abbr}
          </span>
          {/* Bookmark badge to distinguish from defaults */}
          <svg width="8" height="10" viewBox="0 0 8 10" fill={accent} opacity="0.5" className="shrink-0">
            <path d="M0 0h8v10L4 7.5 0 10V0z" />
          </svg>
        </div>
        {template.roleDescription && (
          <p className="text-[10px] text-content-tertiary truncate mt-0.5">{template.roleDescription}</p>
        )}
        {template.skills.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {template.skills.slice(0, 3).map((skill) => {
              const category = categorizeSkill(skill.name)
              const skillAccent = getSkillAccentColor(skill.name)
              return (
                <span
                  key={skill.id}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium border"
                  style={{ background: `${skillAccent}10`, color: skillAccent, borderColor: `${skillAccent}20` }}
                >
                  <SkillIcon skillName={skill.name} category={category} size={8} />
                  {skill.name}
                </span>
              )
            })}
            {template.skills.length > 3 && (
              <span className="text-[9px] text-content-tertiary">+{template.skills.length - 3} more</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => { e.stopPropagation(); onAddToCanvas() }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-button text-[10px] font-medium bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          Add
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="w-7 h-7 rounded-button flex items-center justify-center text-content-tertiary hover:text-red-400 hover:bg-red-500/8 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </motion.button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   CLAUDE TAB
   ══════════════════════════════════════════════════════ */

function ClaudeTabContent({
  enabled,
  setEnabled,
  apiKey,
  setApiKey,
}: {
  enabled: boolean
  setEnabled: (v: boolean) => void
  apiKey: string
  setApiKey: (v: string) => void
}) {
  const [showKey, setShowKey] = useState(false)

  return (
    <>
      <SettingsField label="Claude Integration" index={0}>
        <ToggleRow
          label="Enable Claude Integration"
          description="Show 'Launch in Claude Code' and 'Run Workflow' buttons throughout the app"
          checked={enabled}
          onChange={setEnabled}
          accent
        />
      </SettingsField>

      {enabled && (
        <SettingsField label="API Key" index={1}>
          <div className="space-y-2">
            <p className="text-[10.5px] text-content-tertiary leading-relaxed">
              Enter your Anthropic API key for the Run Workflow feature.
              Stored locally on your machine.
            </p>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 pr-10 rounded-button bg-surface-tertiary border border-border-subtle
                  text-[12px] text-content-primary placeholder:text-content-tertiary
                  focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
                  focus:shadow-[0_0_0_3px_var(--color-accent-glow)] transition-all font-mono"
                placeholder="sk-ant-..."
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded
                  text-content-tertiary hover:text-content-secondary transition-colors"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-[10px] text-content-tertiary/70">
              Falls back to <code className="px-1 py-0.5 rounded bg-surface-tertiary text-[9px] font-mono">ANTHROPIC_API_KEY</code> environment variable if set.
            </p>
          </div>
        </SettingsField>
      )}

      <SettingsField label="About" index={enabled ? 2 : 1}>
        <div className="space-y-2">
          <p className="text-[11px] text-content-secondary leading-relaxed">
            When enabled, Opaal can launch Claude Code CLI with your generated
            prompts or run workflows directly using the Claude Agent SDK.
          </p>
          <div className="space-y-1">
            <p className="text-[10px] text-content-tertiary leading-relaxed">
              <span className="font-medium text-content-secondary">Launch in Claude Code</span> — requires the CLI installed via{' '}
              <code className="px-1 py-0.5 rounded bg-surface-tertiary text-[9px] font-mono">npm i -g @anthropic-ai/claude-code</code>
            </p>
            <p className="text-[10px] text-content-tertiary leading-relaxed">
              <span className="font-medium text-content-secondary">Run Workflow</span> — requires an API key (above) or the{' '}
              <code className="px-1 py-0.5 rounded bg-surface-tertiary text-[9px] font-mono">ANTHROPIC_API_KEY</code> env variable
            </p>
          </div>
        </div>
      </SettingsField>
    </>
  )
}

/* ══════════════════════════════════════════════════════
   SHARED COMPONENTS
   ══════════════════════════════════════════════════════ */

function SettingsField({ label, index, children }: { label: string; index: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25, ease: EASE }}
      className="space-y-1.5"
    >
      <label className="text-[11px] font-medium text-content-tertiary uppercase tracking-wider">
        {label}
      </label>
      {children}
    </motion.div>
  )
}

function getDefaultPermissions(workflow: ReturnType<typeof useWorkflowStore.getState>['workflow']): WorkflowPermissions {
  return workflow.settings.permissions ?? {
    allowFileCreation: true,
    allowFileModification: true,
    allowBashExecution: true,
    allowWebAccess: false,
    allowGitOperations: false,
    customPermissions: '',
  }
}

function ToggleRow({ label, description, checked, onChange, accent }: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  accent?: boolean
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 w-full text-left group"
    >
      <div className={`mt-0.5 w-8 h-[18px] rounded-full transition-colors duration-200 relative shrink-0 ${
        checked
          ? accent ? 'bg-gradient-to-r from-indigo-500 to-violet-500' : 'bg-accent'
          : 'bg-surface-tertiary border border-border-strong'
      }`}>
        <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'left-[14px]' : 'left-[2px]'
        }`} />
      </div>
      <div>
        <p className={`text-[12px] font-medium group-hover:text-content-primary transition-colors ${accent && checked ? 'text-indigo-400' : 'text-content-secondary'}`}>{label}</p>
        <p className="text-[10.5px] text-content-tertiary leading-relaxed">{description}</p>
      </div>
    </button>
  )
}

function ShortcutRow({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-content-tertiary">{label}</span>
      <kbd className="px-1.5 py-0.5 rounded bg-surface-tertiary border border-border-subtle text-[10px] font-mono text-content-secondary">
        {keys}
      </kbd>
    </div>
  )
}
