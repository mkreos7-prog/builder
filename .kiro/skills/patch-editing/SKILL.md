---
name: patch-editing
description: Use when modifying existing files. Triggers on all file edit operations during project manipulation.
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.json", "**/*.css", "**/*.html"]
alwaysApply: false
---

# Patch Editing

## When to Run

Use this skill for all file modifications:
- Fixing bugs in existing code
- Adding new functions to existing files
- Updating configuration files
- Refactoring existing implementations
- Changing styles or markup

Do NOT use for:
- Creating new files (use file-operations skill)
- Reading files (use read tools)
- Deleting files (use file-operations skill)
- Moving or renaming files (use file-operations skill)

## Steps

### 1. LOCATE
- Read current file content
- Calculate SHA-256 hash of content
- Store hash as `expected_hash`
- Identify exact lines/sections to modify

### 2. GENERATE PATCH
- Create minimal diff that changes only necessary lines
- Preserve:
  - Indentation style (tabs vs spaces)
  - Line endings (LF vs CRLF)
  - Surrounding code structure
  - Comments and whitespace
- Generate unified diff format

### 3. VALIDATE PATCH
- Apply patch to in-memory copy
- Parse result (syntax check)
- Verify imports still resolve
- Check indentation consistency
- Confirm no unintended changes

### 4. CHECKPOINT
- If this is part of a batch (>1 file):
  - Create checkpoint before applying
  - Store file hashes in checkpoint metadata

### 5. APPLY
- Send patch with `expected_hash`
- If hash mismatch:
  - Re-read file (concurrent change detected)
  - Regenerate patch against new content
  - Retry apply
- If apply fails after 2 attempts → abort and report conflict

### 6. VERIFY
- Read file after write
- Confirm changes applied correctly
- Run quick syntax check if language supports it

## Patch Format

```typescript
interface PatchOperation {
  file_path: string
  expected_hash: string // SHA-256 of current content
  patch: string // unified diff format
  description: string // human-readable change description
}

interface PatchResult {
  success: boolean
  new_hash: string
  lines_changed: number
  error?: string
}
```

## Example Patch

```diff
--- src/components/Button.tsx
+++ src/components/Button.tsx
@@ -5,7 +5,7 @@
 export function Button({ onClick, children }: ButtonProps) {
   return (
-    <button onClick={onClick}>
+    <button onClick={onClick} className="btn-primary">
       {children}
     </button>
   )
```

## Anti-Patterns

❌ Rewriting entire file for one-line change
❌ Modifying unrelated code in same file
❌ Not checking expected_hash (risk of overwriting concurrent edits)
❌ Changing indentation style from project convention
❌ Applying multiple patches without checkpoints

## Verification Checklist

- [ ] Patch affects only necessary lines
- [ ] expected_hash calculated before modification
- [ ] Indentation and style preserved
- [ ] Syntax valid after patch
- [ ] Checkpoint created for batch operations
- [ ] File re-read after write to confirm changes

## Tool Permissions

- **READ**: Read file content, calculate hash
- **WRITE**: Apply patch to file
