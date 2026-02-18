import type { AgentRole, SkillReference } from './workflow'

/** A saved custom agent template, persisted across workflows */
export interface CustomAgentTemplate {
  id: string
  name: string
  role: AgentRole
  roleDescription: string
  skills: SkillReference[]
  outputDefinition: string
  instructions: string
  createdAt: string
  updatedAt: string
}

/** Data required to create a new custom agent template (no id/timestamps) */
export type CreateCustomAgentInput = Omit<CustomAgentTemplate, 'id' | 'createdAt' | 'updatedAt'>
