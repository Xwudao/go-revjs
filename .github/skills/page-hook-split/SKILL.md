---
name: page-hook-split
description: 'Use when a react-revjs page component has substantial logic (state, derived values, handlers, side effects) that should be extracted into a dedicated hook file so the TSX file is reduced to pure rendering.'
---

# Page Hook Split

Use this skill whenever a page holds enough logic that the TSX file becomes hard to scan.
Goal: logic lives in the hook, TSX only renders.

## When to apply

- A page has multiple `useState`, `useMemo`, `useEffect`, or `useRef` calls alongside non-trivial handler functions.
- JSX is buried beneath type definitions, helper functions, and data constants.
- The same logic or data shape needs to be reused across more than one component.
- You are adding new logic to a page that already has a `.hook.ts` file.

## File naming convention

| File                      | Purpose                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `some-page.tsx`           | JSX rendering only — imports from the hook                              |
| `hooks/some-page.hook.ts` | All state, derived values, handlers, side effects, constants, and types |
| `some-page.module.scss`   | Scoped styles (unchanged)                                               |

Place the hook file under a `hooks/` subdirectory inside the same `pages/` folder.

## What belongs in the hook file

- All `useState`, `useMemo`, `useCallback`, `useEffect`, `useRef` declarations
- Handler functions (`handleXxx`, `applyXxx`, `onXxx`)
- Derived values computed from state
- localStorage persistence logic (read on init, write on change via `useEffect`)
- Static data constants used only by this page (tab definitions, op definitions, option arrays)
- All type and interface definitions for the page's data shapes
- The named `useXxx()` hook that bundles everything and returns a **flat object**

## What stays in the TSX file

- The `export default function` component — JSX and nothing else
- A single destructure of the hook's return value at the top of the component body
- Imports for the hook, SCSS module, `clsx`, and any UI components

## localStorage persistence rules

- Use a namespaced key: `revjs:<page-name>:<field>`, e.g. `revjs:string-tools:tab`.
- Initialize state from a **lazy initializer function** — pass the function reference, not the call result.
- Validate the stored value against a known list before accepting; fall back to default if missing or unknown.
- Write back on every change via a dedicated `useEffect` targeting only that state value.

## Modal extraction rule

When a page needs a modal dialog, extract it into `web/src/components/front/modals/`.

- The modal accepts only the props it strictly needs from the page hook.
- All modal-specific styles live in the component's own `.module.scss`.
- The page TSX mounts conditionally: `{isOpen && <SomeModal ... />}`.
- The page hook owns all open/close state and business logic; the component is pure rendering.

## References

- Hook: `web/src/pages/hooks/string-tools.hook.ts`
- Page: `web/src/pages/string-tools.tsx`
- Modal: `web/src/components/front/modals/SaveProgressModal.tsx`
- Hook with modal: `web/src/pages/hooks/crypto-lab.hook.ts`
