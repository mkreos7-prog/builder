export type PermissionClass = 
  | "READ" | "WRITE" | "EXECUTE" 
  | "INSTALL" | "DEPLOY" | "DELETE" | "DANGEROUS"

export type SideEffect =
  | "filesystem" | "database" | "network" 
  | "sandbox" | "environment" | "git"

export interface ToolExample {
  description: string
  input: Record<string, unknown>
  output: Record<string, unknown>
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: JSONSchema
  returns: JSONSchema
  permission: PermissionClass
  idempotent: boolean
  side_effects: SideEffect[]
  examples: ToolExample[]
}

type JSONSchema = {
  type: string
  properties?: Record<string, any>
  required?: string[]
  [key: string]: any
}
