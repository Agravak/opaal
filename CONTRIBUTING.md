# Contributing to Opaal

Thank you for your interest in contributing! Opaal is an open source project and we welcome contributions from the community.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/opaal.git
   cd opaal
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Start** the dev server:
   ```bash
   npm run dev
   ```

The Electron app opens automatically with hot reload enabled.

## Project Structure

```
src/
  main/           # Electron main process (window, IPC, file dialogs, skills scanner)
  preload/        # Context bridge (exposes APIs to renderer)
  renderer/src/   # React app (canvas, sidebar, stores, prompt generation)
    components/   # UI components (canvas, nodes, sidebar, layout)
    stores/       # Zustand state (workflow, UI, skills)
    lib/          # Core logic (prompt generator, auto-connect, templates)
    hooks/        # React hooks (keyboard shortcuts)
    styles/       # Tailwind CSS + design tokens
    types/        # TypeScript interfaces
```

## How to Contribute

### Reporting Bugs

- Use the [GitHub issue tracker](../../issues)
- Include steps to reproduce, expected vs actual behavior
- Include your OS version and Node.js version
- Screenshots are very helpful

### Suggesting Features

- Open a [GitHub Discussion](../../discussions) first
- Describe the use case, not just the feature
- Reference how other tools solve similar problems

### Submitting Code

1. Create a branch from `main` (`git checkout -b feature/my-feature`)
2. Make your changes
3. Ensure `npx tsc --noEmit` passes (type checking)
4. Test your changes manually in the app
5. Commit with a clear message
6. Push to your fork and open a pull request

### Code Style

- **TypeScript** strict mode throughout
- **React** functional components with hooks
- **Zustand** for state management
- **Tailwind CSS** for styling (use design tokens from `globals.css`)
- **Framer Motion** for animations

### Areas Where We Need Help

- macOS and Linux testing (currently developed on Windows)
- Accessibility improvements (keyboard navigation, screen readers)
- New workflow templates
- Internationalization (i18n)
- Monaco Editor integration for prompt preview
- Additional agent role types

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
