export interface DeploymentResult {
  success: boolean
  deployment_id: string
  url: string
  build_time_ms: number
  bundle_size_mb: number
  errors: string[]
  warnings: string[]
}

export interface DeploymentStatus {
  id: string
  project_id: string
  status: "building" | "deploying" | "live" | "failed" | "rolled_back"
  url: string
  created_at: number
  updated_at: number
  commit_sha?: string
}
