export interface CodeGraph {
  files: Record<string, FileNode>
  symbols: Record<string, SymbolNode>
}

export interface FileNode {
  path: string
  exports: string[] // symbol IDs
  imports: Array<{ symbol: string, from: string }>
}

export interface SymbolNode {
  id: string
  name: string
  kind: "function" | "class" | "const" | "type" | "interface"
  definedIn: string // file path
  usedBy: string[] // file paths
  isExported: boolean
}
