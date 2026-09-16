export type IntentAction =
  | 'GREETING'
  | 'QUESTION'
  | 'EXPLAIN'
  | 'CREATE_PROJECT'
  | 'MODIFY_PROJECT'
  | 'ADD_FEATURE'
  | 'FIX_BUG'
  | 'REFACTOR'
  | 'INSPECT'
  | 'UNKNOWN';

export interface Intent {
  action: IntentAction;
  confidence: number;
  requiresProjectAction: boolean;
  requiresSandbox: boolean;
  language: string;
  targetDescription: string;
}

export type SSEEventType =
  | 'start'
  | 'intent'
  | 'text_delta'
  | 'file_start'
  | 'file_delta'
  | 'file_complete'
  | 'sandbox_ready'
  | 'error'
  | 'done';

export interface SSEEvent {
  type: SSEEventType;
  id: number;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface GeneratedFile {
  path: string;
  content: string;
}
