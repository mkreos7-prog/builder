---
name: deployment
description: Use when deploying user projects to production. Triggers when user requests publish or deploy.
globs: ["**/package.json", "**/next.config.*", "**/vite.config.*", "**/astro.config.*", "**/vercel.json", "**/Dockerfile"]
alwaysApply: false
---

# Deployment

## When to Run

Use this skill when:
- User explicitly requests deployment ("deploy my project", "publish to production")
- Auto-deploy is configured and build succeeds
- Rolling back to previous deployment

Do NOT use for:
- Running dev server (use sandbox-lifecycle)
- Building locally (use verification)
- Preview deployments in sandbox

## Deployment Flow

```
PREPARE → BUILD → DEPLOY → STATUS
```

## Steps

### 1. PREPARE

**Project Isolation**
- Create isolated deployment environment
- Never use user's sandbox for deployment
- Never expose host git credentials

**Pre-flight Checks**
- Verify project has build command in package.json
- Check for framework-specific config (next.config.js, etc.)
- Validate environment variables are set
- Confirm deployment target configured

**Dependency Resolution**
- Lock file must be present (package-lock.json, pnpm-lock.yaml, etc.)
- No version ranges in critical dependencies
- Check for known vulnerable packages

### 2. BUILD

**Build Environment**
- Fresh isolated environment (not user's sandbox)
- Install dependencies from lockfile
- Run build command: `npm run build` or framework equivalent
- Collect build artifacts

**Build Verification**
- Check exit code = 0
- Verify output directory exists (dist/, .next/, out/)
- Parse build errors if any
- Validate bundle size within limits

### 3. DEPLOY

**Deployment Pipeline**
- Upload build artifacts to deployment target
- Configure routing and rewrites
- Set environment variables
- Enable SSL/TLS

**Custom Domain (if configured)**
- Validate domain ownership
- Configure DNS records (A, CNAME)
- Provision SSL certificate
- Update CDN configuration

**Health Check**
- Wait for deployment to be live
- Check HTTP status of deployment URL
- Verify preview renders correctly
- Test critical routes

### 4. STATUS

**Track Deployment**
- Store deployment ID in database
- Link to project version/commit
- Record deployment timestamp
- Save deployment URL

**Report to User**
- Deployment URL (production)
- Build time
- Bundle size
- Any warnings

## Per-Project Isolation

Each project deployment is completely isolated:

- **Separate build environment**: Never share between projects
- **Isolated secrets**: Project A cannot access Project B's env vars
- **Independent routing**: Each project gets unique subdomain or path
- **Resource limits**: CPU, memory, disk per deployment

## Security Rules

**Never expose host git**
- Do not use host's .git directory
- Do not use host's SSH keys or git credentials
- Clone from project storage (DB + object storage)

**Secrets handling**
- Environment variables with SECRET, KEY, TOKEN, PASSWORD are redacted from logs
- Secrets injected at deployment time, never in build artifacts
- User-provided secrets stored encrypted in database

**Network isolation**
- Deployment environment cannot access internal networks
- Egress restricted to public internet + deployment target API

## Rollback Triggers

Automatic rollback:
  - Triggers ONLY on post-deploy health check failure.
  - Must occur within 5 minutes of the initial deploy.
  - Emits `deployment.rollback.auto` event.
  - Never auto-rollback more than one version back.
  - Never auto-rollback if the failed deploy was itself a rollback.

Manual rollback:
  - Triggers on explicit user "rollback" intent.
  - User must specify target version OR accept the most recent successful deployment.
  - Emits `deployment.rollback.manual` event.

Never auto-rollback without one of the above triggers.

## Rollback Procedure

1. Identify previous successful deployment
2. Redeploy artifacts from that deployment
3. Verify health check passes
4. Update current deployment pointer
5. Report rollback success

Retain deployment artifacts per ROLLBACK_HISTORY_DEPTH (env var, default 10).

## Output Schema

See ./schemas.ts for full DeploymentResult and DeploymentStatus types.

Brief:
- `DeploymentResult`: success, deployment_id, url, build_time_ms, bundle_size_mb, errors[], warnings[]
- `DeploymentStatus`: id, project_id, status, url, timestamps, commit_sha

## Anti-Patterns

❌ Deploying from user's sandbox (risk of state leakage)
❌ Using host git credentials
❌ Not isolating projects (shared secrets, shared environment)
❌ Deploying without build verification
❌ Not storing deployment artifacts for rollback
❌ Exposing secrets in build logs

## Verification Checklist

- [ ] Deployment environment is isolated
- [ ] Build succeeds before deploy
- [ ] Health check passes after deploy
- [ ] Deployment URL accessible
- [ ] Secrets redacted from logs
- [ ] Host git never used
- [ ] Deployment artifacts stored for rollback

## Tool Permissions

- **EXECUTE**: Build project in isolated environment
- **DEPLOY**: Push to production (high impact, requires confirmation)
- **WRITE**: Store deployment metadata in database
