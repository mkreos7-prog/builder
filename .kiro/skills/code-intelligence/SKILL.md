---
name: code-intelligence
description: Use when you need to understand code relationships, find symbol definitions, trace imports, or analyze call graphs. Triggers when modifying files with dependencies or refactoring.
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
alwaysApply: false
---

# Code Intelligence

## When to Run

Use this skill when:
- Renaming a function/component used across multiple files
- Removing a module and need to find all imports
- Understanding how a feature is implemented across files
- Tracing data flow from API to UI
- Finding unused exports

Do NOT use for:
- Simple single-file edits
- Adding new files with no dependencies
- Cosmetic changes (styling, comments)

## Steps

1. **Text Search First** (fast, good enough for most cases):
   - Use ripgrep to find import statements
   - Search for function/class names as strings
   - Filter by file extension (*.ts, *.tsx)

2. **AST Parse on Demand** (only when text search is insufficient):
   - Parse TypeScript/JavaScript with Tree-sitter or TypeScript compiler API
   - Extract: imports, exports, function signatures, class definitions
   - Build symbol table per file

3. **Build Dependency Graph**:
   - File → exports → Symbol
   - Symbol → usedBy → File
   - File → imports → Symbol → definedIn → File

4. **Progressive Refinement**:
   - Start with direct imports/exports
   - Expand to transitive dependencies only if needed
   - Stop when sufficient context gathered

## Tools

**ripgrep** (text search)
- Fast for finding import statements: `import.*ComponentName`
- Good for usage detection: `<ComponentName`
- Pattern: `export (function|const|class) SymbolName`

**Tree-sitter** (AST parsing)
- Language-agnostic parser
- Fast incremental parsing
- Query language for finding nodes

**TypeScript Compiler API** (type-aware analysis)
- Resolves type imports vs value imports
- Follows type references
- Expensive: use only for refactoring/type changes

## Common Queries

### 1. find_references(SymbolName)

- Use ripgrep for the symbol as a word boundary: `\bSymbolName\b`
- Filter to .ts/.tsx files
- AST-verify each match is a real reference (not a comment/string)
- Return file + line + column for each reference

### 2. trace_import_chain(from_file, to_file)

- Start at from_file exports
- Build import graph: for each export, find files that import it
- Expand imports BFS until to_file reached
- Cap depth at 6 hops (prevent infinite loops)
- Return the shortest chain: from_file → intermediate_file_1 → ... → to_file

### 3. find_unused_exports(module_path)

- Collect all exports of module_path using AST parsing
- For each export name, run ripgrep across the project
- AST-confirm each match is a real import (not a string literal)
- Return exports with zero real imports

## Output Schema

See ./schemas.ts for CodeGraph, FileNode, SymbolNode.

Brief:
- CodeGraph: files (map of FileNode), symbols (map of SymbolNode)
- FileNode: path, exports[], imports[]
- SymbolNode: id, name, kind, definedIn, usedBy[], isExported

## Anti-Patterns

❌ Parsing entire project with AST for simple rename
❌ Building full call graph before every edit
❌ Using TypeScript compiler API for non-type-related searches
❌ Sending entire dependency graph to LLM

## Verification Checklist

- [ ] Text search tried before AST parsing
- [ ] Graph includes only files relevant to current task
- [ ] Unused exports identified correctly
- [ ] Import paths resolve correctly (relative vs absolute)

## Tool Permissions

- **READ**: Read source files, parse AST
