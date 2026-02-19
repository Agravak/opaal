import { BrowserWindow } from 'electron'
import type { SDKMessage, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk'

export interface RunOptions {
  cwd?: string
  model?: string
  permissionMode?: 'default' | 'acceptEdits' | 'plan'
  maxTurns?: number
}

export interface RunResult {
  success: boolean
  sessionId?: string
  error?: string
}

// Track the active query so we can abort it
let activeAbortController: AbortController | null = null

/**
 * Check if the Agent SDK is available and an API key is configured.
 */
export async function checkSdkAvailability(): Promise<{ available: boolean; hasApiKey: boolean; error?: string }> {
  try {
    // Check if the SDK module is importable
    await import('@anthropic-ai/claude-agent-sdk')
  } catch {
    return { available: false, hasApiKey: false, error: 'Agent SDK not installed' }
  }

  // Check for API key
  const hasApiKey = Boolean(
    process.env.ANTHROPIC_API_KEY ||
    process.env.CLAUDE_API_KEY
  )

  return { available: true, hasApiKey }
}

/**
 * Run a workflow prompt using the Claude Agent SDK.
 * Streams messages back to the renderer via IPC events.
 */
export async function runWorkflow(
  win: BrowserWindow,
  prompt: string,
  options?: RunOptions
): Promise<RunResult> {
  try {
    const { query } = await import('@anthropic-ai/claude-agent-sdk')

    const abortController = new AbortController()
    activeAbortController = abortController

    const q = query({
      prompt,
      options: {
        abortController,
        cwd: options?.cwd || process.cwd(),
        model: options?.model,
        permissionMode: options?.permissionMode || 'plan',
        maxTurns: options?.maxTurns || 50,
        tools: { type: 'preset', preset: 'claude_code' },
        includePartialMessages: false,
        persistSession: true,
        env: {
          ...process.env,
          CLAUDE_AGENT_SDK_CLIENT_APP: 'opaal/1.0.0',
        },
      },
    })

    let sessionId: string | undefined

    try {
      for await (const message of q) {
        // Forward message to renderer
        if (!win.isDestroyed()) {
          win.webContents.send('claude:message', sanitizeMessage(message))
        }

        // Capture session ID from init
        if (message.type === 'system' && 'subtype' in message && message.subtype === 'init') {
          sessionId = message.session_id
        }

        // Check for result
        if (message.type === 'result') {
          const result = message as SDKResultMessage
          if (!win.isDestroyed()) {
            win.webContents.send('claude:complete', sanitizeMessage(result))
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        if (!win.isDestroyed()) {
          win.webContents.send('claude:stopped', { reason: 'user_abort' })
        }
        return { success: true, sessionId }
      }
      throw err
    } finally {
      activeAbortController = null
    }

    return { success: true, sessionId }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    if (!win.isDestroyed()) {
      win.webContents.send('claude:error', { error })
    }
    return { success: false, error }
  }
}

/**
 * Stop the currently running workflow.
 */
export function stopWorkflow(): boolean {
  if (activeAbortController) {
    activeAbortController.abort()
    activeAbortController = null
    return true
  }
  return false
}

/**
 * Sanitize SDK messages for IPC transfer (remove non-serializable fields).
 */
function sanitizeMessage(message: SDKMessage): Record<string, unknown> {
  // SDK messages are generally JSON-serializable, but we clone to be safe
  try {
    return JSON.parse(JSON.stringify(message))
  } catch {
    return { type: message.type, error: 'Message could not be serialized' }
  }
}
