---
name: front-compact-ui
description: 'Use when designing or refactoring react-revjs frontend pages that should feel compact, refined, content-dense, tool-like, doc-like, or suitable for search/detail/BBS style content pages instead of marketing landing pages.'
---

# Front Compact UI

Use this skill when working on revjs frontend pages that should feel small, precise, and efficient.

## Primary Goal

Build frontend pages that read like capable product surfaces, not promotional hero pages.

## Baseline

- Default body copy and labels should usually stay within 12px to 16px.
- Spacing, card padding, and control sizes should stay compact before they become airy.
- Visual polish should come from hierarchy, border rhythm, muted surfaces, and restrained emphasis.
- Search pages, detail pages, tool workbenches, and community-style content pages should optimize scanning efficiency.
- Do not introduce poster-like hero sections, oversized type, or decorative empty space unless explicitly required.

## Copy Rules

- When a page reflects current project state, internal tooling, or implementation status, write copy as project-facing documentation or workbench notes.
- Do not rewrite project-status pages into end-user marketing copy, onboarding copy, or consumer-facing feature explanations unless explicitly requested.
- Prefer language that describes current repo behavior, validation scope, and implementation boundaries over aspirational product claims.
- For ordinary end-user tool pages, strip internal repo wording such as current scope, validation entry, shared core, CLI/Web maintenance, runtime/storage summaries, or similar implementation-facing metadata.
- If the site currently exposes only one tool, keep the homepage minimal and entrance-oriented instead of adding explanatory panels that read like internal status notes.
- Tool pages should explain only what helps a user complete the task now; avoid exposing internal execution details unless they are required for actual operation or troubleshooting.

## RevJS Conventions

- TanStack Router should use the Vite plugin workflow with file-based routes under `src/routes`.
- Keep `src/router.tsx` limited to `createRouter(...)` and import the generated route tree from `src/routeTree.gen.ts`.
- Do not hand-maintain `createRoute` trees in revjs unless there is a concrete routing need that the plugin workflow cannot cover.

## Interaction Rules

- Prefer native-feeling button feedback and simple state changes over hover lift, glow sweeps, or dramatic shadows.
- Keep action groups dense but readable.
- Use light surface separation, subtle status pills, and compact metadata rows.
- Favor persistent utility controls in shared header/footer areas when they help navigation or theme control.
- When replacing raw form controls, prefer reusable project-level components so selects, checkboxes, and similar inputs keep a consistent visual language across tools.
- For code-heavy tool pages, prefer a real editor such as CodeMirror over plain textarea when the task involves reading, editing, or comparing source code.

## Layout Rules

- Reuse shared header, footer, and page container patterns when multiple front pages exist.
- Start from shared tokens in `src/styles/_tokens.scss`.
- Prefer compact cards, split panels, and two-column utility layouts over full-bleed marketing compositions.
- Keep explanatory copy short; tool pages should show state, controls, and output early.
- On tool pages, prioritize the work surface: controls first, editor/result regions early, and logs or secondary notes after the main task flow.
- For code-heavy tool pages, prefer a full-width control strip above the workspace so source/result editors can keep an equal two-column split on desktop.

## Tool Page Layout Pattern

Use this pattern when designing or redesigning workbench-style tool pages (e.g. js-deob, crypto-lab).

### Structure (top to bottom)

```
<main page>
  <div panel toolbar>       ← compact strip, ~40px tall
  <div editors-grid>        ← equal 2-column on desktop
  <div bottom-row>          ← options left + summary/log right
</main>
```

### Toolbar

- Left side: brand name (icon + text, 600 weight) + status badge pill.
- Right side: all action buttons, grouped by function with `1px` dividers between groups.
- Group order: **primary action** (accent fill) + cancel/stop | source manipulations (format, import, paste) | output manipulations (compress, backfill, copy, download) | destructive/reset.
- Status badge uses a `data-*` attribute (e.g. `data-running`) for state variants — keep colour in SCSS, not inline style.
- Divider element: `width:1px; height:1.25rem; background:var(--color-border-soft)` with `aria-hidden="true"`.

### Editors

- Always equal two-column split (`repeat(2, minmax(0, 1fr))`), collapse to single column at ≤ 860px.
- No per-editor action buttons — consolidate everything into the toolbar.
- Each editor column is a panel with an `editor-head` row: title (section-title style) + encoding/char/line metadata on the right.
- Inline feedback (note or error) sits between the head row and the CodeEditor, inside the same panel.
- Wrap each `<CodeEditor>` in a `<div className={clsx(classes.editorWrap)}>` and add a `.editor-wrap` SCSS class with `padding: var(--space-3); flex: 1; min-height: 0; display: flex; flex-direction: column;`. This creates breathing room so the editor's own border doesn't touch the panel border.
- Do NOT place `<CodeEditor>` flush against a parent panel's border — always use the `editorWrap` padding layer.

### CodeEditor border rule

CodeEditor has its own `border` and `border-radius: var(--radius-xl)`. When embedded inside a panel (which also has a border), the two adjacent borders create a visual conflict. Always resolve this by adding `padding: var(--space-3)` via an `editorWrap` wrapper div. This insets the editor from the panel edge and makes the nested-card structure intentional and clean.

### Token safety rules

Only use CSS variables that are defined in `src/styles/_tokens.scss`. Common mistakes to avoid:
- `--color-text-primary` does not exist → use `--color-text-strong`
- `--color-text-secondary` does not exist → use `--color-text-muted`
- `--color-surface-raised` does not exist → use `--color-surface`
- `--color-surface-hover` does not exist → use `color-mix(in srgb, var(--color-surface-muted) 80%, transparent)`
- `--color-border` does not exist → use `--color-border-strong` (hover) or `--color-border-soft` (default)
- `--color-error` / `--color-error-subtle` / `--color-error-muted` do not exist → use `--color-danger` and `color-mix(in srgb, var(--color-danger) 10–25%, transparent)`
- `--color-success-subtle` / `--color-success-muted` do not exist → use `color-mix(in srgb, var(--color-success) 12–28%, transparent)`
- For primary (accent-fill) buttons **always use `color: var(--color-accent-contrast)`** instead of hardcoding `#fff` — `--color-accent-contrast` is `#04150e` in dark mode and `#ffffff` in light mode, ensuring correct contrast in both themes.

### Sticky toolbar

Add `position: sticky; top: 3.75rem; z-index: calc(var(--z-header) - 1)` to the toolbar panel to keep it pinned below the global site header as the user scrolls through long editor/options content. The site header occupies `3.75rem` at `top: 0` and `z-index: var(--z-header)` = 40. The toolbar sticks at 39 to remain below it.

### Spacing token half-steps (defined in _tokens.scss)

`--space-0-5` (0.125rem), `--space-1-5` (0.375rem), and `--space-2-5` (0.625rem) are explicitly defined. Use them freely for compact control gaps and paddings.

### Bottom row

- Grid: `minmax(0, 1fr)` options panel + `minmax(18rem, 24rem)` secondary panel. Collapse to single column at ≤ 1120px.
- Options panel: `auto-fill minmax(13rem, 1fr)` form grid. Show/hide conditional fields via JSX; do not CSS-hide them.
- Secondary panel: result summary `<dl>` or an empty-state `<p>`; no actions, purely informational.

### Remove from tool pages

- Hero sections (gradient banner, kicker, large title, highlight pills, feature copy)
- Preset/quick-fill dropdown UIs (`presets[]` arrays and related state)
- Tips / usage sidebars ("使用建议" panels)
- Sticky action bars inside the editor workbench area

## Mobile responsiveness

Always verify that tool pages do not overflow horizontally at 375px (iPhone viewport). Test with the Playwright MCP browser resized to 390×844 and check `document.documentElement.scrollWidth === document.documentElement.clientWidth`.

### Toolbar wrapping rules

The standard toolbar pattern splits into `.toolbar-left` (brand + badge) and `.toolbar-actions` (all buttons). Both MUST wrap correctly on mobile:

- **Always** add `flex-wrap: wrap` to the **outer toolbar** element (e.g. `.foo-toolbar`).
- **Always** add `flex-wrap: wrap` to the **actions wrapper** (`.*-toolbar-actions`).
- **Never** use `flex-shrink: 0` on the actions wrapper — this prevents proper wrapping and causes horizontal overflow.

The correct CSS pattern (matching js-deob's working toolbar):
```scss
.foo-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;           /* ← required */
  justify-content: space-between;
  gap: var(--space-3);
  ...
}

.foo-toolbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;           /* ← required */
  gap: var(--space-1-5);
  /* do NOT add flex-shrink: 0 */
}
```

### CSS Grid min-width safety

The `front-shell` uses `display: grid; grid-template-rows: auto 1fr auto`. Grid items default to `min-width: auto`, which means their computed width can exceed the grid track width if any child's min-content size is wide. This causes cascade overflow: toolbar overflow → body widens → header stretches to match.

Always set `min-width: 0` on the `front-shell-body` grid item in `front-shell.module.scss` to prevent this cascade.

### Overflow root-cause diagnosis

When a tool page overflows on mobile, diagnose with:
```js
// 1. Check total overflow
document.documentElement.scrollWidth + ' vs ' + document.documentElement.clientWidth

// 2. Find the offending element
const all = document.querySelectorAll('*');
for (const el of all) {
  if (el.scrollWidth > el.clientWidth + 2) {
    console.log(el.className, el.scrollWidth, window.getComputedStyle(el).flexWrap);
  }
}
```
Look for elements with `flex-wrap: nowrap` (default) + `flex-shrink: 0` in the overflow chain — these are the common culprits.

## Avoid

- Large hero banners with broad decorative gradients as the main UI structure
- Oversized headings or labels by default
- Heavy drop shadows, floating hover animations, or brand-first embellishment
- Long blocks of onboarding copy when the page can communicate with metadata, labels, and action placement
