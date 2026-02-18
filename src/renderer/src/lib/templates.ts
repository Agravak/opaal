import { v4 as uuid } from 'uuid'
import type { Workflow } from '../types/workflow'

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  preview: string
  create: () => Workflow
}

function makeId(): string {
  return uuid()
}

export const templates: WorkflowTemplate[] = [
  {
    id: 'code-review',
    name: 'Code Review Pipeline',
    description: 'A 3-wave workflow: analyze code, review for issues, then document findings.',
    preview: 'Researcher -> Reviewer -> Documenter',
    create: () => {
      const col1Id = makeId(), col2Id = makeId(), col3Id = makeId()
      const agent1Id = makeId(), agent2Id = makeId(), agent3Id = makeId()

      return {
        id: makeId(),
        name: 'Code Review Pipeline',
        description: 'Analyze codebase, review for quality issues, and produce documentation.',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        columns: [
          { id: col1Id, name: 'Analysis', order: 0 },
          { id: col2Id, name: 'Review', order: 1 },
          { id: col3Id, name: 'Documentation', order: 2 },
        ],
        agents: [
          {
            id: agent1Id, columnId: col1Id, name: 'Code Analyzer',
            role: 'researcher', roleDescription: 'Analyzes the codebase structure, identifies patterns, and maps dependencies.',
            skills: [], outputDefinition: 'Codebase analysis report with architecture overview',
            instructions: 'Thoroughly explore the repository. Map out the file structure, key modules, dependencies, and architectural patterns. Identify areas of concern.',
            position: { x: 40, y: 80 },
            subagentType: 'explore' as const, preferredModel: 'haiku' as const,
            allowedTools: ['read' as const, 'glob' as const, 'grep' as const],
          },
          {
            id: agent2Id, columnId: col2Id, name: 'Quality Reviewer',
            role: 'reviewer', roleDescription: 'Reviews code quality, identifies bugs, security issues, and improvement opportunities.',
            skills: [{ id: 'detected:systematic-debugging', name: 'systematic-debugging', source: 'detected' }],
            outputDefinition: 'Detailed code review with prioritized issues',
            instructions: 'Review the code analysis and examine the actual code. Focus on: bugs, security vulnerabilities, performance issues, code style, and best practices violations. Prioritize findings by severity.',
            position: { x: 460, y: 80 },
            subagentType: 'explore' as const, preferredModel: 'sonnet' as const,
            allowedTools: ['read' as const, 'glob' as const, 'grep' as const],
          },
          {
            id: agent3Id, columnId: col3Id, name: 'Review Documenter',
            role: 'documenter', roleDescription: 'Compiles review findings into a clear, actionable report.',
            skills: [{ id: 'detected:docx', name: 'docx', source: 'detected' }],
            outputDefinition: 'Final review report document',
            instructions: 'Compile all findings into a well-organized document. Include an executive summary, detailed issues list with remediation steps, and a recommended action plan.',
            position: { x: 880, y: 80 },
            subagentType: 'general-purpose' as const, preferredModel: 'haiku' as const,
            allowedTools: ['read' as const, 'write' as const, 'edit' as const, 'glob' as const, 'grep' as const] as const,
          },
        ],
        connections: [
          { id: makeId(), sourceAgentId: agent1Id, targetAgentId: agent2Id, type: 'auto' },
          { id: makeId(), sourceAgentId: agent2Id, targetAgentId: agent3Id, type: 'auto' },
        ],
        settings: {
          preamble: '',
          executionMode: 'parallel-columns',
          includePermissions: true,
          includeDeliverables: true,
          nativeMode: false,
        },
        metadata: { viewport: { x: 0, y: 0, zoom: 1 } }
      }
    }
  },
  {
    id: 'feature-build',
    name: 'Feature Build',
    description: 'Full feature development: research, architect, implement in parallel, then review.',
    preview: 'Researcher -> Architect -> [Developer, Tester] -> Reviewer',
    create: () => {
      const col1Id = makeId(), col2Id = makeId(), col3Id = makeId(), col4Id = makeId()
      const a1 = makeId(), a2 = makeId(), a3 = makeId(), a4 = makeId(), a5 = makeId()

      return {
        id: makeId(),
        name: 'Feature Build',
        description: 'End-to-end feature development with research, architecture, parallel implementation + testing, and final review.',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        columns: [
          { id: col1Id, name: 'Research', order: 0 },
          { id: col2Id, name: 'Design', order: 1 },
          { id: col3Id, name: 'Build', order: 2 },
          { id: col4Id, name: 'Validate', order: 3 },
        ],
        agents: [
          {
            id: a1, columnId: col1Id, name: 'Feature Researcher',
            role: 'researcher', roleDescription: 'Researches requirements, existing patterns, and best approaches.',
            skills: [{ id: 'detected:brainstorming', name: 'brainstorming', source: 'detected' }],
            outputDefinition: 'Research findings and recommended approach',
            instructions: 'Understand the feature requirements thoroughly. Research existing code patterns, similar implementations, and identify the best approach. Consider edge cases and constraints.',
            position: { x: 40, y: 80 },
            subagentType: 'explore' as const, preferredModel: 'haiku' as const,
            allowedTools: ['read' as const, 'glob' as const, 'grep' as const],
          },
          {
            id: a2, columnId: col2Id, name: 'System Architect',
            role: 'architect', roleDescription: 'Designs the technical architecture and implementation plan.',
            skills: [],
            outputDefinition: 'Technical design document with implementation steps',
            instructions: 'Based on research findings, create a technical design. Define the API contracts, data models, component structure, and step-by-step implementation plan.',
            position: { x: 460, y: 80 },
            subagentType: 'plan' as const, preferredModel: 'sonnet' as const,
            allowedTools: ['read' as const, 'glob' as const, 'grep' as const, 'web-search' as const] as const,
          },
          {
            id: a3, columnId: col3Id, name: 'Feature Developer',
            role: 'developer', roleDescription: 'Implements the feature according to the architectural plan.',
            skills: [],
            outputDefinition: 'Working implementation with all code changes',
            instructions: 'Follow the architectural plan exactly. Write clean, well-tested code. Commit changes incrementally with clear commit messages.',
            position: { x: 880, y: 80 },
            subagentType: 'general-purpose' as const, preferredModel: 'sonnet' as const,
            allowedTools: ['read' as const, 'write' as const, 'edit' as const, 'bash' as const, 'glob' as const, 'grep' as const] as const,
          },
          {
            id: a4, columnId: col3Id, name: 'Test Writer',
            role: 'tester', roleDescription: 'Writes comprehensive tests for the feature.',
            skills: [{ id: 'detected:systematic-debugging', name: 'systematic-debugging', source: 'detected' }],
            outputDefinition: 'Test suite covering all scenarios',
            instructions: 'Write unit tests, integration tests, and edge case tests. Ensure high coverage of the new feature. Test both happy paths and error scenarios.',
            position: { x: 880, y: 284 },
            subagentType: 'general-purpose' as const, preferredModel: 'sonnet' as const,
            allowedTools: ['read' as const, 'write' as const, 'edit' as const, 'bash' as const, 'glob' as const, 'grep' as const] as const,
          },
          {
            id: a5, columnId: col4Id, name: 'Code Reviewer',
            role: 'reviewer', roleDescription: 'Reviews the complete implementation for quality and correctness.',
            skills: [],
            outputDefinition: 'Review approval or list of required changes',
            instructions: 'Review all code changes and tests. Verify the implementation matches the design. Check for code quality, edge cases, and potential issues. Approve or request specific changes.',
            position: { x: 1300, y: 80 },
            subagentType: 'explore' as const, preferredModel: 'haiku' as const,
            allowedTools: ['read' as const, 'glob' as const, 'grep' as const],
          },
        ],
        connections: [
          { id: makeId(), sourceAgentId: a1, targetAgentId: a2, type: 'auto' },
          { id: makeId(), sourceAgentId: a2, targetAgentId: a3, type: 'auto' },
          { id: makeId(), sourceAgentId: a2, targetAgentId: a4, type: 'auto' },
          { id: makeId(), sourceAgentId: a3, targetAgentId: a5, type: 'auto' },
          { id: makeId(), sourceAgentId: a4, targetAgentId: a5, type: 'auto' },
        ],
        settings: {
          preamble: '',
          executionMode: 'parallel-columns',
          includePermissions: true,
          includeDeliverables: true,
          nativeMode: false,
        },
        metadata: { viewport: { x: 0, y: 0, zoom: 1 } }
      }
    }
  },
  {
    id: 'bug-fix',
    name: 'Bug Investigation & Fix',
    description: 'Systematic bug fixing: investigate, fix, test, and document.',
    preview: 'Researcher -> Developer -> Tester -> Documenter',
    create: () => {
      const col1Id = makeId(), col2Id = makeId(), col3Id = makeId(), col4Id = makeId()
      const a1 = makeId(), a2 = makeId(), a3 = makeId(), a4 = makeId()

      return {
        id: makeId(),
        name: 'Bug Investigation & Fix',
        description: 'Systematic approach to investigating, fixing, testing, and documenting a bug.',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        columns: [
          { id: col1Id, name: 'Investigate', order: 0 },
          { id: col2Id, name: 'Fix', order: 1 },
          { id: col3Id, name: 'Test', order: 2 },
          { id: col4Id, name: 'Document', order: 3 },
        ],
        agents: [
          {
            id: a1, columnId: col1Id, name: 'Bug Investigator',
            role: 'researcher', roleDescription: 'Investigates the bug to identify the root cause.',
            skills: [{ id: 'detected:systematic-debugging', name: 'systematic-debugging', source: 'detected' }],
            outputDefinition: 'Root cause analysis with reproduction steps',
            instructions: 'Use systematic debugging methodology. First reproduce the bug. Then isolate the root cause through binary search, logging, and code analysis. Document the exact conditions that trigger the bug.',
            position: { x: 40, y: 80 },
            subagentType: 'explore' as const, preferredModel: 'sonnet' as const,
            allowedTools: ['read' as const, 'glob' as const, 'grep' as const, 'bash' as const] as const,
          },
          {
            id: a2, columnId: col2Id, name: 'Bug Fixer',
            role: 'developer', roleDescription: 'Implements the fix based on root cause analysis.',
            skills: [],
            outputDefinition: 'Bug fix implementation with minimal changes',
            instructions: 'Based on the root cause analysis, implement the minimal fix. Avoid unnecessary refactoring. Ensure the fix addresses the root cause, not just symptoms. Add inline comments explaining why the fix works.',
            position: { x: 460, y: 80 },
            subagentType: 'general-purpose' as const, preferredModel: 'sonnet' as const,
            allowedTools: ['read' as const, 'write' as const, 'edit' as const, 'bash' as const, 'glob' as const, 'grep' as const] as const,
          },
          {
            id: a3, columnId: col3Id, name: 'Regression Tester',
            role: 'tester', roleDescription: 'Verifies the fix and ensures no regressions.',
            skills: [],
            outputDefinition: 'Test results confirming fix and no regressions',
            instructions: 'Write a regression test that catches this specific bug. Run the full test suite to verify no regressions. Test edge cases related to the fix.',
            position: { x: 880, y: 80 },
            subagentType: 'general-purpose' as const, preferredModel: 'sonnet' as const,
            allowedTools: ['read' as const, 'write' as const, 'edit' as const, 'bash' as const, 'glob' as const, 'grep' as const] as const,
          },
          {
            id: a4, columnId: col4Id, name: 'Fix Documenter',
            role: 'documenter', roleDescription: 'Documents the bug fix for the team.',
            skills: [],
            outputDefinition: 'Bug fix documentation with lessons learned',
            instructions: 'Create a brief document covering: what the bug was, root cause, fix applied, tests added, and lessons learned. This helps prevent similar bugs in the future.',
            position: { x: 1300, y: 80 },
            subagentType: 'general-purpose' as const, preferredModel: 'haiku' as const,
            allowedTools: ['read' as const, 'write' as const, 'glob' as const, 'grep' as const] as const,
          },
        ],
        connections: [
          { id: makeId(), sourceAgentId: a1, targetAgentId: a2, type: 'auto' },
          { id: makeId(), sourceAgentId: a2, targetAgentId: a3, type: 'auto' },
          { id: makeId(), sourceAgentId: a3, targetAgentId: a4, type: 'auto' },
        ],
        settings: {
          preamble: '',
          executionMode: 'parallel-columns',
          includePermissions: true,
          includeDeliverables: true,
          nativeMode: false,
        },
        metadata: { viewport: { x: 0, y: 0, zoom: 1 } }
      }
    }
  },
  {
    id: 'content-research-production',
    name: 'Content Research & Production',
    description: 'Research an industry topic, write an article, then produce a video and presentation in parallel.',
    preview: '[Researcher, Researcher] -> Writer -> Director -> [Video, Presentation]',
    create: () => {
      const col1Id = makeId(), col2Id = makeId(), col3Id = makeId(), col4Id = makeId()
      const a1 = makeId(), a2 = makeId(), a3 = makeId(), a4 = makeId(), a5 = makeId(), a6 = makeId()

      return {
        id: makeId(),
        name: 'Content Research & Production',
        description: 'Research an industry topic from multiple angles, write a comprehensive article, develop a video concept and presentation outline, then produce both the video and presentation in parallel.',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        columns: [
          { id: col1Id, name: 'Research', order: 0 },
          { id: col2Id, name: 'Writing', order: 1 },
          { id: col3Id, name: 'Creative Direction', order: 2 },
          { id: col4Id, name: 'Production', order: 3 },
        ],
        agents: [
          {
            id: a1, columnId: col1Id, name: 'Industry Research Agent',
            role: 'researcher' as const,
            roleDescription: 'Researches the target industry, analyzes scientific papers, market trends, and key developments.',
            skills: [],
            outputDefinition: 'Industry research report with key findings, statistics, and notable papers',
            instructions: 'Research the specified industry thoroughly. Look for recent scientific papers, industry reports, market data, and expert opinions. Use web search and web fetch to find authoritative sources. Summarize the most important findings with citations.',
            position: { x: 40, y: 80 },
            subagentType: 'general-purpose' as const,
            preferredModel: 'sonnet' as const,
            allowedTools: ['read' as const, 'glob' as const, 'grep' as const, 'web-search' as const, 'web-fetch' as const],
          },
          {
            id: a2, columnId: col1Id, name: 'Social Media Research Agent',
            role: 'researcher' as const,
            roleDescription: 'Researches social media trends, community discussions, and public sentiment around the topic.',
            skills: [],
            outputDefinition: 'Social media and community research report with trending topics and audience insights',
            instructions: 'Research what people are discussing on social media, forums, and community platforms about this topic. Use web search and web fetch to find trending conversations, popular opinions, pain points, and emerging themes. Identify what resonates with audiences.',
            position: { x: 40, y: 284 },
            subagentType: 'general-purpose' as const,
            preferredModel: 'sonnet' as const,
            allowedTools: ['read' as const, 'glob' as const, 'grep' as const, 'web-search' as const, 'web-fetch' as const],
          },
          {
            id: a3, columnId: col2Id, name: 'Content Writer',
            role: 'blog_post_writer' as const,
            roleDescription: 'Writes a comprehensive, engaging article based on the research, and provides a video concept idea.',
            skills: [{ id: 'detected:writing-skills', name: 'writing-skills', source: 'detected' as const }],
            outputDefinition: 'Polished article draft plus a video concept brief for accompanying visual content',
            instructions: 'Using both research reports, write a compelling long-form article that combines industry insights with social sentiment. Make it informative yet engaging. Also include a video concept brief at the end that outlines a short video idea to accompany the article.',
            position: { x: 460, y: 80 },
            subagentType: 'general-purpose' as const,
            preferredModel: 'sonnet' as const,
            allowedTools: ['read' as const, 'write' as const, 'edit' as const, 'glob' as const, 'grep' as const],
          },
          {
            id: a4, columnId: col3Id, name: 'Video Director',
            role: 'architect' as const,
            roleDescription: 'Takes the video concept and creates a detailed, engaging video outline and a PowerPoint presentation outline.',
            skills: [{ id: 'detected:remotion-best-practices', name: 'remotion-best-practices', source: 'detected' as const }],
            outputDefinition: 'Detailed video production outline with scene-by-scene breakdown, plus a PowerPoint presentation outline',
            instructions: 'Review the content writer\'s video concept brief. Expand it into a detailed, visually engaging video production outline with scene descriptions, timing, visual elements, and narration notes. Use the remotion-best-practices skill for guidance on creating effective Remotion videos. Also create a detailed outline for a PowerPoint presentation that accompanies the content.',
            position: { x: 880, y: 80 },
            subagentType: 'general-purpose' as const,
            preferredModel: 'sonnet' as const,
            allowedTools: ['read' as const, 'write' as const, 'edit' as const, 'glob' as const, 'grep' as const],
          },
          {
            id: a5, columnId: col4Id, name: 'Video Creator',
            role: 'developer' as const,
            roleDescription: 'Builds the actual Remotion video based on the Video Director\'s production outline.',
            skills: [{ id: 'detected:remotion-best-practices', name: 'remotion-best-practices', source: 'detected' as const }],
            outputDefinition: 'Complete Remotion video project with all code, assets, and render instructions',
            instructions: 'Using the Video Director\'s production outline, create the full Remotion video project. Use the remotion-best-practices skill for framework patterns and best practices. Write clean, well-structured Remotion code with proper compositions, animations, and timing.',
            position: { x: 1300, y: 80 },
            subagentType: 'general-purpose' as const,
            preferredModel: 'sonnet' as const,
            allowedTools: ['read' as const, 'write' as const, 'edit' as const, 'bash' as const, 'glob' as const, 'grep' as const] as const,
          },
          {
            id: a6, columnId: col4Id, name: 'Presentation Maker',
            role: 'powerpoint_presentation_builder' as const,
            roleDescription: 'Creates a polished PowerPoint presentation based on the Video Director\'s outline.',
            skills: [{ id: 'detected:pptx', name: 'pptx', source: 'detected' as const }],
            outputDefinition: 'Complete PowerPoint presentation file (.pptx)',
            instructions: 'Using the Video Director\'s presentation outline, create a polished, visually appealing PowerPoint presentation. Use the pptx skill to create the .pptx file. Ensure the presentation has a clear narrative flow, consistent styling, and compelling visuals.',
            position: { x: 1300, y: 284 },
            subagentType: 'general-purpose' as const,
            preferredModel: 'sonnet' as const,
            allowedTools: ['read' as const, 'write' as const, 'edit' as const, 'bash' as const, 'glob' as const, 'grep' as const] as const,
          },
        ],
        connections: [
          { id: makeId(), sourceAgentId: a1, targetAgentId: a3, type: 'auto' as const },
          { id: makeId(), sourceAgentId: a2, targetAgentId: a3, type: 'auto' as const },
          { id: makeId(), sourceAgentId: a3, targetAgentId: a4, type: 'auto' as const },
          { id: makeId(), sourceAgentId: a4, targetAgentId: a5, type: 'auto' as const },
          { id: makeId(), sourceAgentId: a4, targetAgentId: a6, type: 'auto' as const },
        ],
        settings: {
          preamble: '',
          executionMode: 'parallel-columns',
          includePermissions: true,
          includeDeliverables: true,
          nativeMode: false,
        },
        metadata: { viewport: { x: 0, y: 0, zoom: 1 } }
      }
    }
  }
]
