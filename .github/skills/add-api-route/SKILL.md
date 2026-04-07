---
name: add-api-route
description: "Guide for adding HTTP API routes in go-revjs. Use when creating new route modules or REST-style endpoints."
---

# Add API Route In revjs

Use this workflow when adding a new route module under `internal/routes/v1`.

## Applicable Structure

- Route generator declarations live in `internal/routes/v1/gen.go`
- Generated route files live in `internal/routes/v1/`
- Route providers are registered through `internal/routes/provider.go`

## Steps

### 1. Add a generator directive

Edit `internal/routes/v1/gen.go` and add:

```go
//go:generate nr gen -t route -n your_feature --v2
```

### 2. Run generation

From `internal/routes/v1/` run:

```bash
go generate .
```

### 3. Implement the generated route file

Match revjs conventions:

- constructor name: `NewYourFeatureRoute`
- logger naming: `log.Named("your-feature-route")`
- group paths under the existing `/v1`, `/auth/v1`, or `/admin/v1` patterns as appropriate
- use `core.WrapData(...)` and return `(any, *core.RtnStatus)` through wrapped handlers when the module follows that style
- apply `mdw.MustLoginMiddleware()` or `mdw.MustWithRoleMiddleware(...)` where access control is required

### 4. Register and wire dependencies

- Ensure the new route constructor is included in `internal/routes/provider.go` if generation did not already add it
- Re-run Wire from `cmd/app/` if constructor dependencies changed

## Notes

- Use `snake_case` for route generator names.
- Prefer reusing existing route grouping and validation patterns.
- Keep request binding, permission checks, and response shaping in the route layer; keep business logic in biz.