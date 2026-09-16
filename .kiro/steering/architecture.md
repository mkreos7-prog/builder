# Architecture Principles

## Layered Model

The system has three distinct layers:

1. **LLM Layer**: Language model inference, prompt construction, tool-call generation
2. **Brain Layer**: Intent routing, project state management, tool orchestration, verification logic
3. **Sandbox Layer**: Isolated code execution, build processes, runtime observation

These layers communicate via well-defined interfaces. The LLM never directly accesses the sandbox. The Brain mediates all operations.

## Source of Truth Rule

**Project state is the single source of truth.**

- Project metadata lives in Postgres
- File contents live in object storage (S3/R2)
- Version snapshots enable rollback
- Memory/cache is ephemeral and derived from project state
- On conflict: project state wins, memory is rebuilt

When a user returns after days or weeks, the system reconstructs the working state from project storage, not from cached memory.

## Sandbox as Ephemeral Compute

The sandbox filesystem is **not** the source of truth. It is disposable compute:

- Sessions are time-limited (45 minutes on Hobby tier, 5 hours on Pro tier)
- On teardown: flush all project changes to persistent storage (DB + object storage)
- On resume: rehydrate project files from persistent storage into a fresh sandbox
- User must be able to return after 1 day and find their project intact

Never depend on sandbox filesystem persistence. Treat it as a scratch space.

## Extensibility Principle

All provider interfaces must support swapping implementations:

- `SandboxProvider`: Vercel Sandbox today, E2B/Blaxel/Daytona tomorrow
- `LLMProvider`: OpenAI today, Anthropic/local tomorrow
- `StorageProvider`: S3 today, R2/Cloudflare tomorrow

Design call sites to be provider-agnostic. Avoid leaking provider-specific details into the Brain layer.
