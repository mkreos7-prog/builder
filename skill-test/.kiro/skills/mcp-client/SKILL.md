---
name: mcp-client
description: Use when a task requires an external capability provided by an MCP server — GitHub repository access, browser automation, or external HTTP fetch. Triggers on repo import, preview page inspection, or external API calls.
globs: []
alwaysApply: false
---

# MCP Client

## When to Run

Use this skill when a task needs an external capability that cannot be satisfied by local tools:

- GitHub operations (import repo, push, open PR) → github server
- Preview page inspection, screenshots, DOM queries → playwright server
- External HTTP requests (weather, payments, third-party APIs) → fetch server

Do NOT use for:

- File operations on the local project (use file-operations)
- Code edits (use patch-editing)
- Build/test commands (use sandbox-lifecycle)

## Governance

All rules in .kiro/steering/mcp-policy.md apply. Read that file before invoking any MCP server. Do NOT bypass its constraints.

## Steps

### 1. CHECK SERVER AVAILABILITY

- Read the enabled server list from mcp-policy.md.
- If the requested capability has no matching built-in server, stop and 
  report to user: "No MCP server available for this capability."
- If the server is disabled for the session, skip to step 6 (error reporting).

### 2. CONNECT

- If the server is already connected, reuse the connection.
- Otherwise:
  - Check OAuth token exists and is not expired.
  - If expired or missing, prompt user to re-authorize via the OAuth flow.
  - Launch the server in an isolated container.
  - Inject the OAuth token via secure environment variable.
  - Wait for handshake to complete (max 10 seconds).

### 3. DISCOVER TOOLS

- Query the server for its tool list.
- For each tool, read the raw annotations.
- Map the annotations to a permission class using the table in mcp-policy.md.
- Cache the mapped tool definitions for the session.

### 4. VALIDATE PERMISSION

- If the mapped permission is DEPLOY, DELETE, or DANGEROUS, require explicit 
  user confirmation before invoking.
- If the mapped permission is EXECUTE, do NOT invoke directly — route through 
  sandbox-lifecycle orchestrator.
- Reject the call if the tool would violate any hard prohibition in 
  mcp-policy.md.

### 5. INVOKE

- Emit mcp.tool.call stream event.
- Send the tool call with arguments.
- Wait up to the configured timeout (30 seconds default).
- On success: emit mcp.tool.result with success=true.
- On failure: emit mcp.tool.result with success=false and error message.

### 6. ERROR REPORTING

- Connection failure: retry with exponential backoff (max 3 attempts).
- After 3 failures: disable the server for the session and emit 
  mcp.server.error.
- Never hide MCP errors. Report the actual error message to the user.

### 7. CLEANUP

- On session end: disconnect all connected servers.
- Do NOT destroy the OAuth token — it is reused across sessions.
- Emit mcp.server.disconnected for each server.

## Output Schema

See ./schemas.ts for MCPServerConfig, MCPServerHandle, MCPToolDefinition, MCPToolCall, MCPToolResult.

Brief:

- MCPServerHandle: name, status, container_id, connected_at, tools[]
- MCPToolDefinition: name, description, input_schema, raw_annotations, permission
- MCPToolResult: success, result, error, duration_ms

## Anti-Patterns

- Invoking a USER_ADDED or VERIFIED server in v1
- Passing a raw secret or API key to an MCP server
- Trusting the server's declared permission without mapping
- Calling an EXECUTE tool directly from the LLM
- Caching OAuth tokens in the sandbox or the LLM context
- Skipping the audit log for DANGEROUS or DEPLOY tool calls
- Retrying a failed call more than 3 times

## Verification Checklist

- [ ] Server is in the built-in allowlist for v1
- [ ] OAuth token exists and is not expired
- [ ] Tool permission mapped via mcp-policy.md table
- [ ] User confirmation obtained for DEPLOY/DELETE/DANGEROUS
- [ ] EXECUTE tools routed through sandbox-lifecycle
- [ ] Stream events emitted for connect, call, result, disconnect
- [ ] Audit log written for the call
- [ ] Cleanup performed on session end

## Tool Permissions

- **READ**: Read OAuth tokens from encrypted store (no plaintext logging)
- **EXECUTE**: Start/stop MCP server containers (isolated, resource-limited)
- **WRITE**: Write audit log entries to Postgres
