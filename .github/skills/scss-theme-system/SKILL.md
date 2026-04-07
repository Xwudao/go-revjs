---
name: scss-theme-system
description: 'Use when adding SCSS styles, design tokens, dark mode, CSS variables, spacing, typography, radius, hover states, or ConfigProvider/Zustand-linked theme changes in react-revjs.'
---

# SCSS Theme System

Use this skill when working on the visual system of react-revjs.

## Source Of Truth

- Theme tokens live in `src/styles/_tokens.scss`
- Shared Sass helpers live in `src/styles/_mixins.scss`
- Global theme bootstrap lives in `src/styles/index.scss`
- Runtime theme state lives in `src/store/useAppConfig.ts`
- Runtime DOM sync lives in `src/provider/ConfigProvider.tsx`

## Rules

1. Prefer CSS variables over hard-coded values.
2. Use the existing token scales before inventing new spacing, radius, font, or color values.
3. Keep light and dark mode in the same token system by overriding variables under `:root[data-theme='dark']`.
4. If accent behavior changes at runtime, update `ConfigProvider.tsx` instead of scattering overrides across components.
5. For new SCSS files, rely on the shared helpers injected by Vite from `@/styles/mixins`.
6. Preserve compatibility aliases like `--text`, `--bg`, and `--accent` unless the old consumers are migrated together.
7. Do not add `background-color` or `color` transitions to page-level surfaces or shared controls unless the motion is explicitly required; theme switches will animate those token changes and cause visible flicker.

## Token Families

- Colors: canvas, surface, muted surface, text, border, accent, semantic colors
- Interaction: accent hover, active, soft background, contrast, transition durations
- Layout: container width, page padding, card padding, section margins
- Spacing: `--space-*`, stack gaps, control paddings
- Radius: `--radius-*`
- Typography: font families, weights, font sizes, line heights, letter spacing
- Elevation: `--shadow-*`

## Workflow

1. Start from tokens in `src/styles/_tokens.scss`.
2. Reuse helpers from `src/styles/_mixins.scss` for focus rings, cards, and interactive surfaces.
3. If a component needs theme-aware behavior, read from `useAppConfig` or `useAppConfigStore` instead of duplicating state.
4. Validate with `pnpm build` and `pnpm check` after theme changes.

## Avoid

- Hard-coded hex values inside component SCSS unless adding a new shared token at the same time
- Separate dark-mode classes when a token override is enough
- Replacing the provider/store contract with local component state for global theme concerns
- Adding generic background/color transitions to body, panels, buttons, or form controls when the page does not need that motion
