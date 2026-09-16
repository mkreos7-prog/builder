---
name: verification
description: Use after code changes to verify correctness. Triggers after file modifications are complete.
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/package.json", "**/tsconfig.json"]
alwaysApply: false
---

# Verification

## When to Run

Run verification after:
- Modifying TypeScript/JavaScript files
- Changing package.json or dependencies
- Adding new routes or components
- Refactoring existing code
- Before reporting task completion

Do NOT run for:
- Trivial changes (comments, whitespace)
- Non-code files (markdown, images)
- Read-only operations

## Change-Scope-Based Strategy

Use this matrix to determine verification depth:

| Change Scope | Verification Strategy |
|--------------|----------------------|
| Single .ts/.tsx file modified | Type-check affected file only |
| Multiple files in same module | Type-check module |
| package.json changed | npm install + build |
| New route added | Smoke test route accessibility |
| N files changed (N > 5) | Full build |
| Refactor across modules | Full build + type check |

Principle: **Minimize verification cost while ensuring correctness.**

## Steps

### 1. ANALYZE CHANGE SCOPE
- Count modified files
- Identify file types changed
- Check if package.json or lockfile modified
- Detect if new routes/pages added

### 2. SELECT VERIFICATION LEVEL

**Level 0: None**
- Markdown, JSON config, CSS only
- Skip verification

**Level 1: Syntax Check**
- Parse modified files
- Check for syntax errors
- Fast (<1 second)

**Level 2: Type Check (Affected Files)**
- Do NOT run `tsc --noEmit <file>` on individual files — it ignores tsconfig.json and produces false positives
- Instead run project-level `tsc --noEmit --incremental` and filter the output to modified files
- If the project uses project references, build only the affected reference
- Check imports resolve
- Moderate (~5 seconds)

**Level 3: Type Check (Full)**
- Run `tsc --noEmit` on entire project
- Catch cross-file type errors
- Slow (~15 seconds)

**Level 4: Build**
- Run `npm run build` or equivalent
- Ensures production bundle works
- Slow (~30-60 seconds)

**Level 5: Build + Test**
- Run build + `npm test`
- Full correctness verification
- Very slow (~60-120 seconds)

### 3. EXECUTE VERIFICATION
- Run selected verification command in sandbox
- Stream output to user
- Capture exit code
- Parse errors from stderr

### 4. COLLECT RUNTIME CHECKS (if dev server running)
- Check browser console for errors
- Verify hot reload succeeded
- Test affected route in preview
- Check network requests succeed

### 5. PARSE RESULTS
- Extract error messages
- Map errors to file paths and line numbers
- Classify errors: syntax, type, runtime, network

### 6. REPORT
- If exit_code = 0 and no runtime errors → success
- If errors found → return to repair loop with error details

## Output Schema

See ./schemas.ts for VerificationResult, VerificationError, VerificationWarning.

Brief:
- VerificationResult: success, level (0-5), duration_ms, errors[], warnings[]
- VerificationError: file, line, column, message, code, severity
- VerificationWarning: file, line, message, severity

## Decision Tree

```
Is package.json changed?
  Yes → Level 4 (Build)
  No  → Continue

Are >5 files changed?
  Yes → Level 3 (Type Check Full)
  No  → Continue

Are .ts/.tsx files changed?
  Yes → Level 2 (project-level tsc --noEmit --incremental, filtered to changes)
  No  → Continue

Are .js/.jsx files changed?
  Yes → Level 1 (Syntax Check)
  No  → Level 0 (None)
```

## Anti-Patterns

❌ Running full build for single-line CSS change
❌ Skipping type check after TypeScript refactor
❌ Not parsing error output (reporting "build failed" without details)
❌ Running verification on host instead of sandbox
❌ Treating warnings as errors (unless configured)

## Verification Checklist

- [ ] Verification level matches change scope
- [ ] Commands executed in sandbox, not on host
- [ ] Errors parsed and mapped to file locations
- [ ] Runtime checks performed if dev server running
- [ ] Success reported only if exit_code = 0 and no runtime errors

## Tool Permissions

- **EXECUTE**: Run type checker, build commands, tests in sandbox
- **READ**: Read command output, parse errors
