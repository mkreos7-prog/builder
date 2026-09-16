export interface SandboxProvider {
  create(config: SandboxConfig): Promise<SandboxHandle>
  start(sandboxId: string): Promise<void>
  resume(sandboxId: string): Promise<SandboxHandle>
  snapshot(sandboxId: string): Promise<SnapshotId>
  restore(snapshotId: string): Promise<SandboxHandle>
  stop(sandboxId: string): Promise<void>
  destroy(sandboxId: string): Promise<void>
  getStatus(sandboxId: string): Promise<SandboxStatus>
  getPreviewUrl(sandboxId: string): Promise<string>
  executeCommand(sandboxId: string, command: string): Promise<CommandResult>
}

export interface SandboxConfig {
  project_id: string
  image: string
  files: Record<string, string>
  env: Record<string, string>
  resource_limits: ResourceLimits
}

export interface ResourceLimits {
  cpu_cores: number
  memory_mb: number
  disk_mb: number
  max_processes: number
  network_egress: boolean
  wall_time_minutes: number
}

export interface SandboxHandle {
  id: string
  status: SandboxStatus
  preview_url?: string
  region: string
}

export type SandboxStatus = 
  | "creating" | "starting" | "running" 
  | "stopping" | "stopped" | "destroyed" | "error"

export interface CommandResult {
  exit_code: number
  stdout: string
  stderr: string
  duration_ms: number
}

export type SnapshotId = string
