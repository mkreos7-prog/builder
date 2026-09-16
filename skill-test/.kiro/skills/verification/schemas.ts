export interface VerificationResult {
  success: boolean
  level: 0 | 1 | 2 | 3 | 4 | 5
  duration_ms: number
  errors: VerificationError[]
  warnings: VerificationWarning[]
}

export interface VerificationError {
  file: string
  line: number
  column: number
  message: string
  code: string // "TS2304", "SyntaxError", etc.
  severity: "error"
}

export interface VerificationWarning {
  file: string
  line: number
  message: string
  severity: "warning"
}
