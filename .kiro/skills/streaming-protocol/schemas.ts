export interface StreamEvent {
  id: string
  correlation_id: string
  type: EventType
  timestamp: number
  payload: unknown
}

export type EventType =
  | "agent.status"
  | "agent.thinking"
  | "agent.plan"
  | "tool.call"
  | "tool.result"
  | "file.patch"
  | "file.created"
  | "file.deleted"
  | "sandbox.command"
  | "sandbox.stdout"
  | "sandbox.stderr"
  | "build.start"
  | "build.progress"
  | "build.error"
  | "build.complete"
  | "llm.token"
  | "error"

export interface AgentStatusPayload {
  status: "idle" | "thinking" | "planning" | "acting" | "verifying" | "error"
  message: string
}

export interface ToolCallPayload {
  tool: string
  args: Record<string, unknown>
  timestamp: number
}

export interface ToolResultPayload {
  tool: string
  success: boolean
  result?: unknown
  error?: string
  duration_ms: number
}

export interface FilePatchPayload {
  file: string
  lines_changed: number
  description: string
}

export interface SandboxOutputPayload {
  line: string
  timestamp: number
}

export interface BuildErrorPayload {
  file: string
  line: number
  column: number
  message: string
  code: string
}

export interface LLMTokenPayload {
  token: string
  model: string
}
