---
name: use-modern-go
description: "Apply modern Go guidelines for go-revjs, targeting Go 1.23 features that are valid for this repository."
---

# Modern Go For revjs

This repository targets Go `1.23.0` and uses toolchain `go1.24.2`.

When writing Go code here, prefer modern standard-library patterns that are valid for Go 1.23 without relying on newer language or library features.

## Prefer

- `any` instead of `interface{}`
- `errors.Is` and `errors.As` for wrapped error checks
- `errors.Join` when multiple independent errors need to be returned together
- `strings.Cut`, `strings.CutPrefix`, `strings.CutSuffix` over manual slicing when appropriate
- `slices` and `maps` helpers instead of manual loops when that makes the code clearer
- `min`, `max`, and `clear` where they simplify logic
- `sync.OnceFunc` and `sync.OnceValue` for one-time initialization helpers
- `time.Since` and `time.Until` instead of manual subtraction

## Avoid

- Patterns that require Go 1.24+ language or library behavior in production code
- Legacy helper code when the standard library already provides a clearer option
- Overusing new helpers when a plain loop is still easier to read

## Practical Rule

Use the most modern approach that keeps the code obvious to maintainers already working in this codebase.