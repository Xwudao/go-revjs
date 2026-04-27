---
name: ui-ux-icon-usage
description: 'Use when polishing react-revjs frontend UI or UX and deciding where UnoCSS icons should be added or refined, especially for buttons, status labels, section headers, helper text, empty states, and compact tool surfaces.'
---

# UI/UX Icon Usage

Use this skill when adjusting revjs frontend interfaces and deciding whether icons should be introduced, changed, or removed.

## Goal

Add icons when they improve recognition speed, action clarity, or scanning rhythm. Do not add icons mechanically to every label.

Bias in revjs:

- Prefer icons for actions, statuses, and small semantic anchors.
- Avoid icon spam in dense forms and repeated content rows.
- Keep one local visual language inside the same page area.

## Icon Source

- Icons come from UnoCSS `@unocss/preset-icons` using `i-mdi-*` class names.
- Stay in the Material Design Icons family unless there is a clear reason to switch.
- **Always verify** a new icon name exists in the local dataset before using it:
  ```bash
  grep '"icon-name"' web/node_modules/@iconify/json/json/mdi.json
  ```
  Do not rely on memory alone. If an icon doesn't exist, pick an existing semantic alternative.

## Rendering Pattern

Presentational icons use `<span className="i-mdi-..." aria-hidden="true" />`. When mixing utility and module classes, use `clsx`.

See `web/src/pages/js-deob.tsx` for inline icon usage examples.

## Good Places for Icons

- Primary and secondary action buttons
- Run, copy, reset, delete, export, and navigation actions
- Section headers when they help distinguish blocks quickly
- Status badges: ready, running, success, warning, failed
- Helper text, tips, and empty states when a leading icon improves scanning

## Use Sparingly

- Every field label in a long form
- Every row or cell in repeated data
- Areas that already have strong visual grouping

## Semantic Icon Defaults

| Meaning        | Icon                              |
| -------------- | --------------------------------- |
| Run            | `i-mdi-play-circle-outline`       |
| Copy           | `i-mdi-content-copy`              |
| Delete / Clear | `i-mdi-delete-outline`            |
| Success        | `i-mdi-check-circle-outline`      |
| Warning        | `i-mdi-alert-outline`             |
| Info           | `i-mdi-information-outline`       |
| Code / tooling | `i-mdi-code-json`, `i-mdi-wrench` |

Prefer outline-style icons when a filled icon feels heavy. Keep size close to nearby text size.

## Review Checklist

- [ ] Icon improves scanability or action clarity
- [ ] Consistent icon family in the local UI area
- [ ] Not added to every repeated label
- [ ] `aria-hidden="true"` on decorative icons
- [ ] `clsx` used when merging utility and module classes
- [ ] New icon name verified against `web/node_modules/@iconify/json/json/mdi.json`

## References

- `web/uno.config.ts`
- `web/src/components/front-shell.tsx`
- `web/src/pages/js-deob.tsx`
