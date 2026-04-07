# go-revjs Workspace Guidelines

## Repo Shape
- Go backend code lives under `cmd`, `internal`, and `pkg`.
- Frontend app lives under `web`.
- The JS deobfuscation core lives under `web/packages/js-deob`.


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
	- task: "adding or refactoring a react-revjs page that has substantial state, handlers, or side effects, or extracting logic from a TSX file into a hook file"
		load: ".github/skills/page-hook-split/SKILL.md"
<!-- intent-skills:end -->
