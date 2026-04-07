---
name: effective-go
description: "Apply Go best practices, idioms, and conventions when writing, reviewing, or refactoring go-revjs backend code."
---

# Effective Go For revjs

Apply idiomatic Go conventions to revjs backend changes.

## When To Use

- Writing new Go code in `internal/`, `pkg/`, or `cmd/`
- Reviewing or refactoring existing Go implementations
- Adding middleware, biz logic, routes, cron jobs, or data-layer code

## Core Rules

- Always keep code `gofmt`-clean.
- Prefer clear, small functions and straightforward control flow.
- Keep interface surfaces narrow and define interfaces close to the consumer.
- Return errors instead of panicking; wrap with context only when it adds signal.
- Put `context.Context` first in function signatures when the call is request- or task-scoped.
- Use constructor injection instead of creating dependencies inline.

## revjs Conventions

- Package names stay short and lowercase.
- Constructors use `NewXxx...` naming.
- Biz and route loggers should use `log.Named("...")`.
- Route handlers should follow existing `core.WrapData(...)` usage when applicable.
- Keep changes aligned with generated code patterns instead of inventing parallel abstractions.

## Reminders

- Prefer the standard library when it is sufficient.
- Avoid adding comments unless the code would otherwise be hard to parse.
- Keep exported APIs documented when you introduce new exported symbols.