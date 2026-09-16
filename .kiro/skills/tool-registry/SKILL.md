---
name: tool-registry
description: Use when defining new tools for the agent to call. Triggers when extending agent capabilities.
globs: ["**/tools/**/*.ts"]
alwaysApply: false
---

# Tool Registry

## When to Run

Use this skill when:
- Adding new agent capabilities
- Defining custom tools for function calling
- Documenting tool schemas
- Building tool permission system

Do NOT use for:
- Calling existing tools
- Modifying tool implementations (use regular code editing)

## Tool Schema Format

Every tool must be defined using JSON Schema and include metadata.

See ./schemas.ts for full ToolDefinition interface.

Required fields:
- **name**: kebab-case, unique identifier
- **description**: clear, actionable description of what the tool does
- **parameters**: JSON Schema for input validation
- **returns**: JSON Schema for output structure
- **permission**: one of READ/WRITE/EXECUTE/INSTALL/DEPLOY/DELETE/DANGEROUS
- **idempotent**: boolean (can be retried safely?)
- **side_effects**: array of what the tool modifies (may be empty for pure functions)
- **examples**: array of usage examples

## Example Tool: patch_file

```typescript
const patchFileTool: ToolDefinition = {
  name: "patch_file",
  description: "Apply a minimal diff to an existing file with optimistic concurrency control",
  
  parameters: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Relative path to file from project root"
      },
      expected_hash: {
        type: "string",
        description: "SHA-256 hash of current file content (prevents concurrent edit conflicts)"
      },
      patch: {
        type: "string",
        description: "Unified diff format patch"
      },
      description: {
        type: "string",
        description: "Human-readable description of change"
      }
    },
    required: ["file_path", "expected_hash", "patch"]
  },
  
  returns: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      new_hash: { type: "string" },
      lines_changed: { type: "number" },
      error: { type: "string" }
    },
    required: ["success"]
  },
  
  permission: "WRITE",
  idempotent: false,
  side_effects: ["filesystem"],
  
  examples: [{
    description: "Add className to button",
    input: {
      file_path: "src/components/Button.tsx",
      expected_hash: "a1b2c3...",
      patch: `--- src/components/Button.tsx
+++ src/components/Button.tsx
@@ -3,7 +3,7 @@
-    <button onClick={onClick}>
+    <button onClick={onClick} className="btn-primary">
`,
      description: "Add primary button styling"
    },
    output: {
      success: true,
      new_hash: "d4e5f6...",
      lines_changed: 1
    }
  }]
}
```

## Permission Guidelines

**READ**
- read_file, list_directory, get_project_status
- No modifications, safe to retry

**WRITE**
- patch_file, create_file, update_config
- Modifies files, reversible

**EXECUTE**
- run_command_in_sandbox, execute_tests
- Runs code in isolation

**INSTALL**
- add_dependency, update_package_json
- Supply chain risk, review dependencies

**DEPLOY**
- deploy_to_production, publish_project
- High impact, affects live users

**DELETE**
- delete_file, delete_project, drop_database
- Irreversible, requires confirmation

**DANGEROUS**
- execute_on_host, access_secrets, modify_system
- Requires explicit user confirmation

## Tool Registration

```typescript
// tools/registry.ts
import { ToolDefinition } from './types'

const toolRegistry = new Map<string, ToolDefinition>()

export function registerTool(tool: ToolDefinition): void {
  if (toolRegistry.has(tool.name)) {
    throw new Error(`Tool ${tool.name} already registered`)
  }
  
  validateToolDefinition(tool)
  toolRegistry.set(tool.name, tool)
}

export function getTool(name: string): ToolDefinition | undefined {
  return toolRegistry.get(name)
}

export function listTools(permission?: PermissionClass): ToolDefinition[] {
  const tools = Array.from(toolRegistry.values())
  return permission 
    ? tools.filter(t => t.permission === permission)
    : tools
}

function validateToolDefinition(tool: ToolDefinition): void {
  if (!tool.name || !/^[a-z][a-z0-9-]*$/.test(tool.name)) {
    throw new Error('Tool name must be kebab-case')
  }
  if (!tool.description || tool.description.length < 10) {
    throw new Error('Tool description must be descriptive')
  }
  if (!tool.permission) {
    throw new Error('Tool must declare permission class')
  }
  if (tool.idempotent === undefined) {
    throw new Error('Tool must declare idempotent flag')
  }
  if (!Array.isArray(tool.side_effects)) {
    throw new Error('Tool must declare side_effects (may be empty array)')
  }
}
```

## Anti-Patterns

❌ Not declaring permission class
❌ Vague descriptions ("modifies files" instead of "applies patch to single file")
❌ Missing examples
❌ Not specifying idempotent flag
❌ Not documenting side effects
❌ Using camelCase or snake_case for tool names (use kebab-case)

## Verification Checklist

- [ ] Tool name is kebab-case and unique
- [ ] Description is clear and actionable
- [ ] Parameters schema includes all required fields
- [ ] Return schema documents success and error cases
- [ ] Permission class declared
- [ ] Idempotent flag set correctly
- [ ] Side effects list is complete (may be empty array)
- [ ] At least one example provided

## Tool Permissions

- **WRITE**: Register new tools (modifies registry)
