export interface SkillTemplate {
  id: string
  name: string
  category: string
  description: string
  accentColor: string
  icon: 'code' | 'doc' | 'palette' | 'gear' | 'wrench'
  generate: (skillName: string, purpose: string) => string
}

function toTitle(name: string): string {
  return name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function toDescription(purpose: string): string {
  const trimmed = purpose.trim()
  if (!trimmed) return 'Use when this skill is needed'
  const lower = trimmed.toLowerCase()
  if (lower.startsWith('use when')) return trimmed
  return `Use when ${lower.startsWith('you ') ? '' : 'you need to '}${lower.replace(/\.$/, '')}`
}

export const skillTemplates: SkillTemplate[] = [
  {
    id: 'development-tool',
    name: 'Development Tool',
    category: 'Development',
    description: 'Coding, debugging, and testing patterns',
    accentColor: '#3b82f6',
    icon: 'code',
    generate: (skillName: string, purpose: string) => {
      const title = toTitle(skillName)
      const desc = toDescription(purpose)
      return `---
name: ${skillName}
description: ${desc}
---

# ${title}

## Overview
A development skill for ${purpose || 'improving code quality and developer productivity'}. Apply this pattern to write cleaner, more maintainable code.

## When to Use
- When implementing new features that follow this pattern
- When refactoring existing code to improve quality
- When debugging issues related to this domain

## Core Pattern

### Before (Anti-Pattern)
\`\`\`typescript
// Describe the common mistake or suboptimal approach
// that developers typically make
\`\`\`

### After (Optimized)
\`\`\`typescript
// Show the improved version with better practices
// Explain why this approach is superior
\`\`\`

## Quick Reference

| Technique | When to Use | Example |
|-----------|-------------|---------|
| Pattern A | Common scenarios | Brief code snippet |
| Pattern B | Edge cases | Brief code snippet |
| Pattern C | Performance critical | Brief code snippet |

## Implementation

### Step 1: Setup
Describe the initial setup and prerequisites.

### Step 2: Core Logic
Detail the main implementation steps with code examples.

### Step 3: Testing
Explain how to verify the implementation works correctly.

## Common Mistakes
- **Overcomplicating the solution**: Keep it simple and focused on the core problem
- **Ignoring edge cases**: Always handle null/undefined and boundary conditions
- **Skipping tests**: Write tests before or alongside the implementation
`
    },
  },
  {
    id: 'documentation-generator',
    name: 'Documentation Generator',
    category: 'Documentation',
    description: 'Creating docs, reports, formatted output',
    accentColor: '#10b981',
    icon: 'doc',
    generate: (skillName: string, purpose: string) => {
      const title = toTitle(skillName)
      const desc = toDescription(purpose)
      return `---
name: ${skillName}
description: ${desc}
---

# ${title}

## Overview
A documentation skill for ${purpose || 'generating structured, well-formatted documents'}. Produces clear, professional output suitable for stakeholders.

## When to Use
- When creating structured documentation from raw information
- When formatting content for a specific audience
- When generating reports or summaries

## Output Format

### Document Structure
1. **Header Section**: Title, metadata, date
2. **Executive Summary**: Key points in 2-3 sentences
3. **Main Content**: Organized sections with clear headings
4. **Appendix**: Supporting data and references

### Formatting Guidelines
- Use clear, concise language
- Break content into scannable sections
- Include tables for comparative data
- Add code blocks for technical content

## Quick Reference

| Section | Purpose | Length |
|---------|---------|-------|
| Summary | High-level overview | 2-3 sentences |
| Details | In-depth explanation | As needed |
| Action Items | Next steps | Bullet list |

## Template

\`\`\`markdown
# [Document Title]

**Date**: [Date]
**Author**: [Author]
**Status**: [Draft/Final]

## Summary
[Brief overview of the document's content]

## Details
[Main content organized by sections]

## Recommendations
[Actionable next steps]
\`\`\`

## Common Mistakes
- **Too much jargon**: Write for your audience's level of expertise
- **Missing structure**: Always use headings and sections for scannability
- **No actionable items**: End with clear next steps or recommendations
`
    },
  },
  {
    id: 'creative-skill',
    name: 'Creative Skill',
    category: 'Creative',
    description: 'Art, design, and content creation',
    accentColor: '#a855f7',
    icon: 'palette',
    generate: (skillName: string, purpose: string) => {
      const title = toTitle(skillName)
      const desc = toDescription(purpose)
      return `---
name: ${skillName}
description: ${desc}
---

# ${title}

## Overview
A creative skill for ${purpose || 'generating visual or artistic content with consistent style and quality'}. Balances aesthetic appeal with functional requirements.

## When to Use
- When creating visual assets or creative content
- When applying a consistent design language
- When iterating on creative concepts

## Design Principles
1. **Consistency**: Maintain a unified visual language
2. **Hierarchy**: Guide the viewer's eye with clear focal points
3. **Simplicity**: Remove unnecessary complexity
4. **Emotion**: Evoke the intended feeling or response

## Style Guide

### Color Palette
- Primary: Define the dominant color
- Secondary: Supporting accent colors
- Neutral: Background and text colors

### Typography
- Headings: Bold, high contrast
- Body: Readable, comfortable line height
- Accents: Used sparingly for emphasis

## Quick Reference

| Element | Style | Usage |
|---------|-------|-------|
| Headers | Bold, large | Section divisions |
| Accents | Colored, subtle | Emphasis and highlights |
| Spacing | Generous | Breathing room between elements |

## Creative Process
1. **Brief**: Understand the requirements and constraints
2. **Explore**: Generate multiple concepts and variations
3. **Refine**: Polish the chosen direction
4. **Deliver**: Export in the required format

## Common Mistakes
- **Inconsistent style**: Stick to the established design language
- **Over-decoration**: Less is more; let the content breathe
- **Ignoring context**: Always design for the target medium and audience
`
    },
  },
  {
    id: 'engineering-pattern',
    name: 'Engineering Pattern',
    category: 'Engineering',
    description: 'Prompts, workflows, architectural approaches',
    accentColor: '#f59e0b',
    icon: 'gear',
    generate: (skillName: string, purpose: string) => {
      const title = toTitle(skillName)
      const desc = toDescription(purpose)
      return `---
name: ${skillName}
description: ${desc}
---

# ${title}

## Overview
An engineering pattern for ${purpose || 'structuring complex systems and workflows for reliability and maintainability'}. Provides a reusable blueprint for common architectural challenges.

## When to Use
- When designing systems that need this architectural approach
- When existing solutions show signs of the problems this pattern solves
- When scaling requires a more structured approach

## Architecture

### Components
1. **Input Layer**: How data enters the system
2. **Processing Layer**: Core transformation logic
3. **Output Layer**: How results are delivered

### Flow Diagram
\`\`\`
Input --> Validate --> Process --> Transform --> Output
                          |
                     Error Handler
\`\`\`

## Quick Reference

| Component | Responsibility | Dependencies |
|-----------|---------------|--------------|
| Validator | Input sanitization | Schema definitions |
| Processor | Core logic | Business rules |
| Transformer | Output formatting | Target specifications |

## Implementation Guidelines

### Configuration
Define clear configuration boundaries and sensible defaults.

### Error Handling
Implement graceful degradation with meaningful error messages.

### Monitoring
Add observability at key decision points in the pipeline.

## Trade-offs
- **Complexity vs. Flexibility**: More abstraction allows more flexibility but adds complexity
- **Performance vs. Safety**: Validation adds latency but prevents errors
- **Coupling vs. Simplicity**: Loose coupling enables change but requires more boilerplate

## Common Mistakes
- **Premature optimization**: Profile before optimizing; solve the right problem first
- **Missing error paths**: Every integration point is a potential failure point
- **Tight coupling**: Design for change; isolate components behind interfaces
`
    },
  },
  {
    id: 'utility',
    name: 'Utility',
    category: 'Utilities',
    description: 'General-purpose helper skills',
    accentColor: '#71717a',
    icon: 'wrench',
    generate: (skillName: string, purpose: string) => {
      const title = toTitle(skillName)
      const desc = toDescription(purpose)
      return `---
name: ${skillName}
description: ${desc}
---

# ${title}

## Overview
A utility skill for ${purpose || 'automating common tasks and improving workflow efficiency'}. Designed to be composable and reusable across different contexts.

## When to Use
- When performing repetitive tasks that benefit from automation
- When you need a consistent approach to this type of work
- When integrating this capability into larger workflows

## Usage

### Basic Usage
Describe the simplest way to apply this skill.

### Advanced Usage
Explain more complex scenarios and customization options.

## Quick Reference

| Command / Action | Description | Example |
|-----------------|-------------|---------|
| Basic operation | What it does | How to use it |
| With options | Extended functionality | Configuration example |
| Batch mode | Processing multiple items | Batch usage pattern |

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| Option A | \`true\` | What this option controls |
| Option B | \`"auto"\` | Behavior selection |

## Integration
Describe how this skill works with other tools and workflows.

## Common Mistakes
- **Not reading the output**: Always verify the results before proceeding
- **Using defaults blindly**: Customize settings for your specific use case
- **Forgetting edge cases**: Test with unusual inputs and boundary conditions
`
    },
  },
]
