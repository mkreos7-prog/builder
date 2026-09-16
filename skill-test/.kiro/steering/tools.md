# Tool Catalog

Canonical list of every tool available to the agent. Adding a new tool requires updating this file AND creating the implementation.

## File Tools

| Tool | Permission | Owning Skill | Idempotent | Side Effects |
|------|-----------|--------------|-----------|--------------|
| read_file | READ | (any) | yes | (none) |
| list_directory | READ | (any) | yes | (none) |
| search_files | READ | (any) | yes | (none) |
| patch_file | WRITE | patch-editing | no | filesystem |
| create_file | WRITE | file-operations | no | filesystem |
| move_file | WRITE | file-operations | no | filesystem |
| copy_file | WRITE | file-operations | no | filesystem |
| delete_file | DELETE | file-operations | no | filesystem |

## Sandbox Tools

| Tool | Permission | Owning Skill | Idempotent | Side Effects |
|------|-----------|--------------|-----------|--------------|
| run_command | EXECUTE | sandbox-lifecycle | no | sandbox |
| install_package | INSTALL | sandbox-lifecycle | yes | sandbox, filesystem |

## Verification Tools

| Tool | Permission | Owning Skill | Idempotent | Side Effects |
|------|-----------|--------------|-----------|--------------|
| run_typecheck | EXECUTE | verification | yes | (none) |
| run_build | EXECUTE | verification | yes | (none) |
| run_tests | EXECUTE | verification | yes | (none) |

## Deployment Tools

| Tool | Permission | Owning Skill | Idempotent | Side Effects |
|------|-----------|--------------|-----------|--------------|
| prepare_deployment | READ | deployment | yes | (none) |
| build_production | EXECUTE | deployment | yes | (none) |
| deploy | DEPLOY | deployment | no | network |
| get_deployment_status | READ | deployment | yes | (none) |
| rollback_deployment | DEPLOY | deployment | no | network |

## MCP-Sourced Tools

Tools sourced from MCP servers. The owning skill is mcp-client.

| Tool | Permission | Owning Skill | Source | Idempotent | Side Effects |
|------|-----------|--------------|--------|-----------|--------------|
| mcp.github.create_repo | WRITE | mcp-client | github | no | network |
| mcp.github.push_commit | WRITE | mcp-client | github | no | network |
| mcp.github.create_pr | WRITE | mcp-client | github | no | network |
| mcp.github.read_repo | READ | mcp-client | github | yes | (none) |
| mcp.playwright.navigate | EXECUTE | mcp-client | playwright | no | sandbox |
| mcp.playwright.screenshot | EXECUTE | mcp-client | playwright | yes | sandbox |
| mcp.playwright.query_dom | EXECUTE | mcp-client | playwright | yes | sandbox |
| mcp.fetch.get | READ | mcp-client | fetch | yes | network |
| mcp.fetch.post | WRITE | mcp-client | fetch | no | network |

## Rules

- Every tool must have one of the seven permission classes.
- Every tool must have an owning skill.
- Tools with EXECUTE permission must NEVER be called by the LLM directly. The Brain invokes them via the owning skill's orchestrator.
- Adding a tool without updating this catalog is a bug.
- MCP-sourced tools are prefixed with mcp.<server>.<tool>.
- The permission class is assigned by the mapping table in mcp-policy.md.
- MCP tools follow the same confirmation rules as native tools.
