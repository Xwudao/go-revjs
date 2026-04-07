---
name: js-deob-case-testing
description: "Use when adding or changing js-deob cases, transforms, decoder handling, switch-flattening rules, or deobfuscation pattern support. Requires adding or updating focused tests for the new case and running the full js-deob test suite to confirm existing behavior is not broken."
---

# JS Deob Case Testing

Use this skill whenever you touch `web/packages/js-deob` behavior.

## When To Use

- Adding support for a new obfuscation case or deobfuscation pattern
- Adjusting decoder discovery, string replacement, object inlining, or control-flow flattening
- Changing CLI behavior that depends on transform output
- Refactoring existing js-deob transforms in a way that can change output

## Required Workflow

1. Add or update focused tests for the exact case you changed.
2. Prefer the smallest test surface that proves the behavior.
3. Place transform-level tests next to the transform under `src/**/test`.
4. Use inline snapshots when the expected output is short and stable.
5. If the fix protects against regressions, include a test that would fail before the change.
6. Run the full js-deob suite, not only the new test.
7. Do not consider the task complete if old tests are broken.

## Test Commands

- Package scope: `pnpm --filter @revjs/js-deob run test`
- Workspace scope: `pnpm --dir web test:js-deob`

## Expectations

- Every new case must come with at least one automated test.
- Behavior-preserving refactors should keep existing snapshots or update them only with clear justification.
- If a new case is only partially handled, state what remains uncovered and add a test for the supported portion.