---
name: streaming-protocol
description: Use when implementing real-time updates from server to client. Triggers when building event streaming system.
globs: ["**/stream*/**", "**/sse/**", "**/events/**", "**/*stream*"]
alwaysApply: false
---

# Streaming Protocol

## When to Run

Use this protocol for:
- Agent status updates (thinking, planning, acting)
- Tool execution progress (file.patch applied, command running)
- Sandbox command output (stdout/stderr streaming)
- Build progress and errors
- File system changes
- LLM token streaming

Do NOT use for:
- Initial page load (use REST)
- One-time requests (use REST)
- File uploads (use multipart)

## Event Envelope

All events use a unified envelope structure:

```typescript
interface StreamEvent {
  id: string
  correlation_id: string
  type: EventType
  timestamp: number
  payload: unknown
}
```

Event types:
- agent.status, agent.thinking, agent.plan
- tool.call, tool.result
- file.patch, file.created, file.deleted
- sandbox.command, sandbox.stdout, sandbox.stderr
- build.start, build.progress, build.error, build.complete
- llm.token
- error

See ./schemas.ts for full EventType union and all payload interfaces.

## Transport

**Server → Client: Server-Sent Events (SSE)**
- Unidirectional, simple, built-in reconnect
- Works over HTTP/1.1 and HTTP/2
- No special server infrastructure needed
- Use for: agent updates, build logs, LLM streaming

**Bidirectional: WebSocket (only if required)**
- Use only when client needs to send events mid-stream
- Example: user interrupting agent execution
- Adds complexity, avoid unless necessary

## SSE Implementation

**Endpoint**: `GET /api/stream/session/:sessionId`

**Response Headers**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

**Event Format**:
```
id: 1234567890
event: agent.status
data: {"status":"thinking","message":"Analyzing project structure"}

id: 1234567891
event: file.patch
data: {"file":"src/App.tsx","lines_changed":5}

```

## Authorization

- Endpoint requires an authenticated session (httpOnly cookie or Bearer token)
- Server MUST verify the requesting user owns the :sessionId
- Reject with 401 if unauthenticated; 403 if ownership check fails
- Never trust client-supplied sessionId without ownership verification
- Set `Access-Control-Allow-Origin` to the app's own origin only
- Do not leak event data across tenants under any circumstance

## Resume on Reconnect

Client sends `Last-Event-ID` header on reconnect:
```
GET /api/stream/session/:sessionId
Last-Event-ID: 1234567890
```

Server:
1. Check if session still active
2. Retrieve events with `id > Last-Event-ID`
3. Replay missed events
4. Continue streaming new events

## Backpressure Handling

When event queue grows faster than network can send:

**Strategy 1: Drop Old Events**
- Keep only last N events per type
- Example: Drop old stdout lines, keep recent

**Strategy 2: Coalesce Events**
- Merge multiple `sandbox.stdout` into one
- Merge multiple `build.progress` into latest

**Strategy 3: Bounded Queue**
- Max queue size: 1000 events
- If full: drop oldest or pause agent

**Never** block agent execution waiting for client to catch up.

## Client Implementation

```typescript
const es = new EventSource('/api/stream/session/abc123');

es.addEventListener('agent.status', (e) => {
  const data = JSON.parse(e.data);
  updateStatus(data.status);
});

es.onerror = () => console.log('Reconnecting...');
```

## Anti-Patterns

❌ Using WebSocket when SSE is sufficient
❌ Not implementing Last-Event-ID resume
❌ Blocking agent while waiting for client
❌ Sending entire file content in patch event (send diff only)
❌ Not coalescing rapid-fire events
❌ Not verifying session ownership before streaming

## Verification Checklist

- [ ] SSE headers set correctly (no-cache, keep-alive)
- [ ] Last-Event-ID resume implemented
- [ ] Backpressure strategy defined
- [ ] Event envelope includes correlation_id
- [ ] Payloads are minimal (no redundant data)
- [ ] Client handles reconnect gracefully
- [ ] Session ownership verified before streaming

## Tool Permissions

- **READ**: Read session state for event replay
- **WRITE**: Write events to stream queue
