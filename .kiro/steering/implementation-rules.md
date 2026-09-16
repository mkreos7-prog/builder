# Implementation Rules

## Inspect Before Modify

Never modify files without reading them first:

- Read the current file content
- Understand existing patterns and conventions
- Generate minimal diffs that preserve unrelated code
- Verify changes match expected structure

Blind overwrites corrupt projects. Always inspect first.

## No Fake Implementations

All status indicators must reflect real state:

- Build status comes from actual build process exit codes
- Deployment status comes from provider API responses
- Sandbox state comes from provider health checks
- AI processing status reflects actual LLM/tool execution state

Never mock or simulate status unless explicitly labeled as placeholder. Users depend on accurate feedback.

## No Static Project-Structure Shortcuts

Framework knowledge is static. Project structure is dynamic.

**Allowed**: "Next.js projects typically use app/ or pages/ directory"
**Forbidden**: "Write to src/components/Hero.tsx" without verifying src/ exists

Always discover actual project structure:

1. Read package.json and lockfiles
2. Detect framework via dependencies
3. Scan for actual directories (app/, src/, components/, etc.)
4. Use discovered paths for all file operations

Never assume src/components/Button.tsx exists. Check first.

## No Blind File Overwrites

Use optimistic concurrency control:

- Calculate file hash before modification
- Include expected_hash in patch operations
- If hash mismatch: re-read file, regenerate patch
- Checkpoint before batch operations

Concurrent edits or stale reads cause data loss. Hash validation prevents this.
