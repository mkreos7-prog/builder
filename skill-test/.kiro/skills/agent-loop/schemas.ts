export interface AgentLoopConfig {
  MAX_REPAIR_ATTEMPTS: number // default: 3
  BACKOFF_MS: number // default: 1000
  CHECKPOINT_INTERVAL: number // default: 5 actions
  MAX_ACTIONS_PER_TURN: number // default: 20
}
