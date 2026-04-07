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

## Avoid

- Large hero banners with broad decorative gradients as the main UI structure
- Oversized headings or labels by default
- Heavy drop shadows, floating hover animations, or brand-first embellishment
- Long blocks of onboarding copy when the page can communicate with metadata, labels, and action placement
