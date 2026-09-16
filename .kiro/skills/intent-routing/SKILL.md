---
name: intent-routing
description: Use when receiving a new user message. Triggers on every message to classify intent before taking action.
globs: []
alwaysApply: true
---

# Intent Routing

## When to Run

Run on **every user message** before any other skill. This determines whether the message requires project manipulation or is conversational only.

## Steps

1. Parse user message for action keywords and context
2. Classify into one of the intent categories below
3. Set `requires_project_action` flag
4. Set `requires_sandbox` or `requires_deployment_pipeline` flags
5. Return classification JSON
6. Route to appropriate handler skill based on intent

## Intent Categories

**Conversational (requires_project_action: false)**
- `GREETING`: Hello, hi, hey
- `QUESTION`: How does X work? What is Y?
- `EXPLANATION`: Explain this error, describe this pattern
- `PROJECT_STATUS`: What's the current state? Show me the structure

**Project Manipulation (requires_project_action: true)**
- `CREATE_PROJECT`: Build a new project, start from scratch
- `MODIFY_PROJECT`: Change existing code, update files
- `ADD_FEATURE`: Add authentication, implement payment
- `REMOVE_FEATURE`: Delete component, remove dependency
- `DEBUG`: Fix this bug, resolve error
- `REFACTOR`: Clean up code, reorganize structure
- `DESIGN_CHANGE`: Make it look better, change colors
- `DEPENDENCY_CHANGE`: Add library, update packages
- `RUN_COMMAND`: Run build, execute tests
- `TEST`: Write tests, check coverage
- `BUILD`: Compile, bundle, prepare for production
- `DEPLOY`: Push to production, publish
- `ROLLBACK`: Revert changes, undo deployment
- `IMPORT_PROJECT`: Load existing project, import from GitHub

**Note on DEPLOY**: DEPLOY never sets requires_sandbox=true. Deployment runs in a dedicated isolated pipeline, not the user's interactive sandbox.

## Output Schema

```typescript
interface IntentClassification {
  intent: Intent
  requires_project_action: boolean
  requires_sandbox: boolean
  requires_deployment_pipeline: boolean
  requires_project_discovery: boolean
  confidence: number // 0.0 - 1.0
  entities: {
    project_id?: string
    file_paths?: string[]
    framework?: string
    dependencies?: string[]
  }
}

type Intent =
  | "GREETING" | "QUESTION" | "EXPLANATION" | "PROJECT_STATUS"
  | "CREATE_PROJECT" | "MODIFY_PROJECT" | "ADD_FEATURE" | "REMOVE_FEATURE"
  | "DEBUG" | "REFACTOR" | "DESIGN_CHANGE" | "DEPENDENCY_CHANGE"
  | "RUN_COMMAND" | "TEST" | "BUILD" | "DEPLOY" | "ROLLBACK"
  | "IMPORT_PROJECT"
```

requires_project_discovery is true when:
  - intent is IMPORT_PROJECT
  - intent is CREATE_PROJECT
  - intent is MODIFY_PROJECT and no ProjectProfile exists for this project in the current session

## Anti-Patterns

❌ Starting sandbox for "What is React?"
❌ Running project discovery for "Hello"
❌ Modifying files for "How does this work?"
❌ Treating "Show me the code" as MODIFY_PROJECT (it's PROJECT_STATUS)

## Verification Checklist

- [ ] Intent matches actual user request
- [ ] `requires_project_action` is false for all conversational intents
- [ ] `requires_sandbox` is true for: RUN_COMMAND, TEST_RUN, BUILD, and CREATE_PROJECT when a build or dev server is requested.
- [ ] DEPLOY always uses requires_deployment_pipeline: true and requires_sandbox: false.
- [ ] requires_sandbox is false for: GREETING, QUESTION, EXPLANATION, PROJECT_STATUS, MODIFY_PROJECT (unless a command run is part of the task), ADD_FEATURE (unless sandbox work is required), REMOVE_FEATURE, DEBUG (unless runtime reproduction is needed), REFACTOR, DESIGN_CHANGE, DEPENDENCY_CHANGE (unless install is required).
- [ ] requires_project_discovery is true only when project state is unknown or session-fresh
- [ ] Entities extracted correctly (file paths, dependencies, etc.)

## Tool Permissions

- None (classification only, no side effects)
