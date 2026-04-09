---
name: reusable-ui-extraction
description: 'Use when a react-revjs page repeats the same small UI pattern such as tip, note, helper banner, status hint, or other reusable JSX + SCSS blocks across multiple pages and should be extracted into a shared component.'
---

# Reusable UI Extraction

Use this skill when the frontend starts repeating the same small presentational pattern in multiple pages.

Typical triggers:

- the same `tip` or `note` block appears in two or more pages
- helper banners, empty-state hints, or inline status rows are copied with only text changes
- TSX and SCSS both duplicate a local pattern that is not page-specific

## Goal

Promote repeated UI fragments into shared components early enough that the codebase keeps one visual language and one maintenance point.

## Extraction rule

If a small UI pattern is likely to be reused in many places, do not keep cloning page-local JSX and SCSS.
Extract it into a shared component under `web/src/components/ui` with a small, explicit API.

Examples:

- `Tip`
- `EmptyState`
- `SectionNotice`
- `InlineMeta`

## When extraction is warranted

Extract when at least one of these is true:

- the same structure already exists in multiple pages
- a new feature is about to add the third copy
- the pattern encodes shared visual semantics like info, warning, success, hint, or helper copy
- future copy changes should update all instances consistently

Do not extract if the block is deeply tied to one page's domain structure or if the API would become vague and over-configured.

## Preferred workflow

1. Search the repo for similar JSX and SCSS before editing.
2. Identify the common structure and the true variability.
3. Create a shared component with a minimal prop surface.
4. Move shared styling next to that component as a `.module.scss` file.
5. Replace existing copies in current pages.
6. Remove dead page-local selectors after migration.

## API design rules

- Keep props small and semantic, for example `variant`, `tone`, `iconClassName`, `children`.
- Prefer composable children over many string-only props.
- Do not bake page names or domain terms into a shared component.
- Avoid creating a catch-all component with too many boolean props.

## Placement rules for revjs

- Shared presentational components go in `web/src/components/ui`.
- Use `.module.scss` and import it as `classes`.
- Use `clsx(...)` for local class composition.
- Start from tokens in `web/src/styles/_tokens.scss`.

## Tip-specific guidance

For repeated info-style tip blocks:

- define one shared `Tip` component
- support only the variants that actually exist in the repo
- separate visual style from message text
- replace page-local `.xxx-note`, `.xxx-tip`, `.xxx-hint` selectors once migrated

## Avoid

- copying the same tip block into each page and changing only the text
- extracting too late after many pages have already drifted visually
- keeping both the shared component and the old page-local version alive without reason
- adding configuration for speculative future cases that do not exist yet
