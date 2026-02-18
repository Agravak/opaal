# Opaal - Setup Instructions

A visual multi-agent workflow designer for Claude Code and other agentic AI platforms. Design agent pipelines graphically and generate production-ready prompts.

---

## Prerequisites

- **Node.js** 18 or higher (includes npm)
- **Windows 10/11** (built as an Electron desktop app)

Check your Node version:
```bash
node --version
```

---

## Quick Start

1. Open a terminal in the project folder:
   ```bash
   cd path/to/opaal
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the app in development mode:
   ```bash
   npm run dev
   ```

The app window will open automatically. If not, check the terminal for errors.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Launch the app in development mode with hot reload |
| `npm run build` | Build all code (main, preload, renderer) for production |
| `npm run start` | Preview the production build |
| `npm run build:win` | Build + package as a Windows portable exe |
| `npm run build:unpack` | Build + package as an unpacked directory |

---

## What You Can Do

### Design Agent Workflows
- Click **Add Phase** to create columns (execution stages)
- Click **Add Agent** to add agents with roles (Researcher, Architect, Developer, Reviewer, Tester, Documenter)
- Agents in the same column run in parallel

### Start From Templates
When the canvas is empty, choose from 3 starter templates:
- **Code Review Pipeline** - Analyze, review, document
- **Feature Build** - Research, design, build + test in parallel, validate
- **Bug Investigation & Fix** - Investigate, fix, test, document

### Configure Agents
- Click any agent card to open the Config panel
- Set name, role, description, output definition, and instructions
- Assign skills from the detected skills library

### Auto-Connections
- Agents in adjacent columns are automatically connected (dashed lines)
- Drag between connection handles to create manual wires (solid colored lines)
- Manual connections override auto-connections

### Generate Prompts
- Click the **Prompt** tab in the sidebar to see the live-generated prompt
- Click **Copy** to copy to clipboard
- Click **Export** to save as a CLAUDE.md file

### Save & Load
- **Ctrl+S** saves your workflow as a `.opaal` file
- **Ctrl+O** opens a saved workflow file
- The title bar shows unsaved changes (amber dot)

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save workflow |
| `Ctrl+O` | Open workflow |
| `Ctrl+E` | Export prompt as file |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Delete` | Remove selected agent |
| `Escape` | Deselect current agent |

---

## Project Structure

```
src/
  main/           Electron main process (window, IPC, file dialogs, skills scanner)
  preload/        Context bridge (exposes APIs to renderer)
  renderer/src/   React app (canvas, sidebar, stores, prompt generation)
    components/   UI components (canvas, nodes, sidebar, layout)
    stores/       Zustand state (workflow, UI, skills)
    lib/          Core logic (prompt generator, auto-connect, templates)
    hooks/        React hooks (keyboard shortcuts)
    styles/       Tailwind CSS + design tokens
    types/        TypeScript interfaces
```

---

## Troubleshooting

### `npm install` fails with native module errors
Run the native module rebuild manually:
```bash
npx electron-builder install-app-deps
```

### App window doesn't appear
Make sure no other process is using port 5173. Kill any existing dev servers and try again.

### Electron crashes on launch
Delete the `out/` folder and rebuild:
```bash
rm -rf out/
npm run dev
```

### Skills not detected
Skills are scanned from `~/.claude/skills`. If that directory doesn't exist or is empty, the app shows fallback skills. Install Claude skills with:
```bash
npx skills add <owner/repo@skill> -g -y
```

### Theme looks wrong
The app defaults to dark mode. Toggle with the sun/moon icon in the top-right of the title bar.

### "no signing info identified, signing is skipped" during build
This is expected. The app is not code-signed, so electron-builder skips the signing step. The built portable exe works correctly without signing.
