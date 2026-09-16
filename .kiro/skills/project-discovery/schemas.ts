export interface ProjectProfile {
  id: string
  name: string
  framework: "next" | "vite" | "astro" | "unknown"
  version: string
  packageManager: "npm" | "pnpm" | "yarn" | "bun"
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  structure: {
    hasSrc: boolean
    hasApp: boolean
    hasPages: boolean
    hasComponents: boolean
    directories: string[]
  }
  entryPoints: string[]
  routes: Route[]
  routingSource: "filesystem" | "client-side-router" | "unknown"
  buildCommand: string
  devCommand: string
  outputDir: string
}

export interface Route {
  path: string
  file: string
  type: "static" | "dynamic" | "catch-all"
  params?: string[]
}
