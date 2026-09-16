---
inclusion: always
---

# MCP Policy

## Scope

This policy governs how the agent consumes external MCP (Model Context Protocol) servers. The builder acts as an MCP CLIENT only in v1. Acting as an MCP PROVIDER is deferred to v2.

## Server Trust Levels

Every MCP server has one of three trust levels:

- **BUILT_IN**: Shipped and maintained by the builder. Enabled by default.
  Only these servers are allowed in v1.
- **VERIFIED**: Third-party servers that have passed review. Not allowed in v1.
- **USER_ADDED**: User-supplied servers. Not allowed in v1.

## v1 Built-In Servers

Only these three servers are enabled in v1:

| Server | Purpose | Permission Ceiling |
|---|---|---|
| github | Repository read/write, PR operations | WRITE |
| playwright | Browser automation, screenshots, DOM inspect | EXECUTE |
| fetch | HTTP requests to external APIs | WRITE |

Adding a new built-in server requires updating this policy file first.

Ceiling Enforcement:

If a server exposes a tool whose mapped permission exceeds its ceiling, the following occurs at tool-discovery time:

- The offending tool is hidden from the agent's available tool list.
- The server itself is NOT rejected; only that tool is disabled.
- A warning is written to the audit log with event type mcp.server.ceiling_exceeded, including server_name and tool_name.
- The user is not notified — this is a builder-side safety measure.

Ceilings are enforced at discovery time, not at call time. A tool that passes discovery cannot exceed its ceiling during invocation.

## Permission Mapping

MCP servers declare tool annotations in their manifest. These MUST be mapped to the builder's seven permission classes before any tool can be invoked:

| MCP Manifest Hint | Builder Class |
|---|---|
| readOnlyHint: true | READ |
| destructiveHint: true | DELETE |
| idempotentHint: true + no readOnlyHint | WRITE |
| (unknown / no hint) | DANGEROUS |

The table above is a partial guideline. The full mapping follows a priority order — first match wins:

1. destructiveHint: true                → DELETE
2. readOnlyHint: true                   → READ
3. Server = playwright                  → EXECUTE
4. Server = github or fetch (write)     → WRITE
5. idempotentHint: true (write)         → WRITE
6. No hints + unknown server            → DANGEROUS

Server-specific rules (3 and 4) come from the built-in allowlist in the "v1 Built-In Servers" section. When a new server is added to the allowlist, its default class must be specified there.

Rules:

- Never trust the server's self-declared permission without mapping.
- A tool mapped to DANGEROUS requires explicit user confirmation per call.
- A tool mapped to DEPLOY, DELETE, or DANGEROUS requires user confirmation.
- The mapped permission is stored in steering/tools.md and must match.

## Credential Handling

- Credentials are NEVER passed to MCP servers as raw strings.
- OAuth 2.0 is the only allowed credential flow in v1.
- Access tokens are stored encrypted in Postgres, never in sandbox, never 
  in LLM context.
- Tokens are injected into the MCP server container via secure environment 
  at connection time.
- Tokens are never logged. Any log line containing a token is redacted before 
  persistence.

## Server Hosting

- Each MCP server runs in an isolated container, separate from the user's 
  project sandbox.
- The MCP container has NO access to:
  - The user's project sandbox filesystem
  - Other users' MCP containers
  - The builder's host system
  - The builder's database
- Resource limits per MCP server:
  - CPU: 0.5 core
  - RAM: 512 MB
  - Wall time per tool call: 30 seconds
  - Network egress: allowed only to the server's declared domains

## Failure Recovery

- Connection failure: exponential backoff, max 3 retries, then disable server 
  for the session.
- Tool call timeout: 30 seconds, then return error to agent.
- Server crash: emit mcp.server.error event, mark server unavailable, continue 
  session without it.

## Audit

- Every MCP tool call MUST be logged with:
  - session_id, user_id, server_name, tool_name, permission_class, 
    timestamp, duration_ms, success (bool)
- Logs are retained per MCP_AUDIT_RETENTION_DAYS (env var, default 30).
- Logs never contain tool arguments or results if the tool is marked 
  DANGEROUS or DEPLOY.

## Hard Prohibitions

- Never allow an MCP server to modify files under .kiro/.
- Never allow an MCP server to read another user's project.
- Never allow an MCP server to call the builder's internal APIs.
- Never allow an MCP server to invoke another MCP server.
- Never allow an MCP tool with EXECUTE permission to be called by the LLM 
  directly — it must go through sandbox-lifecycle.
