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

## Rules

- Every tool must have one of the seven permission classes.
- Every tool must have an owning skill.
- Tools with EXECUTE permission must NEVER be called by the LLM directly. The Brain invokes them via the owning skill's orchestrator.
- Adding a tool without updating this catalog is a bug.
