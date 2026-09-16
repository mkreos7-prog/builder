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
| fetch | HTTP requests to external APIs | READ |

Adding a new built-in server requires updating this policy file first.

## Permission Mapping

MCP servers declare tool annotations in their manifest. These MUST be mapped to the builder's seven permission classes before any tool can be invoked:

| MCP Manifest Hint | Builder Class |
|---|---|
| readOnly: true | READ |
| destructiveHint: true | DELETE |
| idempotentHint: true + no readonly | WRITE |
| (unknown / no hint) | DANGEROUS |

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
- Logs are retained 30 days.
- Logs never contain tool arguments or results if the tool is marked 
  DANGEROUS or DEPLOY.

## Hard Prohibitions

- Never allow an MCP server to modify files under .kiro/.
- Never allow an MCP server to read another user's project.
- Never allow an MCP server to call the builder's internal APIs.
- Never allow an MCP server to invoke another MCP server.
- Never allow an MCP tool with EXECUTE permission to be called by the LLM 
  directly — it must go through sandbox-lifecycle.
