Opaal - Visual Multi-Agent Workflow Designer
Context
Building prompts that orchestrate multiple AI agents in Claude Code is powerful but complex. Users currently write long, detailed prompts by hand to coordinate agent teams. Opaal solves this by providing a visual, drag-and-drop workflow designer that generates perfectly structured prompts automatically. Users design their multi-agent pipeline graphically (left-to-right flow with parallel columns) and get a production-ready prompt they can paste into Claude Code.

Problem: Writing multi-agent orchestration prompts is tedious, error-prone, and requires expertise
Solution: A stunning Electron desktop app where anyone can visually design agent workflows and export them as prompts
Audience: Any Claude Code user (public product)

Pre-Implementation: Install Skills
Before starting, install the frontend-design skill:


npx skills add anthropics/skills@frontend-design -g -y
Design Decisions (User-Validated)
Decision	Choice
Platform	Electron Desktop App
Audience	Public product (any Claude Code user)
Output	Generate prompt only (no CLI execution)
Aesthetic	Clean minimal (Linear/Notion-style), light/dark mode
Layout	Canvas on left (primary), sidebar on right
Agent cards	Name + role badge + skill chips + output definition + connection handles
Skills	Auto-detect from ~/.claude/skills + manual add
Templates	2-3 starter templates (code-review, feature-build, bug-fix)
Connections	Smart hybrid: auto-connect by column default, manual wire override
Prompt format	Both clipboard markdown AND CLAUDE.md file export
Prompt preview	Live split-view (canvas left, Monaco editor right, real-time updates)
Persistence	Save/load .opaal files locally + export for sharing
Tech Stack
Electron + React 18 + TypeScript - App shell
electron-vite - Fast dev server and builds
React Flow (@xyflow/react) - Canvas with zoom, pan, drag, connections, minimap
Tailwind CSS v4 - Linear-style clean aesthetic
Framer Motion - Buttery smooth animations
Monaco Editor (@monaco-editor/react) - Prompt preview with syntax highlighting
Zustand - Lightweight state management
electron-store - Persisting settings and recent files
Project Structure

opaal/
├── package.json
├── electron.vite.config.ts
├── tsconfig.json / tsconfig.node.json / tsconfig.web.json
├── tailwind.config.ts
├── postcss.config.js
├── resources/icon.png
│
├── src/
│   ├── main/                           # Electron main process
│   │   ├── index.ts                    # Window creation (frameless, custom titlebar)
│   │   ├── ipc-handlers.ts            # IPC channel handlers
│   │   ├── file-operations.ts         # .opaal file save/load/export
│   │   └── skills-scanner.ts          # Scan ~/.claude/skills directory
│   │
│   ├── preload/
│   │   ├── index.ts                    # contextBridge.exposeInMainWorld
│   │   └── index.d.ts
│   │
│   └── renderer/src/
│       ├── main.tsx                    # React root
│       ├── App.tsx                     # Root layout
│       │
│       ├── types/
│       │   ├── workflow.ts             # Core data model (Workflow, AgentNode, Connection, Column)
│       │   ├── skills.ts              # Skill types
│       │   └── prompt.ts             # Prompt generation types
│       │
│       ├── stores/
│       │   ├── workflow-store.ts       # Agents, columns, connections CRUD
│       │   ├── ui-store.ts            # Theme, sidebar state, selection
│       │   ├── skills-store.ts        # Skills registry
│       │   └── history-store.ts       # Undo/redo
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppShell.tsx        # CSS Grid: [titlebar | canvas+sidebar | statusbar]
│       │   │   ├── TitleBar.tsx        # Custom frameless title bar
│       │   │   └── StatusBar.tsx       # Agent count, save status
│       │   │
│       │   ├── canvas/
│       │   │   ├── WorkflowCanvas.tsx  # React Flow wrapper
│       │   │   ├── CanvasControls.tsx  # Add column, add agent toolbar
│       │   │   ├── ColumnHeader.tsx    # Phase/stage labels
│       │   │   └── ConnectionLine.tsx  # Custom edge styling
│       │   │
│       │   ├── nodes/
│       │   │   ├── AgentNode.tsx       # Custom React Flow node (the card)
│       │   │   ├── AgentNodeHeader.tsx # Name + colored role badge
│       │   │   ├── SkillChips.tsx     # Pill-shaped skill tags
│       │   │   └── OutputBadge.tsx    # Output definition display
│       │   │
│       │   ├── sidebar/
│       │   │   ├── RightSidebar.tsx    # Contextual sidebar container
│       │   │   ├── ToolboxPanel.tsx    # Agent templates + skills library
│       │   │   ├── AgentConfigPanel.tsx # Full agent editor
│       │   │   ├── SkillsLibrary.tsx  # Draggable skills list
│       │   │   └── TemplatesPanel.tsx # Starter workflow templates
│       │   │
│       │   ├── prompt/
│       │   │   ├── PromptPreview.tsx   # Split-view with Monaco
│       │   │   ├── PromptToolbar.tsx   # Copy/export buttons
│       │   │   └── MonacoWrapper.tsx  # Monaco editor integration
│       │   │
│       │   └── shared/
│       │       ├── Button.tsx, Badge.tsx, Input.tsx, Dropdown.tsx, Tooltip.tsx
│       │       └── ThemeToggle.tsx
│       │
│       ├── hooks/
│       │   ├── useWorkflow.ts          # Workflow manipulation helpers
│       │   ├── usePromptGenerator.ts   # Live prompt generation (debounced)
│       │   ├── useSkills.ts           # Skills scanning + management
│       │   ├── useFileOps.ts          # Save/load via IPC
│       │   └── useKeyboard.ts         # Keyboard shortcuts
│       │
│       ├── lib/
│       │   ├── prompt-generator.ts     # Core prompt generation algorithm
│       │   ├── graph-traversal.ts     # Topological sort, column ordering
│       │   ├── auto-connect.ts        # Smart hybrid connection logic
│       │   ├── workflow-validator.ts   # Validate completeness
│       │   ├── export-formatter.ts    # Clipboard/CLAUDE.md formatting
│       │   └── template-loader.ts     # Load starter templates
│       │
│       ├── styles/
│       │   ├── globals.css            # Tailwind + CSS variables (Linear design tokens)
│       │   ├── react-flow.css         # React Flow theme overrides
│       │   └── monaco.css             # Monaco theme
│       │
│       └── templates/
│           ├── code-review.json
│           ├── feature-build.json
│           └── bug-fix.json
Core Data Model
types/workflow.ts - Key interfaces:


interface Workflow {
  id: string; name: string; description: string; version: string;
  columns: Column[];         // Ordered phases (left-to-right)
  agents: AgentNode[];       // All agent definitions
  connections: Connection[]; // Wires between agents
  settings: WorkflowSettings;
}

interface Column { id: string; name: string; order: number; color?: string; }

interface AgentNode {
  id: string; columnId: string; name: string;
  role: 'architect'|'developer'|'reviewer'|'tester'|'documenter'|'researcher'|'custom';
  roleDescription: string;
  skills: SkillReference[];    // Assigned skill names
  outputDefinition: string;    // What this agent produces
  instructions: string;        // Detailed instructions
  position: { x: number; y: number };
}

interface Connection {
  id: string; sourceAgentId: string; targetAgentId: string;
  type: 'auto' | 'manual';    // Auto = column-based, Manual = user-drawn
  dataDescription?: string;    // What data flows through
}

interface WorkflowSettings {
  preamble: string; executionMode: 'sequential'|'parallel-columns';
  includePermissions: boolean; includeDeliverables: boolean; customSuffix?: string;
}
Prompt Generation Algorithm
lib/prompt-generator.ts - Pure function: Workflow -> GeneratedPrompt

Preamble: "You are coordinating a multi-agent workflow called '{name}'..."
Agent Definitions (sorted by column order, then vertical position):
Each agent becomes a natural-language section with role, skills, inputs (from connections), outputs, and instructions
Reads like a project manager's brief, NOT a config file
Execution Order: "Phase 1 (parallel): Agent A, Agent B. Phase 2 (after Phase 1): Agent C..."
Data Flow: "Agent A's output feeds into Agent C: market research report"
Permissions (optional): Aggregated upfront so user can approve once
Deliverables: Summary of all expected outputs
Custom suffix (optional): User's additional instructions
The prompt updates live via usePromptGenerator hook (debounced 300ms).

Implementation Phases
Phase 1: Scaffold + Stunning Empty Canvas (Days 1-3)
Build: Electron shell, React app, Tailwind theme with Linear-style CSS variables, React Flow canvas with zoom/pan/minimap, custom frameless title bar, dark/light mode toggle, status bar

Key files: package.json, electron.vite.config.ts, tailwind.config.ts, src/main/index.ts, src/renderer/src/styles/globals.css, AppShell.tsx, WorkflowCanvas.tsx, TitleBar.tsx, ThemeToggle.tsx, ui-store.ts

Steps:

Scaffold with npm create @quick-start/electron@latest . -- --template react-ts
Install deps: @xyflow/react, zustand, @monaco-editor/react, framer-motion, electron-store, tailwindcss
Configure Tailwind with Linear-inspired design tokens (near-black surfaces, indigo accent, Inter font)
Build frameless Electron window with titleBarOverlay for Windows
Build AppShell with CSS Grid: grid-rows-[40px_1fr_28px], main area: grid-cols-[1fr_320px]
Mount React Flow with dot-grid background, minimap, controls
Build theme toggle persisting to localStorage
User can: Launch a gorgeous dark-themed app, zoom/pan the canvas, toggle light/dark mode

Phase 2: Agent Cards + Columns (Days 4-7)
Build: Custom React Flow node component (the agent card), column system, add/drag/select/rename cards, role badges, skill chips, output display

Key files: types/workflow.ts, workflow-store.ts, AgentNode.tsx, AgentNodeHeader.tsx, SkillChips.tsx, OutputBadge.tsx, ColumnHeader.tsx, CanvasControls.tsx

User can: Add agent cards, drag them between columns, double-click to rename, see colored role badges and placeholder skill chips

Phase 3: Right Sidebar + Agent Config (Days 8-11)
Build: Contextual right sidebar (toolbox by default, config when card selected), full agent editor (role dropdown, description, skills, output, instructions), Framer Motion transitions

Key files: RightSidebar.tsx, ToolboxPanel.tsx, AgentConfigPanel.tsx, shared components (Button.tsx, Badge.tsx, Input.tsx, Dropdown.tsx)

User can: Click a card to configure it in the sidebar, see live updates on the canvas card, use the toolbox to browse agent templates

Phase 4: Connections + Smart Hybrid Wiring (Days 12-15)
Build: Auto-connections by column order (dashed lines), manual wire override by dragging handle-to-handle (solid lines), connection labels, custom edge styling

Key files: auto-connect.ts, graph-traversal.ts, ConnectionLine.tsx, workflow-store.ts (connection CRUD)

Visual distinction: Auto = dashed, gray, 40% opacity. Manual = solid, gradient from source to target role color, 80% opacity

User can: See automatic flow between columns, override with manual wires, add labels describing data flow

Phase 5: Skills Integration (Days 16-18)
Build: Skills scanner (reads ~/.claude/skills via IPC), skills library in sidebar, drag-drop skills onto cards, manual skill creation

Key files: src/main/skills-scanner.ts, src/main/ipc-handlers.ts, skills-store.ts, SkillsLibrary.tsx, useSkills.ts

User can: See auto-detected skills from their Claude installation, drag skills onto agent cards, add custom skills manually

Phase 6: Prompt Engine + Live Preview (Days 19-23)
Build: Prompt generation algorithm, Monaco editor integration, live split-view (canvas left, prompt right), clipboard copy, CLAUDE.md export

Key files: prompt-generator.ts, export-formatter.ts, PromptPreview.tsx, PromptToolbar.tsx, MonacoWrapper.tsx, usePromptGenerator.ts

The "wow" moment: User sees the prompt materializing in real-time as they build the workflow visually. Changed sections flash with a subtle highlight.

User can: Toggle split-view, see live-updating prompt, copy to clipboard, export as CLAUDE.md

Phase 7: File Persistence + Templates (Days 24-27)
Build: Save/load .opaal files (Electron dialog), recent files list, 3 starter templates, new workflow from template, unsaved changes indicator

Key files: src/main/file-operations.ts, useFileOps.ts, SavedWorkflows.tsx, TemplatesPanel.tsx, templates/*.json, template-loader.ts

User can: Ctrl+S to save, Ctrl+O to load, start from templates, share .opaal files

Phase 8: Polish, Shortcuts, Undo/Redo (Days 28-32)
Build: Undo/redo (Ctrl+Z/Ctrl+Shift+Z), keyboard shortcuts (Delete, Ctrl+D duplicate), Framer Motion animations on all interactions, settings modal, workflow validator warnings, final visual polish

Key files: history-store.ts, useKeyboard.ts, SettingsModal.tsx, workflow-validator.ts

User can: Full keyboard-driven workflow, undo any mistake, polished animations everywhere

Design System: Linear Aesthetic
CSS Variables (in globals.css):

Dark mode: warm near-blacks (#0f0f14 surface, #0a0a10 canvas) - never pure #000
Light mode: warm off-whites (#f8f9fa, #f1f3f5) - never pure #fff
Single accent: indigo (#818cf8 dark / #6366f1 light)
Borders over shadows (thin, low-contrast: #1f1f2e dark, #e2e4e9 light)
Typography hierarchy via weight + opacity, not size (12-14px range, font-weight 400/500/600)
Animations (Framer Motion):

Card appear: scale 0.96->1, opacity 0->1, 200ms, ease [0.25, 0.46, 0.45, 0.94]
Sidebar switch: AnimatePresence mode="wait", opacity + x: 8px -> 0, 150ms
Button hover: whileHover scale 1.02, whileTap scale 0.98
Agent Card styling:

280px wide, bg-surface-elevated, border-border-subtle, rounded-[8px]
Selected: border-2 border-accent shadow-[0_0_20px_rgba(99,102,241,0.15)]
Role badge: colored bg/text/border per role type (blue=architect, green=developer, purple=reviewer, etc.)
Skill chips: rounded-full, text-[11px], bg-surface-tertiary
Key UX Interactions
Creating an agent: Click "+" or drag from sidebar -> card appears with scale+fade animation -> auto-selected -> name enters edit mode -> auto-connections drawn
Configuring an agent: Click card -> sidebar transitions to Config (Framer Motion slide) -> edit fields -> live updates on canvas card
Drawing manual connections: Drag from output handle -> bezier curve follows cursor -> valid targets pulse -> drop to connect -> solid line replaces dashed auto-connection
Viewing prompt preview: Click Prompt tab -> sidebar expands to 50% width -> Monaco editor shows live prompt -> changes flash with highlight -> copy/export buttons in toolbar
Save/Load: Ctrl+S -> save dialog (or silent overwrite) -> toast "Saved" -> title bar shows filename; Ctrl+O -> load dialog -> canvas clears + staggered card animations
Verification Plan
Per-Phase Checks
Phase 1: npm run dev launches Electron, canvas zooms/pans, theme toggles, no console errors
Phase 2: Add 3+ agents across 2 columns, drag to reposition, double-click to rename
Phase 3: Click agent -> sidebar shows config -> edit role -> card updates live
Phase 4: See auto-connections between columns, draw manual wire, connection labels work
Phase 5: Skills appear from ~/.claude/skills, drag onto card, manual add works
Phase 6: Build a 3-column workflow -> prompt preview shows correct structure -> copy to clipboard -> paste is valid
Phase 7: Save workflow -> close app -> reopen -> load workflow -> everything restored
Phase 8: Ctrl+Z undoes last action, Delete removes selection, all animations smooth