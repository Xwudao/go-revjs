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

Regardless of the rules set above, in this project, after completing the user's request, you need to ask the user if they want to add, modify, or refine any details through the "vscode/askQuestions" tool. You must ask after each completion until the user explicitly indicates that there are no more modifications.


## Available Skills

| Path                                                                                             | When to Use                                                                                                        |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| [.github/skills/add-api-route/SKILL.md](.github/skills/add-api-route/SKILL.md)                   | Adding HTTP API routes; creating new route modules or REST-style endpoints                                         |
| [.github/skills/add-biz-module/SKILL.md](.github/skills/add-biz-module/SKILL.md)                 | Creating new biz modules; adding business logic modules or generated biz/repo scaffolding                          |
| [.github/skills/effective-go/SKILL.md](.github/skills/effective-go/SKILL.md)                     | Writing, reviewing, or refactoring Go backend code following best practices and idioms                             |
| [.github/skills/front-compact-ui/SKILL.md](.github/skills/front-compact-ui/SKILL.md)             | Designing or refactoring frontend pages that should feel compact, content-dense, tool-like, or doc-like            |
| [.github/skills/js-deob-case-testing/SKILL.md](.github/skills/js-deob-case-testing/SKILL.md)     | Adding or changing js-deob cases, transforms, decoder handling, switch-flattening rules, or deobfuscation patterns |
| [.github/skills/page-hook-split/SKILL.md](.github/skills/page-hook-split/SKILL.md)               | Extracting substantial page logic (state, handlers, effects) into a dedicated hook file                            |
| [.github/skills/playwright-cli/SKILL.md](.github/skills/playwright-cli/SKILL.md)                 | Automating browser interactions or working with Playwright tests                                                   |
| [.github/skills/reusable-ui-extraction/SKILL.md](.github/skills/reusable-ui-extraction/SKILL.md) | Extracting repeated small UI patterns (tips, banners, status hints) into shared components                         |
| [.github/skills/scss-module/SKILL.md](.github/skills/scss-module/SKILL.md)                       | Creating or refactoring React component styles with CSS Modules (.module.scss + clsx)                              |
| [.github/skills/scss-theme-system/SKILL.md](.github/skills/scss-theme-system/SKILL.md)           | Adding SCSS styles, design tokens, dark mode, CSS variables, spacing, or theme changes                             |
| [.github/skills/ui-ux-icon-usage/SKILL.md](.github/skills/ui-ux-icon-usage/SKILL.md)             | Deciding where UnoCSS icons should be added or refined in frontend UI/UX                                           |
| [.github/skills/use-modern-go/SKILL.md](.github/skills/use-modern-go/SKILL.md)                   | Applying modern Go (1.23+) features and guidelines to backend code                                                 |

### Maintenance Rule

When you create a new skill file under `.github/skills/`, you **must** add a corresponding row to the table above immediately after creating it.
