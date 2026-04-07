# go-revjs Workspace Guidelines

## Repo Shape
- Go backend code lives under `cmd`, `internal`, and `pkg`.
- Frontend app lives under `web`.
- The JS deobfuscation core lives under `web/packages/js-deob`.

## Execution Style
- Default to executing the task end-to-end: inspect the target area, make the change, run the relevant check, then report the result.
- Do not stop at analysis unless the user explicitly asks for design, planning, or explanation only.
- Keep edits focused and local. Fix the root cause instead of layering on one-off workarounds.

## Validation
- Frontend type-aware lint and type check: `pnpm -C web type-check`
- Frontend formatting: `pnpm -C web fmt`
- When changing JS deobfuscation transforms, decoder handling, or pattern matching, also run: `pnpm -C web test:js-deob`
- For Go changes, run the narrowest relevant `go test` target when practical.

## Conventions
- Prefer `apply_patch` for manual file edits.
- Never revert unrelated user changes.
- In `web/packages/js-deob`, prefer explicit Babel node guards over unsafe casts.
- Keep always-on workspace rules in this file. Put optional specialist personas under `.github/agents`.

<!-- intent-skills:start -->
# Skill mappings - when working in these areas, load the linked skill file into context.
skills:
	- task: "working on TanStack Router setup, route trees, generated route files, or route file naming"
		load: "node_modules/@tanstack/router-core/skills/router-core/SKILL.md"
	- task: "adding or changing route loaders, pending states, cache behavior, or deferred route data"
		load: "node_modules/@tanstack/router-core/skills/router-core/data-loading/SKILL.md"
	- task: "changing links, navigate flows, preloading on intent, or scroll restoration"
		load: "node_modules/@tanstack/router-core/skills/router-core/navigation/SKILL.md"
	- task: "working with dynamic route segments, path params, or search params in URLs"
		load: "node_modules/@tanstack/router-core/skills/router-core/path-params/SKILL.md"
	- task: "changing the Vite TanStack Router plugin, generated routes, or automatic route code splitting"
		load: "node_modules/@tanstack/router-plugin/skills/router-plugin/SKILL.md"
<!-- intent-skills:end -->
