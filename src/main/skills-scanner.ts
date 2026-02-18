import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'

export interface DetectedSkill {
  id: string
  name: string
  path: string
  description: string
}

/** Scan ~/.claude/skills and ~/.claude/settings/skills directories for installed skills */
export async function scanSkills(): Promise<DetectedSkill[]> {
  const skillsDirs = [
    join(homedir(), '.claude', 'skills'),
    join(homedir(), '.claude', 'settings', 'skills')
  ]
  const skills: DetectedSkill[] = []
  const seenNames = new Set<string>()

  for (const skillsDir of skillsDirs) {
    try {
      const entries = await readdir(skillsDir, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        const skillName = entry.name

        // Deduplicate by skill name
        if (seenNames.has(skillName)) continue
        seenNames.add(skillName)

        const skillPath = join(skillsDir, entry.name)

        // Try to read SKILL.md for description
        let description = ''
        try {
          const skillMd = await readFile(join(skillPath, 'SKILL.md'), 'utf-8')
          // Extract first paragraph or heading as description
          const lines = skillMd.split('\n').filter(l => l.trim())
          const firstContent = lines.find(l => !l.startsWith('#') && l.trim().length > 0)
          description = firstContent?.trim().slice(0, 120) || skillName
        } catch {
          description = skillName
        }

        skills.push({
          id: `detected:${skillName}`,
          name: skillName,
          path: skillPath,
          description
        })
      }
    } catch {
      // Directory doesn't exist or not readable, continue to next
    }
  }

  return skills
}
