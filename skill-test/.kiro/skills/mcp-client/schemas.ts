export type MCPTrustLevel = "BUILT_IN" | "VERIFIED" | "USER_ADDED"

export type MCPServerStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error"
  | "disabled"

export interface MCPServerConfig {
  name: string
  trust_level: MCPTrustLevel
  oauth_provider?: string
  allowed_domains: string[]
  resource_limits: {
    cpu_cores: number
    memory_mb: number
    tool_timeout_ms: number
  }
}

export interface MCPServerHandle {
  name: string
  status: MCPServerStatus
  container_id: string
  connected_at: number
  tools: MCPToolDefinition[]
}

export interface MCPToolDefinition {
  name: string
  description: string
  input_schema: Record<string, unknown>
  // Raw hints from the MCP server manifest
  raw_annotations: {
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
    openWorldHint?: boolean
  }
  // Mapped permission class used by the builder
  permission: "READ" | "WRITE" | "EXECUTE" | "INSTALL"
           | "DEPLOY" | "DELETE" | "DANGEROUS"
}

export interface MCPToolCall {
  server_name: string
  tool_name: string
  arguments: Record<string, unknown>
  correlation_id: string
}

export interface MCPToolResult {
  success: boolean
  result?: unknown
  error?: string
  duration_ms: number
}
