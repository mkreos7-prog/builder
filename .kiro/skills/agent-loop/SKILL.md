---
name: agent-loop
description: Use for any task that modifies project files across multiple steps — adding features, fixing bugs, refactoring, dependency changes. Triggers after intent-routing classifies a request as a project manipulation task.
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.astro", "**/*.vue", "**/package.json"]
alwaysApply: false
---

# Agent Loop

## When to Run

Run this loop for any project modification task:
- Adding features
- Fixing bugs
- Refactoring code
- Changing dependencies
- Any multi-step operation

Do NOT run for:
- Pure conversation (questions, explanations)
- Read-only operations (status checks, browsing code)

## Main Loop

```
UNDERSTAND → OBSERVE → PLAN → VALIDATE → ACT → OBSERVE → VERIFY
```

Every state transition MUST emit an agent.status stream event using the enum defined in streaming-protocol/schemas.ts. Keep the state names identical on both sides.

### 1. UNDERSTAND
- Parse user request into concrete requirements
- Identify affected files and dependencies
- Check if project discovery needed
- Set success criteria

### 2. OBSERVE (initial)
- Read current state of affected files
- Check sandbox status if execution needed
- Review recent changes/commits
- Note configuration and dependencies

### 3. PLAN
- Break task into atomic steps
- Order steps by dependency
- Identify verification points
- Estimate risk level per step

### 4. VALIDATE (plan)
- Check plan against requirements
- Verify no hardcoded paths (use discovered structure)
- Confirm all files to be modified exist
- Flag high-risk operations

### 5. ACT
- Execute plan steps sequentially
- Use patch-editing skill for file modifications
- Create one checkpoint before the first write of a batch (see steering/implementation-rules.md for batch definition)
- Log each action with timestamp

### Action Limit Handling

When MAX_ACTIONS_PER_TURN is reached in a single turn:

1. Finish the current atomic action. Never split an action across turns.
2. Run Level 1 verification (syntax check only).
3. Create a checkpoint tagged `auto-pause`.
4. Emit agent.status event with status="paused", reason="action_limit".
5. Wait for user "continue" or "abort".

On "continue":
  - Restore from the `auto-pause` checkpoint.
  - Resume the loop with a fresh action counter.
  - Do NOT re-trigger MAX_ACTIONS_PER_TURN unless the user hits it again.

On "abort":
  - Offer rollback to the last user-initiated checkpoint (if any).
  - Do NOT auto-rollback without explicit confirmation.

### 6. OBSERVE (post-action)
- Read modified files to confirm changes
- Check for syntax errors
- Review sandbox output if command executed
- Collect build/test/runtime errors

### 7. VERIFY
- Run verification skill (type check, build, test)
- Compare output against success criteria
- If errors → enter REPAIR loop
- If success → report completion

## Repair Loop

```
ERROR → DIAGNOSE → REPAIR → VERIFY
```

Triggered when verification fails or sandbox reports error.

### 1. ERROR
- Capture full error message
- Extract file path, line number, error code
- Hash error signature

### 2. DIAGNOSE
- Check error hash against recent attempts
- If same error seen ≥ MAX_REPAIR_ATTEMPTS (default: 3) → escalate to user
- Classify error: syntax, type, runtime, import, missing dependency
- Identify root cause

### 3. REPAIR
- Apply error-class-specific strategy:
  - Syntax error → re-read file, fix specific line
  - Type error → add types, fix signatures
  - Import error → check paths, verify exports
  - Missing dependency → add to package.json
  - Runtime error → add null checks, fix logic
- Use exponential backoff (pause before retry)

### 4. VERIFY
- Re-run verification
- If success → exit repair loop
- If failure → increment attempt counter, return to ERROR

## Configuration

See ./schemas.ts for AgentLoopConfig.

Defaults:
- MAX_REPAIR_ATTEMPTS = 3
- BACKOFF_MS = 1000
- CHECKPOINT_INTERVAL = 5 actions
- MAX_ACTIONS_PER_TURN = 20

## Anti-Patterns

❌ Retrying same fix without diagnosing root cause
❌ Skipping OBSERVE step and working with stale state
❌ Making multiple changes before verification
❌ Continuing past MAX_REPAIR_ATTEMPTS
❌ Not detecting error loops (same hash repeatedly)

## Verification Checklist

- [ ] User request fully understood before planning
- [ ] All file reads completed before modifications
- [ ] Each action logged with timestamp
- [ ] Error hash tracked to detect loops
- [ ] Repair attempts do not exceed limit
- [ ] Success criteria checked before reporting completion

## Tool Permissions

- **READ**: Read files, check status
- **WRITE**: Modify files via patch-editing skill
- **EXECUTE**: Run commands via sandbox-lifecycle skill
