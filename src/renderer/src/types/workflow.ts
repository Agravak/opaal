/** Top-level workflow document - root of an .opaal file */
export interface Workflow {
  id: string
  name: string
  description: string
  version: string
  createdAt: string
  updatedAt: string
  columns: Column[]
  agents: AgentNode[]
  connections: Connection[]
  settings: WorkflowSettings
  metadata: WorkflowMetadata
}

/** Claude Code subagent types */
export type SubagentType = 'explore' | 'plan' | 'bash' | 'general-purpose' | 'auto'

/** Model preference for an agent */
export type ModelPreference = 'haiku' | 'sonnet' | 'opus' | 'auto'

/** Tool types available for agent scoping */
export type AgentTool = 'read' | 'write' | 'edit' | 'bash' | 'glob' | 'grep' | 'web-search' | 'web-fetch'

/** Fallback strategy when an agent fails */
export type FallbackStrategy = 'retry-once' | 'skip-and-continue' | 'ask-user' | 'use-default'

/** Handoff format for connections between agents */
export type HandoffFormat = 'summary' | 'structured-json' | 'file-reference' | 'full-output'

/** A column represents a wave/stage in the workflow */
export interface Column {
  id: string
  name: string
  order: number
  color?: string
  validationCriteria?: string
}

/** An agent node on the canvas */
export interface AgentNode {
  id: string
  columnId: string
  name: string
  role: AgentRole
  roleDescription: string
  skills: SkillReference[]
  outputDefinition: string
  instructions: string
  position: { x: number; y: number }
  // Native mode fields
  subagentType?: SubagentType
  preferredModel?: ModelPreference
  allowedTools?: AgentTool[]
  fallbackStrategy?: FallbackStrategy
  fallbackInstructions?: string
  contextNotes?: string
}

export type AgentRole =
  | 'architect'
  | 'developer'
  | 'reviewer'
  | 'tester'
  | 'documenter'
  | 'researcher'
  | 'powerpoint_presentation_builder'
  | 'blog_post_writer'
  | 'excel_expert'
  | 'newsletter_writer'
  | 'seo_content_optimizer'
  | 'meeting_notes_summarizer'
  | 'research_brief_writer'
  | 'social_media_caption_writer'
  | 'custom'

export const ALL_AGENT_ROLES: AgentRole[] = [
  'researcher',
  'architect',
  'developer',
  'reviewer',
  'documenter',
  'tester',
  'powerpoint_presentation_builder',
  'blog_post_writer',
  'excel_expert',
  'newsletter_writer',
  'seo_content_optimizer',
  'meeting_notes_summarizer',
  'research_brief_writer',
  'social_media_caption_writer',
  'custom',
]

export const ROLE_META: Record<AgentRole, { label: string; abbr: string; bg: string; text: string; border: string }> = {
  architect:   { label: 'Architect',   abbr: 'ARC', bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  border: 'border-indigo-500/20' },
  developer:   { label: 'Developer',   abbr: 'DEV', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  reviewer:    { label: 'Reviewer',    abbr: 'REV', bg: 'bg-violet-500/10',  text: 'text-violet-400',  border: 'border-violet-500/20' },
  tester:      { label: 'Tester',      abbr: 'TST', bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20' },
  documenter:  { label: 'Documenter',  abbr: 'DOC', bg: 'bg-teal-500/10',    text: 'text-teal-400',    border: 'border-teal-500/20' },
  researcher:  { label: 'Researcher',  abbr: 'RES', bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/20' },
  powerpoint_presentation_builder: { label: 'PowerPoint Presentation Builder', abbr: 'PPT', bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
  blog_post_writer: { label: 'Blog Post Writer', abbr: 'BLG', bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/20' },
  excel_expert: { label: 'Excel Expert', abbr: 'XLS', bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  newsletter_writer: { label: 'Newsletter Writer', abbr: 'NWS', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  seo_content_optimizer: { label: 'SEO Content Optimizer', abbr: 'SEO', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  meeting_notes_summarizer: { label: 'Meeting Notes Summarizer', abbr: 'MNS', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  research_brief_writer: { label: 'Research Brief Writer', abbr: 'RBW', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  social_media_caption_writer: { label: 'Social Media Caption Writer', abbr: 'SMC', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  custom:      { label: 'Custom',      abbr: 'CST', bg: 'bg-zinc-500/10',    text: 'text-zinc-400',    border: 'border-zinc-500/20' },
}

export const ROLE_TAGLINES: Partial<Record<AgentRole, string>> = {
  researcher: 'Investigate & discover',
  architect: 'Design & plan',
  developer: 'Build & implement',
  reviewer: 'Review & validate',
  documenter: 'Document & explain',
  tester: 'Test & verify',
  powerpoint_presentation_builder: 'Slide decks & narratives',
  blog_post_writer: 'Long-form article drafting',
  excel_expert: 'Spreadsheet modeling expert',
  newsletter_writer: 'Audience-ready editions',
  seo_content_optimizer: 'Search visibility tuning',
  meeting_notes_summarizer: 'Decisions & action items',
  research_brief_writer: 'Structured research briefs',
  social_media_caption_writer: 'Caption & hook generation',
  custom: 'Define your own',
}

export const ROLE_ACCENT: Record<AgentRole, string> = {
  architect:  '#6366f1',
  developer:  '#10b981',
  reviewer:   '#8b5cf6',
  tester:     '#f59e0b',
  documenter: '#14b8a6',
  researcher: '#f97316',
  powerpoint_presentation_builder: '#0ea5e9',
  blog_post_writer: '#d946ef',
  excel_expert: '#16a34a',
  newsletter_writer: '#3b82f6',
  seo_content_optimizer: '#a855f7',
  meeting_notes_summarizer: '#fb923c',
  research_brief_writer: '#06b6d4',
  social_media_caption_writer: '#f43f5e',
  custom:     '#71717a',
}

/** A reference to a skill assigned to an agent */
export interface SkillReference {
  id: string
  name: string
  source: 'detected' | 'manual'
}

/** Control flow type for a connection */
export type ConnectionFlowType = 'always' | 'conditional' | 'approval-gate' | 'loop'

/** Connection between two agents */
export interface Connection {
  id: string
  sourceAgentId: string
  targetAgentId: string
  type: 'auto' | 'manual'
  dataDescription?: string
  handoffFormat?: HandoffFormat
  handoffSchema?: string
  // Control flow fields
  flowType?: ConnectionFlowType       // undefined = 'always' (backward compat)
  condition?: string                   // natural-language condition (conditional)
  conditionLabel?: string              // short edge label ("passes review")
  isElseBranch?: boolean              // true = "otherwise" path
  loopCondition?: string              // exit condition (loop)
  maxIterations?: number              // safety cap, default 3 (loop)
  approvalPrompt?: string             // custom pause text (approval-gate)
}

/** Get the flow type of a connection, defaulting to 'always' for backward compat */
export function getFlowType(conn: Connection): ConnectionFlowType {
  return conn.flowType ?? 'always'
}

/** Granular permission settings for the workflow */
export interface WorkflowPermissions {
  allowFileCreation: boolean
  allowFileModification: boolean
  allowBashExecution: boolean
  allowWebAccess: boolean
  allowGitOperations: boolean
  customPermissions: string
}

/** Workflow-level settings */
export interface WorkflowSettings {
  preamble: string
  executionMode: 'sequential' | 'parallel-columns'
  includePermissions: boolean
  includeDeliverables: boolean
  autoConnectionExclusions?: string[]
  customSuffix?: string
  // Native mode
  nativeMode: boolean
  permissions?: WorkflowPermissions
}

/** Canvas viewport metadata */
export interface WorkflowMetadata {
  viewport: { x: number; y: number; zoom: number }
}

/** Skill category classification and visual metadata */
export const SKILL_CATEGORIES: Record<string, string[]> = {
  'Development': ['systematic-debugging', 'frontend-design', 'postgresql-table-design', 'remotion-best-practices'],
  'Documentation': ['docx', 'pptx', 'xlsx', 'writing-skills'],
  'Creative': ['imagegen', 'algorithmic-art'],
  'Engineering': ['prompt-engineering-patterns', 'brainstorming'],
  'Utilities': ['keybindings-help', 'find-skills'],
}

export const SKILL_CATEGORY_META: Record<string, { color: string; icon: string }> = {
  'Development': { color: '#10b981', icon: 'code' },
  'Documentation': { color: '#14b8a6', icon: 'doc' },
  'Creative': { color: '#f97316', icon: 'palette' },
  'Engineering': { color: '#6366f1', icon: 'gear' },
  'Utilities': { color: '#71717a', icon: 'wrench' },
}

export const MAX_ABILITY_SLOTS = 6

/** Smart defaults: map roles to recommended subagent types */
export const ROLE_SUBAGENT_DEFAULTS: Partial<Record<AgentRole, SubagentType>> = {
  researcher: 'explore',
  architect: 'plan',
  developer: 'general-purpose',
  tester: 'general-purpose',
  reviewer: 'explore',
  documenter: 'general-purpose',
  custom: 'auto',
}

/** Smart defaults: map roles to recommended models */
export const ROLE_MODEL_DEFAULTS: Partial<Record<AgentRole, ModelPreference>> = {
  researcher: 'haiku',
  reviewer: 'haiku',
  documenter: 'haiku',
  architect: 'sonnet',
  developer: 'sonnet',
  tester: 'sonnet',
  custom: 'auto',
}

/** Smart defaults: map subagent types to allowed tools */
export const SUBAGENT_TOOL_DEFAULTS: Record<SubagentType, AgentTool[]> = {
  'explore': ['read', 'glob', 'grep'],
  'plan': ['read', 'glob', 'grep', 'web-search'],
  'bash': ['bash'],
  'general-purpose': ['read', 'write', 'edit', 'bash', 'glob', 'grep', 'web-search', 'web-fetch'],
  'auto': ['read', 'write', 'edit', 'bash', 'glob', 'grep', 'web-search', 'web-fetch'],
}

/** All available tools for display */
export const ALL_AGENT_TOOLS: AgentTool[] = ['read', 'write', 'edit', 'bash', 'glob', 'grep', 'web-search', 'web-fetch']

/** Display labels for subagent types */
export const SUBAGENT_TYPE_META: Record<SubagentType, { label: string; description: string }> = {
  'explore': { label: 'Explore', description: 'Read-only codebase exploration and research' },
  'plan': { label: 'Plan', description: 'Architectural design and implementation planning' },
  'bash': { label: 'Bash', description: 'Shell command execution specialist' },
  'general-purpose': { label: 'General Purpose', description: 'Full capability agent for complex tasks' },
  'auto': { label: 'Auto', description: 'Let Claude decide the best agent type' },
}

/** Display labels for model preferences */
export const MODEL_META: Record<ModelPreference, { label: string; description: string }> = {
  'haiku': { label: 'Haiku', description: 'Fast & cost-efficient (90% of Sonnet quality)' },
  'sonnet': { label: 'Sonnet', description: 'Balanced performance for most tasks' },
  'opus': { label: 'Opus', description: 'Maximum capability for complex reasoning' },
  'auto': { label: 'Auto', description: 'Let Claude choose the optimal model' },
}

/** Display labels for fallback strategies */
export const FALLBACK_META: Record<FallbackStrategy, { label: string; description: string }> = {
  'retry-once': { label: 'Retry Once', description: 'Retry the agent with adjusted instructions' },
  'skip-and-continue': { label: 'Skip & Continue', description: 'Skip this agent and proceed to next wave' },
  'ask-user': { label: 'Ask User', description: 'Pause and ask the user for guidance' },
  'use-default': { label: 'Use Default', description: 'Use a default/placeholder output' },
}

/** Display labels for handoff formats */
export const HANDOFF_FORMAT_META: Record<HandoffFormat, { label: string; description: string }> = {
  'summary': { label: 'Summary', description: 'Concise bullet-point summary' },
  'structured-json': { label: 'Structured JSON', description: 'JSON object with defined schema' },
  'file-reference': { label: 'File Reference', description: 'Reference to files created/modified' },
  'full-output': { label: 'Full Output', description: 'Pass complete output as-is' },
}

/** Display labels for connection flow types */
export const FLOW_TYPE_META: Record<ConnectionFlowType, { label: string; description: string; color: string }> = {
  'always':        { label: 'Always',        description: 'Data always flows through this connection', color: '#71717a' },
  'conditional':   { label: 'Conditional',   description: 'Data flows only when a condition is met', color: '#f59e0b' },
  'approval-gate': { label: 'Approval Gate', description: 'Pauses for user approval before proceeding', color: '#6366f1' },
  'loop':          { label: 'Loop',          description: 'Repeats until a condition is met', color: '#10b981' },
}

/** Per-skill visual metadata for legendary icon system */
export interface SkillVisualMeta {
  label: string
  gradient: [string, string]
  accentColor: string
}

export const SKILL_ICON_META: Record<string, SkillVisualMeta> = {
  'systematic-debugging':        { label: 'Debugging',       gradient: ['#10b981', '#059669'], accentColor: '#10b981' },
  'frontend-design':             { label: 'Frontend',        gradient: ['#3b82f6', '#6366f1'], accentColor: '#3b82f6' },
  'postgresql-table-design':     { label: 'PostgreSQL',      gradient: ['#0ea5e9', '#0284c7'], accentColor: '#0ea5e9' },
  'remotion-best-practices':     { label: 'Remotion',        gradient: ['#8b5cf6', '#7c3aed'], accentColor: '#8b5cf6' },
  'docx':                        { label: 'Word Docs',       gradient: ['#2563eb', '#1d4ed8'], accentColor: '#2563eb' },
  'pptx':                        { label: 'PowerPoint',      gradient: ['#ea580c', '#c2410c'], accentColor: '#ea580c' },
  'xlsx':                        { label: 'Excel',           gradient: ['#16a34a', '#15803d'], accentColor: '#16a34a' },
  'writing-skills':              { label: 'Writing',         gradient: ['#14b8a6', '#0d9488'], accentColor: '#14b8a6' },
  'imagegen':                    { label: 'Image Gen',       gradient: ['#f97316', '#ea580c'], accentColor: '#f97316' },
  'algorithmic-art':             { label: 'Algo Art',        gradient: ['#ec4899', '#db2777'], accentColor: '#ec4899' },
  'prompt-engineering-patterns': { label: 'Prompt Eng.',     gradient: ['#6366f1', '#4f46e5'], accentColor: '#6366f1' },
  'brainstorming':               { label: 'Brainstorm',      gradient: ['#f59e0b', '#d97706'], accentColor: '#f59e0b' },
  'keybindings-help':            { label: 'Keybindings',     gradient: ['#71717a', '#52525b'], accentColor: '#a1a1aa' },
  'find-skills':                 { label: 'Find Skills',     gradient: ['#a855f7', '#9333ea'], accentColor: '#a855f7' },
}

/** Get accent color for a specific skill, falling back to category color */
export function getSkillAccentColor(skillName: string): string {
  return SKILL_ICON_META[skillName]?.accentColor ?? SKILL_CATEGORY_META[categorizeSkill(skillName)]?.color ?? '#71717a'
}

/** Get gradient pair for a specific skill, falling back to category color */
export function getSkillGradient(skillName: string): [string, string] {
  return SKILL_ICON_META[skillName]?.gradient ?? (() => {
    const c = SKILL_CATEGORY_META[categorizeSkill(skillName)]?.color ?? '#71717a'
    return [c, c] as [string, string]
  })()
}

export function categorizeSkill(name: string): string {
  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    if (skills.includes(name)) return category
  }
  return 'Utilities'
}
