# Changelog

All notable changes to Opaal will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-02-19

### Added

- Skill Workshop — dedicated view for creating, editing, validating, and managing Claude Code skills
- Skill Viewer — immersive read-only modal for browsing skill documentation
- Smart skill templates — 5 category templates (Development, Documentation, Creative, Engineering, Utility) with structured SKILL.md scaffolding
- Real-time skill validation — name format, description rules, frontmatter checks
- Skill CRUD operations — create, save, duplicate, delete skills in `~/.claude/skills/`
- Execution Modal — run workflows directly via Claude SDK integration
- Claude SDK integration for workflow execution
- Workshop navigation via title bar wrench button and home screen card
- Context-aware Ctrl+S — saves skill in workshop view, workflow on canvas

### Changed

- AppView system extended to support 3 views: home, canvas, workshop
- Keyboard shortcuts now context-aware based on active view

### Fixed

- Security: path validation on all skill write operations (restricted to `~/.claude/skills/`)
- Read-only protection for package-managed skills in `~/.claude/settings/skills/`

## [1.0.0] - 2026-02-16

### Added

- Visual workflow canvas with drag-and-drop agent cards (React Flow)
- 7 agent roles: Researcher, Architect, Developer, Reviewer, Tester, Documenter, Custom
- Column-based phases representing sequential execution stages
- Smart auto-connections between agents in adjacent columns
- Manual wire drawing with gradient-colored edges
- Live prompt preview with word count
- 3 starter templates: Code Review, Feature Build, Bug Investigation
- Skills auto-detection from ~/.claude/skills directory
- Drag-and-drop skills onto agent cards
- Save/load .opaal workflow files
- Export prompts to clipboard or CLAUDE.md file
- Dark and light theme with Linear-inspired design system
- Full keyboard shortcuts (see SETUP.md)
- Undo/redo with 50 levels of history
- Multi-select with Shift+click and marquee selection
- RTS-style control groups (Ctrl+1-9 save, 1-9 recall)
- Right-click context menus for canvas and nodes
- Copy/paste/duplicate agents with connections preserved
- Agent palette with categorized role templates
- Workflow settings: preamble, execution mode, permissions, deliverables, custom suffix
- Framer Motion animations throughout the interface
