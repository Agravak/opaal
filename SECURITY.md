# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Opaal, please report it responsibly.

**Do not open a public issue for security vulnerabilities.**

Instead, please use one of these methods:

1. **GitHub Security Advisories** (preferred): Go to the [Security tab](../../security/advisories/new) of this repository and create a new private security advisory.
2. **Email**: Send details to the maintainers via the email listed on the GitHub profile.

### What to Include

- A description of the vulnerability
- Steps to reproduce the issue
- The potential impact
- Any suggested fixes (optional)

### Response Timeline

- **Acknowledgment**: Within 48 hours of report
- **Initial assessment**: Within 1 week
- **Fix and disclosure**: We aim to resolve confirmed vulnerabilities within 30 days

## Scope

Security concerns for Opaal include:

- Local file system access beyond intended scope (e.g., reading files outside `~/.claude/skills`)
- Code injection through `.opaal` workflow files (malicious file payloads)
- Electron-specific vulnerabilities (e.g., `nodeIntegration` leaks, IPC security)
- Dependencies with known vulnerabilities

## Out of Scope

- Bugs that do not have a security impact
- Social engineering attacks
- Denial of service against a user's own machine

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest release | Yes |
| Older versions | Best effort |

Thank you for helping keep Opaal safe for everyone.
