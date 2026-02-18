# Opaal Launch Playbook

Your step-by-step guide to launching Opaal as open source and maximizing developer downloads. Check off each item as you complete it.

---

## Trademark & Legal Reminders

Before launch, keep these guidelines in mind for all marketing copy:

- **Use descriptive language**: Say "for use with Claude Code and similar AI launchers" or "works with Claude Code", not "Claude Code tool" or "the Claude Code workflow designer"
- **Never imply endorsement**: Do not suggest partnership, sponsorship, or official status with Anthropic
- **Do not use Anthropic's logo or branding** in Opaal's marketing materials
- **Include disclaimer**: The README already contains a non-affiliation disclaimer — keep it visible
- **Consider contacting Anthropic**: A courtesy email before launch describing Opaal and asking for trademark guidance is recommended (see template at the bottom of this document)

---

## Pre-Launch Checklist

### 1. App icon — DONE

- [x] `resources/icon.png` already exists (purple diamond/gem with circuit-node details)
- No action needed unless you want a different design
- If you want to change it:
  - **Option A**: Ask Claude to use the `imagegen` skill to generate a new concept, then save as `resources/icon.png`
  - **Option B**: Design in Figma/Canva, export as PNG (at least 512x512px), save as `resources/icon.png`
- Electron-builder uses this file automatically for the Windows app icon

---

### 2. Take a hero screenshot (1200x630) — `You do this`

> Claude cannot take screenshots of your running app.

1. Run the app: `npm run dev`
2. Make sure **dark mode** is active (toggle in the title bar if needed)
3. Load a starter template (e.g., Feature Build) so the canvas has agents and connections visible
4. Resize the window to roughly a 1200x630 aspect ratio (wide rectangle)
5. Take the screenshot:
   - **Windows Snipping Tool**: Press `Win + Shift + S`, drag to select the app window
   - **Or** press `Alt + PrtSc` to capture the active window
6. Open the screenshot in Paint (or any image editor)
7. Resize to exactly **1200 x 630 pixels** (standard Open Graph / social preview size)
   - In Paint: Image > Resize > select Pixels > uncheck "Maintain aspect ratio" > set 1200x630
8. Save as `docs/screenshot.png` in the project folder (create the `docs/` folder first if it doesn't exist)

**Tips for a great screenshot:**
- Show 3-4 agent cards with connections between them
- Have the prompt preview panel visible on the right if possible
- Avoid any personal info in the title bar

---

### 3. Record a demo GIF (30-60 sec) — `You do this`

> Claude cannot record your screen.

1. **Install a GIF recorder** (pick one):
   - **ScreenToGif** (recommended, free, Windows) — download from `screentogif.com`
   - **ShareX** (free, Windows) — download from `getsharex.com`
   - **LICEcap** (free, simple) — download from `cockos.com/licecap`
2. Run your app: `npm run dev`
3. Set up the recorder to capture just the app window
4. **Record this sequence** (aim for 30-60 seconds):
   - Start with an empty canvas
   - Click a template (e.g., "Feature Build") to load it
   - Click on one agent card to show the sidebar config panel
   - Change a field (like the agent name or role) — show the card updating live
   - Toggle to the prompt preview — show the prompt updating in real-time
   - Click the "Copy to Clipboard" button
5. Stop recording and save as `docs/demo.gif`
6. **Optimize the GIF size** (important — large GIFs won't load on GitHub/Reddit):
   - In ScreenToGif: Use the built-in editor to trim frames, set to 10-15 FPS
   - Target **under 10MB** (under 5MB is ideal)
   - If too large: reduce resolution to 800px wide or lower FPS

---

### 4. Update GitHub URLs in package.json and README.md — `Claude can do this`

> Ask Claude: "Update the GitHub URLs from Opaal/opaal to Agravak/opaal"

**What gets changed:**
- `package.json` — 3 URLs: homepage, repository, bugs (lines 8, 11, 14)
- `README.md` — 8 URLs: badges, download links, clone command

All instances of `Opaal/opaal` become `Agravak/opaal`.

---

### 5. Run `npm run build` and verify it succeeds — `Claude can do this`

> Ask Claude: "Run npm run build and check for errors"

What this does:
- Runs `electron-vite build` which compiles TypeScript and bundles the Electron app
- Output goes to the `out/` directory
- **Success** = no red errors in the terminal output
- If it fails, Claude will debug the errors

---

### 6. Run `npm run build:win` and test the portable exe — `Claude builds, you test`

1. **Claude runs**: `npm run build:win`
   - This runs `electron-vite build` then `electron-builder --win`
   - Creates a portable exe in the `dist/` folder (e.g., `Opaal 1.0.0.exe`)
2. **You test**: Navigate to the `dist/` folder and double-click the portable `.exe`
   - Verify the app launches correctly (no install needed — it's portable)
   - Test basic functionality: add an agent, load a template, check prompt preview

> **Note:** We use a portable exe instead of an NSIS installer because unsigned NSIS installers are silently blocked by Windows SmartScreen. The portable exe works without issues. Code signing ($200-400/year certificate) would be needed to distribute an installer.

---

### 7. Initialize git — `Claude can do this`

> Ask Claude: "Initialize git for this project"

What Claude will run:
```bash
git init
git branch -m main
```

This creates a new git repository and renames the default branch to `main` (the modern standard).

---

### 8. First commit — `Claude can do this`

> Ask Claude: "Create the initial commit"

What Claude will run:
```bash
git add -A
git commit -m "Initial commit: Opaal v1.0.0"
```

Claude will first verify there's a `.gitignore` that excludes `node_modules/`, `dist/`, `out/`, and other build artifacts so we don't commit hundreds of MB of dependencies.

---

### 9. Create GitHub repo — `You do this (gh CLI not installed)`

You have two options:

**Option A: Install GitHub CLI first (recommended for later steps too)**
1. Open PowerShell **as Administrator**
2. Run: `winget install --id GitHub.cli`
3. Close and reopen your terminal
4. Authenticate: run `gh auth login`
   - Select **GitHub.com**
   - Select **HTTPS**
   - Select **Login with a web browser**
   - Copy the one-time code shown in terminal, press Enter
   - A browser window opens — paste the code and authorize the app
5. Now run: `gh repo create opaal --public --description "Visual multi-agent workflow designer for use with Claude Code and other agentic AI platforms"`

**Option B: Create the repo manually on GitHub.com**
1. Go to [github.com/new](https://github.com/new)
2. Repository name: `opaal`
3. Description: `Visual multi-agent workflow designer for use with Claude Code and other agentic AI platforms`
4. Select **Public**
5. Do **NOT** check "Add a README file" (you already have one)
6. Do **NOT** add .gitignore or license (you already have these)
7. Click **Create repository**

---

### 10. Push to GitHub — `Claude can do this (after step 9)`

> After you create the repo, ask Claude: "Push to GitHub"

What Claude will run:
```bash
git remote add origin https://github.com/Agravak/opaal.git
git push -u origin main
```

**If git asks for credentials:**
- If you installed `gh` CLI: run `gh auth setup-git` first (sets up credential helper automatically)
- Otherwise: use a **Personal Access Token (PAT)** instead of your password
  - Go to GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
  - Generate a new token with `repo` scope
  - Use this token as the password when git prompts you

---

### 11. Upload social preview image on GitHub — `You do this`

> This can only be done through the GitHub web interface.

1. Go to your repo: `github.com/Agravak/opaal`
2. Click **Settings** (gear icon, top right of the repo page)
3. Scroll down to the **Social preview** section
4. Click **Edit** > **Upload an image**
5. Upload the 1200x630 hero screenshot you took in step 2
6. Click **Save**

This image appears whenever someone shares your repo link on Twitter, Discord, Slack, LinkedIn, etc.

---

### 12. Add topics to the GitHub repo — `You do this (or Claude with gh)`

**If `gh` CLI is installed**, ask Claude to run:
```bash
gh repo edit --add-topic claude-code,ai-agents,workflow-designer,electron,react,typescript,prompt-engineering
```

**If doing manually:**
1. Go to your repo on GitHub
2. Click the **gear icon** next to "About" (right side of the repo page, near the top)
3. In the **Topics** field, type each topic and press Enter after each:
   - `claude-code`
   - `ai-agents`
   - `workflow-designer`
   - `electron`
   - `react`
   - `typescript`
   - `prompt-engineering`
4. Click **Save changes**

Topics help people discover your repo through GitHub search and topic pages.

---

### 13. Enable GitHub Discussions — `You do this`

> This can only be done through the GitHub web interface.

1. Go to your repo on GitHub
2. Click **Settings**
3. Scroll down to the **Features** section
4. Check the box next to **Discussions**
5. Done — a new "Discussions" tab will appear on your repo

This gives your community a place to ask questions, share workflows, and suggest features without cluttering the Issues tab.

---

### 14. Tag release and push — `Claude can do this`

> Ask Claude: "Tag v1.0.0 and push the tag"

What Claude will run:
```bash
git tag -a v1.0.0 -m "v1.0.0"
git push origin v1.0.0
```

This creates an annotated git tag marking version 1.0.0 and pushes it to GitHub. If you have a GitHub Actions CI workflow set up, pushing a tag can trigger automatic release builds.

---

### 15. Verify release builds on GitHub Releases — `You do this`

1. Go to your repo on GitHub
2. Click **Releases** (in the right sidebar, or under the "Code" tab)
3. You should see `v1.0.0` listed
4. **If you have GitHub Actions set up** for release builds:
   - Wait for the workflow to complete
   - Verify release files (`.exe`, `.dmg`, `.AppImage`) appear as release assets
5. **If you do NOT have GitHub Actions** for releases:
   - Click **Draft a new release** (or **Edit** on v1.0.0 if it already exists)
   - Select the `v1.0.0` tag from the dropdown
   - Title: `Opaal v1.0.0`
   - Description: paste the key features from the README
   - **Attach binaries**: Drag and drop your built files from the `dist/` folder into the upload area
   - Click **Publish release**

---

### 16. Create 5-10 good first issue tickets — `Claude can do this (if gh is installed)`

**If `gh` CLI is installed and authenticated**, ask Claude: "Create the good first issue tickets from the playbook"

Claude will run commands like:
```bash
gh issue create --title "Add ESLint + Prettier configuration" --label "good first issue" --body "..."
```

**If doing manually:**
1. Go to your repo > **Issues** tab > **New issue**
2. For each issue below, create it with a descriptive title and body
3. Add the `good first issue` label (you may need to create this label first: Issues > Labels > New label)

**Issues to create:**
1. Add ESLint + Prettier configuration — TypeScript rules and formatting
2. Implement Monaco Editor for prompt preview — @monaco-editor/react is installed but unused
3. Add toast notifications for save/export — Brief confirmation messages
4. Add agent count per phase in column headers — Show "Phase 1 (3 agents)"
5. Add Select All shortcut (Ctrl+A) — Select all agents on canvas
6. Support connection data descriptions in UI — dataDescription field has no editor
7. Add New Workflow option and shortcut (Ctrl+N) — Clear canvas and start fresh
8. Reorder columns by dragging headers — Drag left/right to reorder phases

---

### Quick Reference: Who Does What

| Step | Who | Notes |
|------|-----|-------|
| 1. App icon | **DONE** | Already exists |
| 2. Hero screenshot | **You** | Run app + screen capture |
| 3. Demo GIF | **You** | Run app + screen recording |
| 4. Update GitHub URLs | **Claude** | `Opaal/opaal` -> `Agravak/opaal` |
| 5. `npm run build` | **Claude** | Run + verify |
| 6. `npm run build:win` | **Claude builds**, you test | Test the portable exe |
| 7. `git init` | **Claude** | |
| 8. First commit | **Claude** | Checks .gitignore first |
| 9. Create GitHub repo | **You** | gh CLI or github.com/new |
| 10. Push to GitHub | **Claude** | After repo exists |
| 11. Social preview | **You** | GitHub web UI only |
| 12. Add topics | **You** or Claude with gh | |
| 13. Enable Discussions | **You** | GitHub Settings UI |
| 14. Tag release | **Claude** | |
| 15. Verify releases | **You** | May need manual upload |
| 16. Create issues | **Claude** with gh, or you manually | |

---

## Platform 1: Hacker News

**When**: Launch day, Tuesday or Wednesday, 8-10 AM EST
**URL**: https://news.ycombinator.com/submit

**Title**: Show HN: Opaal - Visual multi-agent workflow designer for Claude Code and agentic AI

**URL**: Your GitHub repo URL

**Immediately post a comment** (critical for Show HN success):

> Hi HN! I built Opaal because writing multi-agent orchestration prompts was becoming tedious and error-prone. Every time I wanted to coordinate 3-5 AI agents on a complex task, I would spend 20+ minutes crafting the prompt by hand.
>
> Opaal lets you design these workflows visually instead. You drag agent cards onto a canvas, organize them into phases (columns), draw connections between them, and the app generates a production-ready prompt automatically. The prompt updates live as you build.
>
> Built with Electron + React + React Flow + Zustand + Tailwind CSS v4.
>
> Key features:
> - 15 agent roles (Researcher, Architect, Developer, Reviewer, etc.)
> - Smart auto-connections between adjacent phases
> - Manual wiring for custom data flow
> - 3 starter templates (Code Review, Feature Build, Bug Fix)
> - Auto-detects installed Claude Code skills
> - Save/load .opaal files, export to CLAUDE.md
> - Full keyboard shortcuts, undo/redo, multi-select
>
> MIT licensed. Would love feedback on what features would make this more useful for your workflows.

**Tips**:
- Do NOT ask friends to upvote (HN detects and penalizes this)
- Respond to every comment within the first 2 hours
- Be honest about limitations

---

## Platform 2: Reddit r/ClaudeAI

**When**: Same day as HN, shortly after
**URL**: https://www.reddit.com/r/ClaudeAI/submit

**Title**: I built Opaal - a visual drag-and-drop designer for multi-agent AI workflows (works with Claude Code) [Open Source]

**Body**:

> Writing multi-agent orchestration prompts is powerful but complex. I kept spending 20+ minutes hand-crafting prompts to coordinate agent teams.
>
> So I built Opaal - a desktop app where you design agent workflows visually and it generates the prompt automatically.
>
> [EMBED YOUR DEMO GIF HERE]
>
> **What it does:**
> - Drag agent cards onto a canvas, organize into phases
> - Configure roles, skills, instructions, and expected outputs
> - Draw connections to define data flow between agents
> - See the prompt update live as you build
> - Export to clipboard or CLAUDE.md file
>
> **Built with:** Electron + React + React Flow + TypeScript + Tailwind CSS + Zustand
>
> **15 agent roles** including Researcher, Architect, Developer, Reviewer, Tester, Documenter, Blog Writer, SEO Optimizer, and more.
>
> **3 starter templates:** Code Review Pipeline, Feature Build, Bug Investigation
>
> MIT licensed, open source: [YOUR GITHUB URL]
>
> Would love feedback! What agent workflows do you use most?

**Tips**:
- Inline the demo GIF - Reddit posts with media get 3x more engagement
- Ask a question at the end to encourage comments
- Respond to every comment

---

## Platform 3: Reddit r/programming

**When**: Same day, stagger by 1-2 hours from r/ClaudeAI
**URL**: https://www.reddit.com/r/programming/submit

**Title**: Opaal: Open-source visual workflow designer built with Electron + React Flow for AI agent orchestration

**Body**:

> I built a desktop app for visually designing multi-agent AI workflows. The interesting technical bits:
>
> - React Flow (@xyflow/react) for the canvas - handles zoom, pan, drag, connections, minimap
> - Zustand for state management - entire workflow state in a single store with 50-level undo/redo
> - Custom prompt generation engine with topological sorting of the agent graph
> - Smart auto-connections: agents in adjacent columns connect automatically, with manual wire override
> - Tailwind CSS v4 with a Linear-inspired design system
> - Framer Motion for all animations
> - Electron + electron-vite for the desktop shell
>
> [DEMO GIF]
>
> MIT licensed: [YOUR GITHUB URL]
>
> The prompt generator traverses the workflow graph, groups agents by execution phase, and generates natural language that reads like a project brief rather than a config file.

**Tips**:
- Lead with the technical implementation, not the AI angle
- r/programming appreciates architecture discussions
- Be ready for "why not a web app?" questions

---

## Platform 4: Twitter/X

**When**: Same day, morning
**URL**: https://twitter.com/compose/tweet

**Tweet 1:**

> Just open-sourced Opaal - a visual workflow designer for multi-agent AI pipelines. Works with Claude Code and other agentic AI launchers.
>
> Drag agents, draw connections, export production-ready prompts. No more writing orchestration prompts by hand.
>
> [ATTACH DEMO GIF]
>
> github.com/YOUR_USERNAME/opaal
>
> #OpenSource #AI #DeveloperTools

**Tweet 2 (reply to yourself):**

> Built with Electron + React 18, React Flow for the canvas, Zustand for state, Tailwind CSS v4, Framer Motion.
>
> 15 agent roles, 3 starter templates, auto-connections, live prompt preview, keyboard shortcuts, undo/redo.
>
> MIT licensed - contributions welcome!

**Tweet 3 (reply):**

> The wow moment: you build a workflow visually and watch the prompt materialize in real-time. Changes flash as you drag, connect, and configure agents.

**Tips**:
- Consider tagging @xyaborstudio (React Flow creators) - only tag @AnthropicAI if you've received their permission first
- Demo GIF as the main media - video autoplay gets the most engagement
- Post during US morning hours (9-11 AM EST)
- Pin the tweet to your profile

---

## Platform 5: LinkedIn

**When**: Same day or next morning

**Post**:

> Excited to open source Opaal - a visual multi-agent workflow designer for Claude Code and other agentic AI platforms.
>
> The problem: Coordinating multiple AI agents on complex tasks requires writing detailed orchestration prompts by hand. It is tedious, error-prone, and requires deep expertise in prompt engineering.
>
> The solution: A desktop app where you design agent workflows visually. Drag cards, draw connections, configure roles and skills - and get a production-ready prompt generated automatically.
>
> Key highlights:
> - 15 specialized agent roles
> - Smart auto-connections between workflow phases
> - Live prompt preview that updates as you design
> - 3 starter templates for common workflows
> - Built with Electron, React, TypeScript, and React Flow
>
> MIT licensed and open to contributions.
>
> Check it out: [YOUR GITHUB URL]
>
> [ATTACH SCREENSHOT]
>
> #OpenSource #AI #DeveloperTools #PromptEngineering

**Tips**:
- Tag relevant connections who work with AI tools
- Only tag Anthropic if you've received their permission first
- Professional tone
- Add the screenshot as an image, not just a link

---

## Platform 6: Dev.to Article

**When**: Same day or day after launch
**URL**: https://dev.to/new

**Title**: Building a Visual Multi-Agent Workflow Designer with Electron and React Flow

**Tags**: claude, ai, electron, react, opensource

**Article structure** (1500-2000 words):

1. **The Problem** - Pain of writing multi-agent prompts by hand. Before/after comparison.
2. **The Solution** - Screenshot, core concept: visual canvas -> prompt engine -> CLAUDE.md
3. **Architecture Deep Dive**
   - Canvas (React Flow) - custom nodes, edge rendering
   - State Management (Zustand) - workflow store, undo/redo
   - Prompt Engine - graph traversal, phase grouping, natural language generation
   - Smart Auto-Connections - hybrid system
4. **Design System** - Linear-inspired tokens, dark/light theme with Tailwind v4
5. **What I Learned** - 3-4 bullet points
6. **Try It Out** - Links and screenshots
7. **Roadmap** - Monaco Editor, community templates, command palette

**Tips**:
- Include 3-5 screenshots/code snippets
- Dev.to rewards technical depth
- Cross-post to personal blog if you have one

---

## Platform 7: Anthropic Discord / Community

**When**: Launch day
**Where**: Anthropic official Discord and Claude Code community channels

**Message**:

> Hey everyone! I just open-sourced Opaal - a visual workflow designer for multi-agent AI pipelines. Works great with Claude Code and similar agentic AI launchers.
>
> Instead of writing complex orchestration prompts by hand, you can now design them visually with drag-and-drop:
>
> [DEMO GIF or SCREENSHOT]
>
> Features:
> - 15 agent roles with color-coded cards
> - Smart auto-connections between phases
> - Live prompt preview
> - Export to CLAUDE.md
> - 3 starter templates
> - MIT licensed
>
> GitHub: [YOUR URL]
>
> I built this because I was spending too much time hand-crafting multi-agent prompts. Would love to hear what workflows you would use this for!

**Tips**:
- Check channel rules first
- Be a community member first, promoter second
- Offer to help people set up their first workflow

---

## Secondary Wave (Days 2-7)

### Product Hunt (Day 3-4, Tuesday)
- URL: https://www.producthunt.com/posts/new
- Tagline: Design multi-agent AI workflows visually, export prompts for Claude Code and other AI platforms
- Schedule for 12:01 AM PT. Respond to every comment.

### YouTube Video (Day 2-3)
Record a 3-5 minute walkthrough:
1. Open Opaal (show the clean dark UI)
2. Pick the Feature Build template
3. Walk through each agent card
4. Show configuring an agent in the sidebar
5. Show the live prompt updating
6. Copy and paste into Claude Code (or another AI launcher)
7. Show it actually working

### Awesome Lists (Week 1-2)
Submit PRs to: awesome-claude, awesome-electron, awesome-react, awesome-llm-agents, awesome-prompt-engineering

---

## Good First Issues to Create

Label each with `good first issue`:

1. **Add ESLint + Prettier configuration** - TypeScript rules and formatting
2. **Implement Monaco Editor for prompt preview** - @monaco-editor/react is installed but unused
3. **Add toast notifications for save/export** - Brief confirmation messages
4. **Add agent count per phase in column headers** - Show "Phase 1 (3 agents)"
5. **Add Select All shortcut (Ctrl+A)** - Select all agents on canvas
6. **Support connection data descriptions in UI** - dataDescription field has no editor
7. **Add New Workflow option and shortcut (Ctrl+N)** - Clear canvas and start fresh
8. **Reorder columns by dragging headers** - Drag left/right to reorder phases

---

## Ongoing Growth

### Month 1
- [ ] Respond to every issue within 24 hours
- [ ] Merge at least 2-3 community PRs
- [ ] Publish 1 blog post on Dev.to
- [ ] Share community workflows on Twitter

### Month 2-3
- [ ] Maintain 5+ good first issues
- [ ] Add all-contributors bot for README
- [ ] Submit to Homebrew Cask and Winget
- [ ] Publish second blog post
- [ ] Create ROADMAP.md

### Month 4+
- [ ] Hacktoberfest preparation (October)
- [ ] Discord server if community grows
- [ ] Target: 100 stars month 1, 500 by month 3

---

## Key Reminders

1. **Demo GIF is your single most powerful asset** - every platform post should include it
2. **Post on ALL platforms the SAME DAY** for maximum impact
3. **Respond to every comment/issue within hours** on launch day
4. **Be genuine** - share why you built it and ask for feedback
5. **Tuesday morning EST** is the optimal launch window

---

## Appendix: Anthropic Courtesy Email Template

Send this before launch to reduce trademark risk:

```
Subject: Opaal - Independent open-source tool for use with Claude Code

Hello,

I've built Opaal, an open-source (MIT licensed) desktop application that
helps users design multi-agent workflows visually and export them as
structured text prompts for use with Claude Code.

Key points:
- Opaal does NOT call the Anthropic API or use any Claude tokens
- It only generates text that users manually paste into Claude Code
- It scans the local ~/.claude/skills directory for convenience (read-only)
- Our README includes a clear non-affiliation disclaimer

I'd like to:
1. Confirm that referencing "Claude Code" descriptively is acceptable
2. Understand any trademark guidelines you'd like us to follow
3. Request any guidance before our public launch

GitHub: [YOUR REPO URL]
License: MIT
No affiliation is claimed — purely descriptive use.

Best regards,
[Your Name]
```
