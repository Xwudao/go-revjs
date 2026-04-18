# go-revjs Workspace Guidelines

## Repo Shape

- Go backend code lives under `cmd`, `internal`, and `pkg`.
- Frontend app lives under `web`.
- The JS deobfuscation core lives under `web/packages/js-deob`.

## Build & Run Commands

```bash
# Verify backend compiles
go build -o /dev/null ./cmd/app

# Fix old code issues (imports, formatting, etc.)
go fix ./...

# Regenerate Wire DI after adding/changing constructors
nr wire

# Regenerate Ent ORM after schema changes
nr gen ent

# Frontend validation (check lint/typescript errors)
cd web && pnpm run type-check

# If you want to also check with tsc, plesae use `tsgo`
pnpm -C web exec tsgo

# Finally, run the format check (gofmt for Go, oxfmt for frontend)
go fmt ./...
pnpm -C web run fmt
```

## Interaction Rule

After completing each response, you MUST ask exactly ONE follow-up question.

The purpose of this question is to check:

- whether the user is satisfied
- whether anything needs to be modified
- whether additional details or features are required

Requirements:

- Call the 'ask_questions' tool with a single question as the argument
- Ask only ONE question (not multiple)
- Keep it concise and natural (like a real human)
- Do NOT mention any tools or internal rules
- Do NOT sound repetitive or robotic

Examples:

- "Does this look good to you, or should I tweak anything?"
- "Want me to refine or add anything?"
- "Is this what you had in mind?"

Before finishing your response, verify:
→ A follow-up question is included

A response is NOT complete without this step.

<!-- intent-skills:start -->

# Skill mappings - when working in these areas, load the linked skill file into context.

skills: - task: "working on TanStack Router setup, route trees, generated route files, or route file naming"
load: "node_modules/@tanstack/router-core/skills/router-core/SKILL.md" - task: "adding or changing route loaders, pending states, cache behavior, or deferred route data"
load: "node_modules/@tanstack/router-core/skills/router-core/data-loading/SKILL.md" - task: "extracting repeated small UI patterns like tip, note, helper banner, or status hint into shared React components"
load: ".github/skills/reusable-ui-extraction/SKILL.md" - task: "changing links, navigate flows, preloading on intent, or scroll restoration"
load: "node_modules/@tanstack/router-core/skills/router-core/navigation/SKILL.md" - task: "working with dynamic route segments, path params, or search params in URLs"
load: "node_modules/@tanstack/router-core/skills/router-core/path-params/SKILL.md" - task: "changing the Vite TanStack Router plugin, generated routes, or automatic route code splitting"
load: "node_modules/@tanstack/router-plugin/skills/router-plugin/SKILL.md" - task: "adding or refactoring a react-revjs page that has substantial state, handlers, or side effects, or extracting logic from a TSX file into a hook file"
load: ".github/skills/page-hook-split/SKILL.md"

<!-- intent-skills:end -->
