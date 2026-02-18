import { SKILL_CATEGORY_META, SKILL_ICON_META, categorizeSkill } from '../../types/workflow'

interface SkillIconProps {
  skillName?: string
  category?: string
  size?: number
  className?: string
}

// ── Per-Skill Unique SVG Icons (14 distinct designs) ──

const skillIconPaths: Record<string, JSX.Element> = {
  // Development: Bug body + magnifying glass
  'systematic-debugging': (
    <>
      <circle cx="6.5" cy="8.5" r="2.5" />
      <path d="M4.5 6L3.5 4.5" />
      <path d="M8.5 6L9.5 4.5" />
      <path d="M4 8.5H2" />
      <path d="M11 8.5H9" />
      <path d="M4 10.5L3 12" />
      <path d="M9 10.5L10 12" />
      <circle cx="12" cy="4.5" r="2" />
      <path d="M13.5 6L15 7.5" />
    </>
  ),

  // Development: Browser window with layout grid
  'frontend-design': (
    <>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M1.5 5.5h13" />
      <circle cx="3.5" cy="4" r="0.5" fill="currentColor" />
      <circle cx="5.2" cy="4" r="0.5" fill="currentColor" />
      <path d="M6 5.5v8" />
      <path d="M8 8.5h5" />
      <path d="M8 11h3.5" />
    </>
  ),

  // Development: Database cylinder with columns
  'postgresql-table-design': (
    <>
      <ellipse cx="8" cy="4" rx="5" ry="2" />
      <path d="M3 4v8c0 1.1 2.24 2 5 2s5-.9 5-2V4" />
      <path d="M3 7.5c0 1.1 2.24 2 5 2s5-.9 5-2" />
      <path d="M6 4v10" />
      <path d="M10 4v10" />
    </>
  ),

  // Development: Film frame with play button
  'remotion-best-practices': (
    <>
      <rect x="2" y="3" width="12" height="10" rx="1" />
      <path d="M2 5.5h1.2M2 8h1.2M2 10.5h1.2" />
      <path d="M12.8 5.5H14M12.8 8H14M12.8 10.5H14" />
      <path d="M7 6v4l3-2z" fill="currentColor" />
    </>
  ),

  // Documentation: Document page with stylized W
  'docx': (
    <>
      <path d="M10 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8.5a1 1 0 001-1V5z" />
      <polyline points="10 1.5 10 5 13.5 5" />
      <path d="M5.5 8.5l1 3 1.5-2.3 1.5 2.3 1-3" />
    </>
  ),

  // Documentation: Presentation slide with bar chart
  'pptx': (
    <>
      <rect x="1.5" y="3" width="13" height="9.5" rx="1" />
      <path d="M8 14l-2.5 1" />
      <path d="M8 14l2.5 1" />
      <rect x="4" y="7.5" width="1.8" height="3" rx="0.3" fill="currentColor" opacity="0.4" />
      <rect x="7" y="5.5" width="1.8" height="5" rx="0.3" fill="currentColor" opacity="0.6" />
      <rect x="10" y="4.5" width="1.8" height="6" rx="0.3" fill="currentColor" opacity="0.85" />
    </>
  ),

  // Documentation: Spreadsheet grid with fx formula
  'xlsx': (
    <>
      <rect x="2" y="2" width="12" height="12" rx="1" />
      <path d="M2 5.5h12" />
      <path d="M2 9h12" />
      <path d="M5.5 2v12" />
      <path d="M9.5 2v12" />
      <circle cx="3.8" cy="3.8" r="0.5" fill="currentColor" opacity="0.5" />
    </>
  ),

  // Documentation: Quill pen with sparkle
  'writing-skills': (
    <>
      <path d="M13 1.5l1.5 1.5-9 9L3 13l1-2.5z" />
      <path d="M11 3.5l1.5 1.5" />
      <path d="M2 7v-1.5" />
      <path d="M1.2 6.2h1.6" />
    </>
  ),

  // Creative: Photo frame with AI sparkles
  'imagegen': (
    <>
      <rect x="1.5" y="3.5" width="10.5" height="9.5" rx="1" />
      <circle cx="5" cy="7" r="1.3" />
      <path d="M1.5 11l2.5-2.5 1.8 1.8 2.5-3L12 11" />
      <path d="M13.5 2v2.5M12.2 3.25h2.6" />
      <path d="M12 6v1.5M11.2 6.75h1.6" />
    </>
  ),

  // Creative: Geometric spiral with accent dots
  'algorithmic-art': (
    <>
      <path d="M8 8a3 3 0 013-3" />
      <path d="M11 5a4.5 4.5 0 01-4.5 4.5" />
      <path d="M6.5 9.5A6 6 0 0112.5 3.5" />
      <circle cx="4" cy="12.5" r="0.8" fill="currentColor" />
      <circle cx="13.5" cy="2.5" r="0.6" fill="currentColor" />
      <circle cx="2.5" cy="8" r="0.5" fill="currentColor" />
      <path d="M2 14l3-3" />
    </>
  ),

  // Engineering: Terminal prompt with brackets
  'prompt-engineering-patterns': (
    <>
      <path d="M2 5l3 3-3 3" />
      <path d="M7 11h3.5" />
      <path d="M11 2.5h2.5v11H11" />
      <path d="M11 2.5v0M11 13.5v0" />
      <circle cx="12.2" cy="6" r="0.5" fill="currentColor" />
      <circle cx="12.2" cy="8" r="0.5" fill="currentColor" />
      <circle cx="12.2" cy="10" r="0.5" fill="currentColor" />
    </>
  ),

  // Engineering: Lightbulb with radiating rays
  'brainstorming': (
    <>
      <path d="M6 11.5h4" />
      <path d="M6.5 13h3" />
      <path d="M6 11.5c0-1.5-2.2-2.8-2.2-5a4.2 4.2 0 118.4 0c0 2.2-2.2 3.5-2.2 5" />
      <path d="M3.8 3.5L2.8 2.5" />
      <path d="M12.2 3.5l1-1" />
      <path d="M8 1v1.2" />
    </>
  ),

  // Utilities: Keyboard key with lightning bolt
  'keybindings-help': (
    <>
      <rect x="2" y="4.5" width="12" height="8" rx="2" />
      <rect x="3.2" y="5.7" width="9.6" height="5.6" rx="1" />
      <path d="M9.5 6L7.5 9h2L7.5 12" />
    </>
  ),

  // Utilities: Compass with directional needle
  'find-skills': (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 3v1.2" />
      <path d="M8 11.8V13" />
      <path d="M3 8h1.2" />
      <path d="M11.8 8H13" />
      <polygon points="8 5 9.2 8 8 11 6.8 8" fill="currentColor" opacity="0.5" />
      <circle cx="8" cy="8" r="0.7" fill="currentColor" />
    </>
  ),
}

// ── Category-Level Fallback Icons ──

const categoryIconPaths: Record<string, JSX.Element> = {
  code: (
    <>
      <polyline points="4 6 1 8 4 10" />
      <polyline points="12 6 15 8 12 10" />
      <line x1="10" y1="4" x2="6" y2="12" />
    </>
  ),
  doc: (
    <>
      <path d="M10 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5z" />
      <polyline points="10 1 10 5 14 5" />
      <line x1="5" y1="8" x2="11" y2="8" />
      <line x1="5" y1="11" x2="9" y2="11" />
    </>
  ),
  palette: (
    <>
      <circle cx="8" cy="8" r="6.5" />
      <circle cx="6" cy="5.5" r="1" fill="currentColor" />
      <circle cx="10" cy="5.5" r="1" fill="currentColor" />
      <circle cx="4.5" cy="8" r="1" fill="currentColor" />
      <circle cx="8" cy="10.5" r="1.2" fill="currentColor" />
    </>
  ),
  gear: (
    <>
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
    </>
  ),
  wrench: (
    <>
      <path d="M11.4 2.6a4 4 0 0 0-5.3 5.3L2 12l2 2 4.1-4.1a4 4 0 0 0 5.3-5.3L11 7 9 5l2.4-2.4z" />
    </>
  ),
}

export function getSkillIconColor(skillName?: string, category?: string): string {
  if (skillName && SKILL_ICON_META[skillName]) {
    return SKILL_ICON_META[skillName].accentColor
  }
  const cat = category ?? 'Utilities'
  return SKILL_CATEGORY_META[cat]?.color ?? '#71717a'
}

export function SkillIcon({ skillName, category, size = 14, className }: SkillIconProps) {
  // Try skill-specific icon first
  if (skillName && skillIconPaths[skillName]) {
    const color = SKILL_ICON_META[skillName]?.accentColor
      ?? SKILL_CATEGORY_META[categorizeSkill(skillName)]?.color
      ?? '#71717a'

    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {skillIconPaths[skillName]}
      </svg>
    )
  }

  // Fallback to category icon
  const cat = category ?? 'Utilities'
  const meta = SKILL_CATEGORY_META[cat] || SKILL_CATEGORY_META['Utilities']
  const icon = categoryIconPaths[meta.icon] || categoryIconPaths['wrench']

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke={meta.color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {icon}
    </svg>
  )
}
