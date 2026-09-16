---
name: sandbox-lifecycle
description: Use when executing code, running builds, or testing projects. Triggers when requires_sandbox flag is true.
globs: []
alwaysApply: false
---

# Sandbox Lifecycle

## When to Run

Start sandbox for these operations:
- Installing dependencies (npm install)
- Running build (npm run build)
- Executing tests (npm test)
- Starting dev server (npm run dev)
- Running arbitrary commands requested by user

Do NOT start sandbox for:
- Reading files
- Static analysis
- Planning
- Conversation

## State Machine

```
CREATE
  → START
  → INITIALIZE
  → INSTALL (optional)
  → RUN
  → OBSERVE
  → [idle timeout]  → STOP
  → [user returns]  → RESUME (→ OBSERVE)
  → [project delete] → DESTROY
```

## Provider Interface

Canonical SandboxProvider interface is defined in .kiro/steering/stack-decisions.md. Do not redefine it here.

See ./schemas.ts for full interface.

Summary of SandboxProvider methods:
- create(config): create new sandbox
- start(sandboxId): start sandbox
- resume(sandboxId): resume stopped sandbox
- snapshot(sandboxId): capture state
- restore(snapshotId): restore from snapshot
- stop(sandboxId): pause sandbox
- destroy(sandboxId): delete sandbox
- getStatus(sandboxId): check sandbox state
- getPreviewUrl(sandboxId): get preview URL
- executeCommand(sandboxId, command): run command

## Steps

### 1. CREATE
- Load project files from persistent storage (DB + object storage)
- Generate SandboxConfig with resource limits
- Call `provider.create(config)`
- Store sandbox_id in session state

### 2. START
- Call `provider.start(sandbox_id)`
- Wait for status = "running"
- Capture preview URL if available

### 3. INITIALIZE
- Write project files to sandbox filesystem
- Inject environment variables (redact secrets from logs)
- Set working directory

### 4. INSTALL
- Detect package manager (npm, pnpm, yarn, bun)
- Run install command: `npm install`
- Stream output to user
- Check exit code (0 = success)

### 5. RUN
- Execute requested command: `npm run build`, `npm test`, etc.
- Stream stdout/stderr in real-time
- Monitor resource usage
- Track wall-time against tier limits

### 6. OBSERVE
- Collect exit code
- Parse build errors from stderr
- Extract runtime errors from logs
- Check for port bindings (dev server)

### 7. STOP (on idle or session end)
- Flush project changes to persistent storage
- Call `provider.snapshot(sandbox_id)` (if persistent sandbox enabled)
- Call `provider.stop(sandbox_id)`
- Release resources

### 8. RESUME (on user return)
- Check if snapshot exists and is recent (<24h)
- If yes: call `provider.restore(snapshot_id)`
- If no: go to CREATE and rehydrate from persistent storage

### 9. DESTROY (on project delete or session timeout)
- Call `provider.destroy(sandbox_id)`
- Remove from session state
- Delete snapshots

## Vercel Sandbox Specifics (v1 Implementation)

**Tier Limits**
- Hobby: 45-minute max session, 5 hours/month total
- Pro: 5-hour max session, ZERO free hours (pure usage billing)

**Region**
- Single region: iad1 (Washington D.C.)
- Asia/Europe users experience added latency

**Persistent Sandbox (Beta)**
- stop/restore supported but adds latency
- Not reliable for production (beta status)
- Prefer ephemeral + rehydrate from persistent storage

**Docker-in-Sandbox**
- For full-stack projects needing database + backend + frontend
- Compose file defines services
- Preview URLs are obtained via SandboxProvider.getPreviewUrl(sandboxId). The provider handles port mapping internally. The agent does not configure ports directly.

## Persistence Rule

**CRITICAL**: Sandbox filesystem is ephemeral. On teardown:
1. Scan sandbox filesystem for changed files
2. Compute diffs against last known state
3. Write diffs to object storage
4. Update project metadata in Postgres
5. Only then call `provider.destroy()`

On resume:
1. Fetch project files from object storage
2. Create fresh sandbox
3. Write files to sandbox filesystem
4. Continue work

User returning after 1 week must see their project intact.

## Anti-Patterns

❌ Treating sandbox filesystem as source of truth
❌ Not flushing changes before destroy
❌ Assuming sandbox survives past session timeout
❌ Executing untrusted code on host
❌ Ignoring tier session limits
❌ Not streaming command output to user

## Verification Checklist

- [ ] Project files flushed to persistent storage before stop/destroy
- [ ] Sandbox destroyed after idle timeout (resource cleanup)
- [ ] Commands executed inside sandbox, never on host
- [ ] Resource limits configured per tier
- [ ] Secrets redacted from command output
- [ ] Wall-time tracked against tier limit

## Tool Permissions

- **EXECUTE**: Run commands inside the sandbox
- **WRITE**: Flush project changes to persistent storage
- **INSTALL**: Create/destroy sandbox lifecycle operations (resource-intensive but isolated, no host access)
- **DANGEROUS**: Never used by this skill
