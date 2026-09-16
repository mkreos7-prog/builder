# Stack Decisions

## Locked Decisions (v1)

These decisions are final for initial release:

**Backend**
- Database: Postgres (relational project metadata, user accounts)
- ORM: Drizzle (type-safe, migration-friendly)
- Cache: Redis (session state, rate limiting)
- Queue: BullMQ (background jobs, build orchestration)

**Frontend**
- Editor: CodeMirror 6 (extensible, performant, WASM-compatible LSP)
- State: Zustand (lightweight, no boilerplate)
- Server State: TanStack Query (caching, invalidation, optimistic updates)

**Sandbox**
- Provider: Vercel Sandbox (behind SandboxProvider interface)
- Limitations:
  - Max session: 45 minutes (Hobby tier), 5 hours (Pro tier)
  - Region: iad1 (Washington D.C.) — expect latency for Asia/Europe users
  - Pro plan includes ZERO free hours (pure usage billing)
  - Persistent sandbox is in beta — stop/restore adds latency
- Isolation: Docker-in-sandbox for full-stack projects
- Interface: SandboxProvider abstraction allows future migration to E2B/Blaxel/Daytona without changing call sites

**Persistence Rule**
- Project files are stored in object storage + Postgres, NOT in sandbox filesystem
- Sandbox is ephemeral compute only
- On teardown: flush project state to persistent storage
- On resume: rehydrate from persistent storage into fresh sandbox

**MCP**
- Role in v1: MCP client only. The builder consumes external MCP servers. 
  It does NOT expose itself as an MCP server in v1.
- Built-in servers (v1): github, playwright, fetch. User-added servers are 
  disabled in v1.
- Hosting: each MCP server runs in an isolated container with 0.5 CPU, 
  512 MB RAM, 30-second tool timeout.
- Credential flow: OAuth 2.0 only. Tokens encrypted at rest in Postgres.
- Permission model: MCP manifest annotations mapped to the seven builder 
  permission classes. See mcp-policy.md.

## TODO Decide (deferred to implementation phase)

**Authentication**
- Options: Clerk / Auth.js / custom
- Criteria: integration ease, pricing, social providers

**Object Storage**
- Options: AWS S3 / Cloudflare R2
- Criteria: egress costs, latency

**Deployment Target**
- Where do user projects deploy?
- Options: Vercel / Netlify / Cloudflare Pages / custom infrastructure

**Billing Provider**
- Primary candidate: Stripe (final decision deferred to implementation phase)
- Rejected for v1: LemonSqueezy

## v2 Evaluation (post-launch)

**Alternative Sandbox Providers**
- E2B: 24-hour sessions, ~1s resume, filesystem + memory preserved
- Blaxel: perpetual standby mode, sub-25ms resume
- Daytona: sub-90ms cold start

**MCP**
- MCP provider mode (expose the builder as an MCP server for external 
  clients like Claude Desktop and Cursor)
- User-added MCP servers (VERIFIED trust level)
- MCP prompts and resources (v1 supports tools only)
