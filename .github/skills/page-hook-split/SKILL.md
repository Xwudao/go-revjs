---
name: page-hook-split
description: 'Use when a react-revjs page component has substantial logic (state, derived values, handlers, side effects) that should be extracted into a dedicated hook file so the TSX file is reduced to pure rendering.'
---

# Page Hook Split

Use this skill whenever a page or complex component holds enough logic that the TSX file becomes hard to scan.
The goal is a clean separation: **logic lives in the hook, TSX only renders**.

## When to apply

- A page component has multiple `useState`, `useMemo`, `useEffect`, or `useRef` calls alongside non-trivial handler functions.
- The TSX file is long enough that the JSX is buried beneath type definitions, helper functions, and data constants.
- The same logic or data shape needs to be reused across more than one component.
- You are adding new logic to an existing page that already has a `.hook.ts` file.

## File naming convention

| File                      | Purpose                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `some-page.tsx`           | JSX rendering only — imports from the hook                              |
| `hooks/some-page.hook.ts` | All state, derived values, handlers, side effects, constants, and types |
| `some-page.module.scss`   | Scoped styles (unchanged)                                               |

Place the hook file under a `hooks/` subdirectory inside the same `pages/` folder (e.g. `web/src/pages/hooks/some-page.hook.ts`). This keeps hook files separated from TSX and SCSS files without moving them out of the pages tree.

## What belongs in the hook file

- All `useState`, `useMemo`, `useCallback`, `useEffect`, `useRef` declarations
- Handler functions (`handleXxx`, `applyXxx`, `onXxx`)
- Derived values computed from state
- localStorage persistence logic (read on init, write on change via `useEffect`)
- Static data constants used only by this page (tab definitions, op definitions, option arrays)
- Shared pure helper functions used by the above
- All type and interface definitions for the page's data shapes
- The named `useXxx()` hook that bundles everything and returns a flat object

## What stays in the TSX file

- The `export default function` component — JSX and nothing else
- A single destructure of the hook's return value at the top of the component body
- Imports for the hook, SCSS module, `clsx`, and any UI components

## Hook return shape

Return a **flat object** from the hook. Avoid nested objects so the TSX destructure stays readable.

```ts
return {
  // state
  input,
  setInput,
  output,
  activeTab,
  setActiveTab,
  // derived
  inputStats,
  outputStats,
  hashes,
  // refs
  outputRef,
  // handlers
  applyOp,
  handleCopyOutput,
  handleClear,
};
```

## localStorage persistence

When a user choice (active tab, selected mode, preferred option) should survive a page refresh, persist it in localStorage.

Rules:

- Use a namespaced key: `revjs:<page-name>:<field>`, e.g. `revjs:string-tools:tab`.
- Initialize state from a **lazy initializer function** so localStorage is only read once on mount — pass the function reference, not the call result.
- Validate the stored value against a known list of valid values before accepting it; fall back to the default if the value is missing or unknown.
- Write back on every change via a dedicated `useEffect` targeting only that state value.

```ts
const STORAGE_KEY = 'revjs:some-page:tab';

function readStoredTab(): TabKey {
  const stored = localStorage.getItem(STORAGE_KEY);
  const valid: TabKey[] = ['a', 'b', 'c'];
  return valid.includes(stored as TabKey) ? (stored as TabKey) : 'a';
}

// In the hook:
const [activeTab, setActiveTab] = useState<TabKey>(readStoredTab); // lazy init

useEffect(() => {
  localStorage.setItem(STORAGE_KEY, activeTab);
}, [activeTab]);
```

## Minimal TSX skeleton after extraction

```tsx
import clsx from 'clsx';
import { tabs, opsByTab, useMyPage } from './hooks/my-page.hook';
import classes from './my-page.module.scss';

export default function MyPage() {
  const {
    input,
    setInput,
    activeTab,
    setActiveTab,
    // ...
  } = useMyPage();

  return <div className={classes.page}>{/* pure JSX — no logic here */}</div>;
}
```

## Real example in this repo

- Hook: `web/src/pages/hooks/string-tools.hook.ts`
- Page: `web/src/pages/string-tools.tsx`

## Modal extraction rule

When a page needs a modal dialog (e.g. a save/restore panel, a settings dialog, or a confirmation overlay), **do not write the modal inline in the page TSX**.

Extract it into a dedicated component under `web/src/components/front/modals/`.

Rules:

- File name matches the feature: `SaveProgressModal.tsx` / `SaveProgressModal.module.scss`.
- The component accepts only the props it strictly needs — state values, setters, and handlers already owned by the page hook.
- All modal-specific styles live in the component's own `.module.scss`; no modal selectors in the page SCSS.
- The page TSX mounts the component conditionally: `{isOpen && <SomeModal ... />}`.
- The page hook owns open/close state and all business logic; the component is pure rendering.

```tsx
// In the page TSX — minimal mount:
{
  isSaveModalOpen && (
    <SaveProgressModal
      saves={saves}
      saveName={saveName}
      setSaveName={setSaveName}
      saveProgress={saveProgress}
      loadSave={loadSave}
      deleteSave={deleteSave}
      onClose={() => setIsSaveModalOpen(false)}
    />
  );
}
```

```
web/src/components/front/modals/
  SaveProgressModal.tsx
  SaveProgressModal.module.scss
```

- Hook: `web/src/pages/crypto-lab.hook.ts`
- Page: `web/src/pages/crypto-lab.tsx`

Review these files for a working reference before adding a new page.
