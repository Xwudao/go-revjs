---
name: ui-ux-icon-usage
description: 'Use when polishing react-revjs frontend UI or UX and deciding where UnoCSS icons should be added or refined, especially for buttons, status labels, section headers, helper text, empty states, and compact tool surfaces.'
---

# UI/UX Icon Usage

Use this skill when adjusting revjs frontend interfaces and deciding whether icons should be introduced, changed, or removed.

## When to use

- Polishing page hierarchy or scanability
- Refining buttons, toolbars, tabs, status text, helper text, and empty states
- Adding or reviewing inline icons in TSX
- Keeping icon usage consistent across compact tool pages

## Goal

Add icons when they improve recognition speed, action clarity, or scanning rhythm. Do not add icons mechanically to every label.

The default bias in revjs should be:

- Prefer icons for actions, statuses, and small semantic anchors
- Avoid icon spam in dense forms and repeated content rows
- Keep one local visual language inside the same page area

## Project rules

### Icon source

- Icons come from UnoCSS `@unocss/preset-icons`
- The current project convention uses `i-mdi-*` class names
- Prefer staying in the Material Design Icons family unless there is a clear reason to switch

Examples:

- `i-mdi-code-json`
- `i-mdi-play-circle-outline`
- `i-mdi-check-circle-outline`
- `i-mdi-delete-outline`

### Rendering pattern

In revjs, icons are usually presentational and should use a plain element:

```tsx
<span className="i-mdi-code-json" aria-hidden="true" />
```

When the icon sits next to local module styles or other utility classes, compose it with `clsx`:

```tsx
<span className={clsx('i-mdi-check-bold', classes.icon)} aria-hidden="true" />
```

### Verify before introducing a new icon

Do not guess icon names. Check the icon exists in the local UnoCSS/Iconify dataset used by the project.

For `i-mdi-*`, verify against the installed MDI collection in the workspace dependencies before finalizing a new class name.

If a guessed icon does not exist:

- do not invent a close-looking class
- choose an existing semantic alternative
- keep the same family when possible

## Default decision rules

### Good places to add icons

- Primary and secondary action buttons
- Run, copy, reset, delete, export, and navigation actions
- Section headers when they help distinguish blocks quickly
- Status badges such as ready, running, success, warning, or failed
- Helper text, tips, and empty states when a leading icon improves scanning

### Use sparingly here

- Every field label in a long form
- Every row or cell in repeated data
- Long paragraphs
- Areas that already have strong visual grouping without icon support

## Style guidance

### Prefer semantic icons

Choose immediately recognizable icons:

- Run: play
- Stop: stop
- Copy: content-copy
- Delete/Clear: delete-outline
- Success: check-circle-outline
- Warning: alert or warning
- Info: information-outline or help-circle-outline
- Code/tooling: code-json, code-braces, wrench, cog-outline

### Keep weight under control

- Prefer outline-style icons when a filled icon feels visually heavy
- Keep icon size close to nearby text size
- Usually one icon per action or semantic block is enough
- Avoid stacking multiple unrelated icons around the same label

### Compact page fit

revjs pages are tool-oriented and content-dense. Icons should support compact readability, not turn the page into a decorative surface.

## Review checklist

- [ ] Did the icon improve scanability or action clarity?
- [ ] Did I keep a consistent icon family in the local UI area?
- [ ] Did I avoid adding icons to every repeated label?
- [ ] Did I use `aria-hidden="true"` for purely decorative icons?
- [ ] Did I merge utility classes and module classes with `clsx` when needed?
- [ ] Did I verify any newly introduced icon name actually exists?

## References

- `uno.config.ts`
- `src/components/front-shell.tsx`
- `src/pages/js-deob.tsx`
