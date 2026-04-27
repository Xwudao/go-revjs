---
name: scss-module
description: 'Use when creating or refactoring React component styles in react-revjs with CSS Modules, especially when converting local .scss files to .module.scss with classes imports and clsx class composition.'
---

# SCSS Module

Use this skill when a revjs React component or page should use local scoped styles instead of a plain `.scss` import.

## When to use

- Converting component-level or page-level `.scss` files to `.module.scss`
- Adding new scoped styles for a TSX component
- Refactoring class-heavy JSX into `classes + clsx` usage

## Core Rules

1. Name the stylesheet `.module.scss` and keep it next to the component or page.
2. Import the module as `classes`.
3. Wrap every local class reference with `clsx(...)`, even when there is only one class.
4. Prefer kebab-case selectors in SCSS; access via generated camelCase names in TSX.
5. Keep global `.scss` imports only for true app-wide styles such as `src/styles/index.scss`.

## Import and Composition Pattern

Import as `classes`, use `clsx` for all class bindings including inline icon utility classes (e.g. `i-mdi-*`). Never build class strings manually.

See `web/src/pages/string-tools.tsx` and `web/src/pages/string-tools.module.scss` for a working reference.

## Styling Guidance

- Start from tokens in `web/src/styles/_tokens.scss`.
- Reuse the shared mixins injected from `@/styles/mixins` when useful.
- Prefer CSS variables over hard-coded values.
- Keep surfaces compact and tool-like.
- Keep selectors shallow and local.

## Allowed Exceptions

Use `:global(...)` only when styling DOM owned by a third-party library such as CodeMirror.

## Avoid

- Mixing `styles`, `s`, or other import names when `classes` is the project convention
- Building class strings manually when `clsx` is clearer
- Leaving page/component-scoped styles in plain `.scss` files if they are not intended to be global
- Importing local `.module.scss` for side effects only

## References

- `web/src/pages/string-tools.module.scss`
- `web/src/pages/js-deob.module.scss`
- `web/src/styles/_tokens.scss`
