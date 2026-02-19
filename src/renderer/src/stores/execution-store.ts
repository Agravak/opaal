import { create } from 'zustand'

export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'error' | 'stopped'

export interface ExecutionMessage {
  id: string
  type: 'system' | 'assistant' | 'user' | 'result' | 'tool_progress' | 'tool_use_summary' | 'stream_event' | 'status' | 'error'
  subtype?: string
  content: string
  timestamp: number
  raw?: Record<string, unknown>
}

interface ExecutionState {
  status: ExecutionStatus
  messages: ExecutionMessage[]
  sessionId: string | null
  startedAt: number | null
  completedAt: number | null
  error: string | null
  numTurns: number
  totalCostUsd: number

  // Actions
  start: () => void
  addMessage: (msg: ExecutionMessage) => void
  setComplete: (numTurns: number, totalCostUsd: number) => void
  setError: (error: string) => void
  setStopped: () => void
  setSessionId: (id: string) => void
  reset: () => void
}

let messageCounter = 0

export function createExecutionMessage(
  type: ExecutionMessage['type'],
  content: string,
  subtype?: string,
  raw?: Record<string, unknown>
): ExecutionMessage {
  return {
    id: `msg-${++messageCounter}`,
    type,
    subtype,
    content,
    timestamp: Date.now(),
    raw,
  }
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  status: 'idle',
  messages: [],
  sessionId: null,
  startedAt: null,
  completedAt: null,
  error: null,
  numTurns: 0,
  totalCostUsd: 0,

  start: () =>
    set({
      status: 'running',
      messages: [],
      sessionId: null,
      startedAt: Date.now(),
      completedAt: null,
      error: null,
      numTurns: 0,
      totalCostUsd: 0,
    }),

  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
    })),

  setComplete: (numTurns, totalCostUsd) =>
    set({
      status: 'completed',
      completedAt: Date.now(),
      numTurns,
      totalCostUsd,
    }),

  setError: (error) =>
    set({
      status: 'error',
      error,
      completedAt: Date.now(),
    }),

  setStopped: () =>
    set({
      status: 'stopped',
      completedAt: Date.now(),
    }),

  setSessionId: (id) =>
    set({ sessionId: id }),

  reset: () =>
    set({
      status: 'idle',
      messages: [],
      sessionId: null,
      startedAt: null,
      completedAt: null,
      error: null,
      numTurns: 0,
      totalCostUsd: 0,
    }),
}))
