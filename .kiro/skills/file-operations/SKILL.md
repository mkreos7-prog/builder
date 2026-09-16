---
name: file-operations
description: Use when creating, moving, copying, or deleting files in a project. Triggers on new file creation, file move, file rename, or file deletion requests.
globs: []
alwaysApply: false
---

# File Operations

## When to Run

Use this skill when:
- Creating a new file
- Moving or renaming a file
- Copying a file within the project
- Deleting a file

Do NOT run for:
- Editing existing file content (use patch-editing)

## Steps

### 1. CHECK EXISTENCE

For **create**:
- List parent directory to confirm target path is free
- Refuse to overwrite without explicit overwrite flag

For **move/delete**:
- Verify source file exists
- For move, verify target path is free

### 2. CHECKPOINT

- Create checkpoint before delete/move
- Not required for create

### 3. ACT

**create_file(path, content)**
- Write new file to specified path
- No expected_hash needed (file doesn't exist yet)

**move_file(from, to)**
- Read source file content
- Write to target path
- Delete source file
- If the target filesystem supports atomic rename (POSIX rename), use it. Otherwise, perform read + write + delete, and record the operation in the checkpoint so it can be replayed on crash.

**copy_file(from, to)**
- Read source file content
- Write to target path
- Keep source file intact

**delete_file(path, expected_hash)**
- Require expected_hash to prevent deleting a concurrently modified file
- Delete file if hash matches

### 4. VERIFY

- List parent directory to confirm operation is reflected
- For create/move/copy, read back the file and confirm content matches

### 5. UPDATE INDEX

- Notify the code intelligence index of the change
- Add file to index (create/copy/move target)
- Remove file from index (delete/move source)

## Output Schema

See ./schemas.ts for FileOpResult.

Brief:
- FileOpResult: success, path, error (optional)

## Anti-Patterns

❌ Creating a file without checking if it already exists
❌ Deleting without expected_hash
❌ Using write_file to edit an existing file (use patch-editing)
❌ Moving file without checkpoint
❌ Not updating code intelligence index after operation

## Verification Checklist

- [ ] Parent directory verified before act
- [ ] Checkpoint created before delete/move
- [ ] expected_hash required for delete
- [ ] File re-read after create/move/copy
- [ ] Code intelligence index notified

## Tool Permissions

- **READ**: List parent directory, read source file for move/copy
- **WRITE**: create_file, move_file, copy_file
- **DELETE**: delete_file (requires explicit confirmation when the file is imported elsewhere in the project, or when it has uncommitted changes tracked by the project version system)
