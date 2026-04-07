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
