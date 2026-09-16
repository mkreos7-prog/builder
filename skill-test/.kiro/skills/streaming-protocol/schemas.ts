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
  | "stream.resync_required"
  | "mcp.server.connecting"
  | "mcp.server.connected"
  | "mcp.server.disconnected"
  | "mcp.server.error"
  | "mcp.tool.discovered"
  | "mcp.tool.call"
  | "mcp.tool.result"

export interface AgentStatusPayload {
  status:
    | "idle"
    | "understanding"
    | "observing"
    | "planning"
    | "validating"
    | "acting"
    | "verifying"
    | "repairing"
    | "paused"
    | "error"
    | "completed"
  message: string
  reason?: string
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

export interface StreamResyncRequiredPayload {
  server_timestamp: number
  reason: string
}

export interface MCPServerEventPayload {
  server_name: string
  status: "connecting" | "connected" | "disconnected" | "error"
  container_id?: string
  error?: string
}

export interface MCPToolDiscoveredPayload {
  server_name: string
  tool_name: string
  permission: "READ" | "WRITE" | "EXECUTE" | "INSTALL"
            | "DEPLOY" | "DELETE" | "DANGEROUS"
}

export interface MCPToolCallStreamPayload {
  server_name: string
  tool_name: string
  correlation_id: string
  permission: string
}

export interface MCPToolResultStreamPayload {
  server_name: string
  tool_name: string
  success: boolean
  duration_ms: number
  error?: string
}
