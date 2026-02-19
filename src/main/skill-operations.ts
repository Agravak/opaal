import { readFile, writeFile, mkdir, rm, rename } from 'fs/promises'
import { join, resolve } from 'path'
import { homedir } from 'os'
import { existsSync } from 'fs'

export interface SkillValidationResult {
  valid: boolean
  errors: { rule: string; message: string }[]
  warnings: { rule: string; message: string }[]
}

const SKILLS_DIR = join(homedir(), '.claude', 'skills')

function isAllowedPath(targetPath: string): boolean {
  const resolved = resolve(targetPath)
  return resolved.startsWith(resolve(SKILLS_DIR))
}

export async function writeSkillContent(skillPath: string, content: string): Promise<void> {
  if (!isAllowedPath(skillPath)) {
    throw new Error('Cannot write outside ~/.claude/skills/')
  }
  const filePath = join(skillPath, 'SKILL.md')
  if (existsSync(filePath)) {
    const backupPath = join(skillPath, '.SKILL.md.backup')
    await rename(filePath, backupPath)
  }
  await writeFile(filePath, content, 'utf-8')
}

export async function createSkillDirectory(skillName: string): Promise<string> {
  const sanitized = skillName.toLowerCase().replace(/[^a-z0-9-]/g, '')
  if (!sanitized || sanitized !== skillName) {
    throw new Error('Invalid skill name. Use only lowercase letters, numbers, and hyphens.')
  }
  const skillPath = join(SKILLS_DIR, sanitized)
  if (!isAllowedPath(skillPath)) {
    throw new Error('Invalid skill path')
  }
  if (existsSync(skillPath)) {
    throw new Error(`Skill "${sanitized}" already exists.`)
  }
  if (!existsSync(SKILLS_DIR)) {
    await mkdir(SKILLS_DIR, { recursive: true })
  }
  await mkdir(skillPath, { recursive: true })
  return skillPath
}

export async function deleteSkillDirectory(skillPath: string): Promise<void> {
  if (!isAllowedPath(skillPath)) {
    throw new Error('Cannot delete outside ~/.claude/skills/')
  }
  await rm(skillPath, { recursive: true, force: true })
}

export function validateSkillContent(content: string): SkillValidationResult {
  const errors: SkillValidationResult['errors'] = []
  const warnings: SkillValidationResult['warnings'] = []

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) {
    errors.push({ rule: 'frontmatter', message: 'Missing YAML frontmatter (--- delimiters)' })
  } else {
    const fm = frontmatterMatch[1]
    const nameMatch = fm.match(/^name:\s*(.+)$/m)
    if (!nameMatch) {
      errors.push({ rule: 'name', message: 'Missing "name" field in frontmatter' })
    } else {
      const name = nameMatch[1].trim()
      if (!/^[a-z0-9-]+$/.test(name)) {
        errors.push({ rule: 'name-format', message: 'Name must be lowercase letters, numbers, and hyphens only' })
      }
    }
    const descMatch = fm.match(/^description:\s*(.+)$/m)
    if (!descMatch) {
      errors.push({ rule: 'description', message: 'Missing "description" field in frontmatter' })
    } else {
      const desc = descMatch[1].trim()
      if (!desc.toLowerCase().startsWith('use when')) {
        warnings.push({ rule: 'description-format', message: 'Description should start with "Use when..."' })
      }
      if (desc.length > 500) {
        warnings.push({ rule: 'description-length', message: `Description is ${desc.length} chars (max 500)` })
      }
    }
  }

  if (!content.includes('## Overview')) {
    warnings.push({ rule: 'overview', message: 'Missing "## Overview" section' })
  }

  return { valid: errors.length === 0, errors, warnings }
}
