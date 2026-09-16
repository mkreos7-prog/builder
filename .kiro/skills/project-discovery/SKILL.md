---
name: project-discovery
description: Use when encountering an unknown project for the first time. Triggers on project import, first open, or before any write operation on unseen project.
globs: ["**/package.json", "**/package-lock.json", "**/pnpm-lock.yaml", "**/bun.lockb", "**/next.config.*", "**/vite.config.*", "**/astro.config.*"]
alwaysApply: false
---

# Project Discovery

## When to Run

Trigger this skill when:
- User imports an existing project
- First time opening a project in the session
- Before modifying any files in an unseen project
- User explicitly asks "What is this project?"

Do NOT run for:
- Projects already profiled in this session
- Brand new projects you just created

## Steps

1. **Read package.json** to extract name, dependencies, scripts, type
2. **Read lockfiles** (package-lock.json, pnpm-lock.yaml, bun.lockb) to verify exact versions
3. **Detect framework** via dependency analysis:
   - `next` → Next.js
   - `vite` → Vite
   - `astro` → Astro
   - Unknown if none match
4. **Find config files**: next.config.js, vite.config.ts, astro.config.mjs, tsconfig.json, tailwind.config.js
5. **Scan directory structure**:
   - Check for: src/, app/, pages/, components/, lib/, public/, styles/
   - Do NOT assume paths exist — verify with filesystem reads
6. **Parse entry points**:
   - Next.js: app/layout.tsx or pages/_app.tsx
   - Vite: index.html + main.tsx
   - Astro: src/pages/index.astro
7. **Build file index**: 
   - List all source files (*.ts, *.tsx, *.js, *.jsx, *.astro, *.vue)
   - Skip node_modules, .next, dist, build, .git, coverage
   - If total files > 5000, index only src/, app/, pages/, components/, lib/
   - Warn the user if the project is unusually large
8. **Extract routes** (framework-specific):
   - Next.js app router: map app/**/page.tsx to routes
   - Next.js pages router: map pages/**/*.tsx to routes
   - Astro: map src/pages/**/*.astro to routes

## Output Schema

See ./schemas.ts for full ProjectProfile interface.

Brief:
- id, name, framework ("next" | "vite" | "astro" | "unknown")
- version, packageManager
- dependencies, devDependencies
- structure: hasSrc, hasApp, hasPages, hasComponents, directories[]
- entryPoints[], routes[], buildCommand, devCommand, outputDir

## Anti-Patterns

❌ Hardcoding "src/components/Hero.tsx" without verifying src/ exists
❌ Sending entire repository content to LLM
❌ Running discovery multiple times for same project in one session
❌ Assuming Next.js has app/ directory (it might use pages/)
❌ Modifying files before completing discovery

## Verification Checklist

- [ ] Framework detection matches actual dependencies
- [ ] All directory paths verified via filesystem reads
- [ ] Entry points exist and are readable
- [ ] Routes match framework routing conventions
- [ ] Build/dev commands extracted from package.json scripts

## Tool Permissions

- **READ**: Read package.json, lockfiles, config files, directory listings
