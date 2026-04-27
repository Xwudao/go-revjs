---
name: front-compact-ui
description: 'Use when designing or refactoring react-revjs frontend pages that should feel compact, refined, content-dense, tool-like, doc-like, or suitable for search/detail/BBS style content pages instead of marketing landing pages.'
---

# Front Compact UI

Use this skill when working on revjs frontend pages that should feel small, precise, and efficient.

## Primary Goal

Build frontend pages that read like capable product surfaces, not promotional hero pages.

## Baseline

- Default body copy and labels should stay within 12–16px.
- Spacing, card padding, and control sizes should stay compact before they become airy.
- Visual polish should come from hierarchy, border rhythm, muted surfaces, and restrained emphasis.
- Search pages, detail pages, tool workbenches, and community-style pages should optimize scanning efficiency.

## Copy Rules

- Write project-status pages as workbench notes or documentation, not end-user marketing copy.
- Tool pages explain only what helps a user complete the task now.
- Strip internal metadata labels (e.g. "current scope", "validation entry", "shared core") from ordinary tool pages.

## RevJS Conventions

- TanStack Router uses the Vite plugin workflow with file-based routes under `src/routes`.
- Keep `src/router.tsx` limited to `createRouter(...)`.

## Interaction Rules

- Prefer native-feeling button feedback over hover lift, glow sweeps, or dramatic shadows.
- Keep action groups dense but readable.
- Prefer CodeMirror over plain textarea for code-heavy tool pages.
- Use `<AppSelect>` and similar project-level components for consistent form controls.

## Tool Page Layout Pattern

Structure (top to bottom):

```
<main page>
  <div panel toolbar>       ← compact strip, ~40px tall, sticky below header
  <div editors-grid>        ← equal 2-column on desktop, collapse ≤860px
  <div bottom-row>          ← options left + summary/log right
</main>
```

- **Toolbar**: left = brand + badge; right = action buttons grouped with `1px` dividers. Add `position: sticky; top: 3.75rem; z-index: calc(var(--z-header) - 1)`. Always add `flex-wrap: wrap` to both the outer toolbar and the actions wrapper; never add `flex-shrink: 0` to actions wrapper.
- **Editors**: equal `repeat(2, minmax(0, 1fr))`. Always wrap each `<CodeEditor>` in an `editorWrap` div with `padding: var(--space-3)` to separate from the panel border.
- **Bottom row**: `minmax(0, 1fr)` + `minmax(18rem, 24rem)`. Collapse ≤1120px.
- Add `min-width: 0` to the `front-shell-body` grid item to prevent cascade overflow on mobile.

See `web/src/pages/js-deob.module.scss` and `web/src/pages/js-deob.tsx` for a full working reference.

## Token Safety Rules

Only use CSS variables defined in `web/src/styles/_tokens.scss`. Common mistakes:

| Wrong                    | Correct                                                           |
| ------------------------ | ----------------------------------------------------------------- |
| `--color-text-primary`   | `--color-text-strong`                                             |
| `--color-text-secondary` | `--color-text-muted`                                              |
| `--color-surface-raised` | `--color-surface`                                                 |
| `--color-surface-hover`  | `color-mix(in srgb, var(--color-surface-muted) 80%, transparent)` |
| `--color-border`         | `--color-border-strong` or `--color-border-soft`                  |
| `--color-error`          | `--color-danger`                                                  |
| `#fff` in accent buttons | `var(--color-accent-contrast)`                                    |

Half-step spacing tokens `--space-0-5`, `--space-1-5`, `--space-2-5` are explicitly defined — use them freely.

## Mobile Responsiveness

Always verify no horizontal overflow at 375px viewport width.

- Add `flex-wrap: wrap` to both the outer toolbar and the actions wrapper.
- Never add `flex-shrink: 0` to the actions wrapper.
- Add `min-width: 0` to the `front-shell-body` grid item.
- Test with Playwright resized to `390×844`, confirm `scrollWidth === clientWidth`.

## Avoid

- Hero banners with decorative gradients as main UI structure
- Oversized headings or labels by default
- Heavy drop shadows or floating hover animations
- Long onboarding copy blocks when layout and labels communicate instead
- Preset/quick-fill dropdown UIs, tips sidebars, hero sections on tool pages
