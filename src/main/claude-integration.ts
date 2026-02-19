import { execSync, spawn } from 'child_process'
import { writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

export interface ClaudeCliInfo {
  found: boolean
  path: string | null
  version: string | null
}

export interface LaunchOptions {
  cwd?: string
  mode?: 'interactive' | 'print'
}

export interface LaunchResult {
  success: boolean
  pid?: number
  error?: string
}

/**
 * Detect if the Claude Code CLI is installed and available on this system.
 */
export async function detectClaudeCli(): Promise<ClaudeCliInfo> {
  try {
    // Try to find the claude binary
    const isWin = process.platform === 'win32'
    const cmd = isWin ? 'where claude' : 'which claude'
    const pathResult = execSync(cmd, { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'ignore'] }).trim()

    // Take the first result (where/which can return multiple)
    const cliPath = pathResult.split('\n')[0].trim()

    // Try to get the version
    let version: string | null = null
    try {
      const versionOutput = execSync('claude --version', {
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim()
      version = versionOutput
    } catch {
      // Version check is optional
    }

    return { found: true, path: cliPath, version }
  } catch {
    return { found: false, path: null, version: null }
  }
}

/**
 * Launch Claude Code in a new terminal window with the given prompt.
 * Writes the prompt to a temp file and pipes it into the claude CLI
 * to avoid shell escaping issues with large prompts.
 */
export async function launchClaudeCode(
  prompt: string,
  options?: LaunchOptions
): Promise<LaunchResult> {
  const mode = options?.mode ?? 'interactive'

  try {
    // First verify claude is available
    const cliInfo = await detectClaudeCli()
    if (!cliInfo.found) {
      return {
        success: false,
        error:
          'Claude Code CLI not found. Install it with: npm install -g @anthropic-ai/claude-code',
      }
    }

    // Write prompt to a temp file to avoid shell argument length limits
    const tmpFile = join(tmpdir(), `opaal-prompt-${Date.now()}.md`)
    await writeFile(tmpFile, prompt, 'utf-8')

    // Schedule temp file cleanup
    const cleanupTmpFile = (): void => {
      setTimeout(() => unlink(tmpFile).catch(() => {}), 15000)
    }

    if (process.platform === 'win32') {
      return await launchWindows(tmpFile, mode, options?.cwd, cleanupTmpFile)
    } else if (process.platform === 'darwin') {
      return await launchMacOS(tmpFile, mode, options?.cwd, cleanupTmpFile)
    } else {
      return await launchLinux(tmpFile, mode, options?.cwd, cleanupTmpFile)
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error launching Claude Code',
    }
  }
}

function launchWindows(
  tmpFile: string,
  mode: string,
  cwd: string | undefined,
  cleanup: () => void
): Promise<LaunchResult> {
  return new Promise((resolve) => {
    const claudeCmd =
      mode === 'print'
        ? `type "${tmpFile}" | claude --print`
        : `type "${tmpFile}" | claude`

    const child = spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', claudeCmd], {
      detached: true,
      stdio: 'ignore',
      shell: true,
      cwd: cwd || undefined,
    })

    child.unref()
    cleanup()

    child.on('error', (err) => {
      resolve({ success: false, error: err.message })
    })

    // Give a small delay for the spawn to happen
    setTimeout(() => {
      resolve({ success: true, pid: child.pid })
    }, 300)
  })
}

function launchMacOS(
  tmpFile: string,
  mode: string,
  cwd: string | undefined,
  cleanup: () => void
): Promise<LaunchResult> {
  return new Promise((resolve) => {
    const cdCmd = cwd ? `cd "${cwd}" && ` : ''
    const claudeCmd =
      mode === 'print'
        ? `${cdCmd}cat "${tmpFile}" | claude --print`
        : `${cdCmd}cat "${tmpFile}" | claude`

    // Use osascript to open Terminal.app with the command
    const child = spawn(
      'osascript',
      ['-e', `tell application "Terminal" to do script "${claudeCmd.replace(/"/g, '\\"')}"`],
      {
        detached: true,
        stdio: 'ignore',
      }
    )

    child.unref()
    cleanup()

    child.on('error', (err) => {
      resolve({ success: false, error: err.message })
    })

    setTimeout(() => {
      resolve({ success: true, pid: child.pid })
    }, 300)
  })
}

function launchLinux(
  tmpFile: string,
  mode: string,
  cwd: string | undefined,
  cleanup: () => void
): Promise<LaunchResult> {
  return new Promise((resolve) => {
    const cdCmd = cwd ? `cd "${cwd}" && ` : ''
    const claudeCmd =
      mode === 'print'
        ? `${cdCmd}cat "${tmpFile}" | claude --print`
        : `${cdCmd}cat "${tmpFile}" | claude`

    // Try common terminal emulators in order
    const terminals = [
      { cmd: 'gnome-terminal', args: ['--', 'bash', '-c', claudeCmd] },
      { cmd: 'konsole', args: ['-e', 'bash', '-c', claudeCmd] },
      { cmd: 'xfce4-terminal', args: ['-e', `bash -c '${claudeCmd}'`] },
      { cmd: 'xterm', args: ['-e', `bash -c '${claudeCmd}'`] },
    ]

    let launched = false

    for (const terminal of terminals) {
      try {
        execSync(`which ${terminal.cmd}`, { encoding: 'utf-8', timeout: 2000 })
        const child = spawn(terminal.cmd, terminal.args, {
          detached: true,
          stdio: 'ignore',
          cwd: cwd || undefined,
        })
        child.unref()
        cleanup()
        launched = true

        child.on('error', (err) => {
          resolve({ success: false, error: err.message })
        })

        setTimeout(() => {
          resolve({ success: true, pid: child.pid })
        }, 300)
        break
      } catch {
        continue
      }
    }

    if (!launched) {
      cleanup()
      resolve({
        success: false,
        error: 'No supported terminal emulator found (tried gnome-terminal, konsole, xfce4-terminal, xterm)',
      })
    }
  })
}
