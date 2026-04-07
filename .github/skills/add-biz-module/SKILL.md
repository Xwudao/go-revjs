---
name: add-biz-module
description: "Guide for creating new biz modules in go-revjs. Use when adding business logic modules or generated biz/repo scaffolding."
---

# Add Biz Module In revjs

Use this workflow when adding a new business logic module under `internal/biz`.

## Applicable Structure

- Biz generator declarations live in `internal/biz/gen.go`
- Generated biz files are created in `internal/biz/`
- CRUD repositories are generated in `internal/data/` when `--with-crud` is used

## Steps

### 1. Add a generator directive

Edit `internal/biz/gen.go` and add one line:

```go
//go:generate nr gen -t biz -n your_feature --no-repo
// or
//go:generate nr gen -t biz -n your_feature --with-crud --ent-name YourEntity
```

Use:

- `--no-repo` for pure business logic
- `--with-crud --ent-name YourEntity` when the module needs an Ent-backed repository

### 2. Run generation

From `internal/biz/` run:

```bash
go generate .
```

### 3. Implement the generated module

Keep to existing revjs patterns:

- constructor name: `NewYourFeatureBiz`
- logger naming: `log.Named("your-feature-biz")`
- inject all dependencies explicitly
- define repository interfaces in the biz layer when needed

### 4. Regenerate Wire if constructor dependencies changed

From `cmd/app/` run:

```bash
wire
```

## Notes

- Use `snake_case` in generator names and file names.
- Prefer extending generated files instead of hand-rolling parallel module structure.
- Keep business logic in biz, persistence in data, and transport concerns in routes.