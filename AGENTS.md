# Agent Guide for remix-songs

This repo is a Next.js (App Router) project with React + TypeScript, Tailwind v4, and shadcn/ui components.

## Commands

Package manager: npm is configured (package-lock.json). Yarn/pnpm/bun also work.

- Install deps: `npm install`
- Dev server: `npm run dev` (http://localhost:3000)
- Build: `npm run build`
- Start (prod): `npm run start`
- Lint: `npm run lint`

### Lint a single file

There is no dedicated script, but ESLint is configured and can be run directly:

- `npx eslint app/page.tsx`
- `npx eslint components/player/controls.tsx`

### Tests

No test runner is configured in `package.json` and there are no test files in the repo.
If you add a test framework, update this section with the new commands and single-test invocation.

## Project structure

- `app/` Next.js App Router pages/layouts
- `components/` UI and feature components
- `components/ui/` shadcn/ui primitives
- `hooks/` React hooks (client only)
- `lib/` shared utilities (`cn` helper)
- `workers/` web worker code (MP3 encoding)
- `types/` ambient type definitions

## Code style and conventions

### TypeScript / React

- TS is `strict: true` (see `tsconfig.json`). Prefer explicit types for public APIs and state objects.
- Favor functional components and hooks. Hooks live in `hooks/` and are named `useX`.
- Use `'use client'` at the top of client components and hooks that touch browser APIs.
- Prefer `React.ComponentProps<'button'>` etc. for polymorphic components.
- Use `Readonly<{ ... }>` for props when it improves clarity (see `app/layout.tsx`).
- For refs that store mutable non-UI state, use `useRef` and keep `useState` for UI state.
- Keep effect cleanup correct (terminate workers, clear timeouts, remove listeners).

### Imports

- Prefer absolute imports via alias `@/` (configured in `tsconfig.json` and `components.json`).
- Suggested ordering (follow file-local style if already established):
  1) React / Next
  2) Third-party libraries
  3) Internal aliases (`@/components`, `@/hooks`, `@/lib`)
  4) Relative imports
  5) Styles
- Avoid unused imports; let ESLint/TS guide cleanup.

### Formatting

- There is no Prettier config. Keep formatting consistent with the file you are editing.
- Both single and double quotes appear in the repo. Do not reformat a file just to change quotes.
- Prefer trailing commas in multiline objects/arrays if already present.
- Use semicolons only if the surrounding file already uses them.

### Naming

- Components: PascalCase (`WaveformDisplay`, `MobilePlayerSheet`).
- Hooks: camelCase with `use` prefix (`useAudioPlayer`).
- Types and interfaces: PascalCase (`AudioPlayerState`).
- Event handlers: `handleX`, callbacks: `onX`.
- State setters: `setX` naming matches state variable (`isOpen` → `setIsOpen`).

### Error handling

- Wrap async worker and audio operations in `try/catch` and handle error states.
- For Web Workers, always terminate in both success and error paths.
- Avoid throwing inside React render; surface errors via UI state or notifications.
- For hooks, keep error handling local unless the error must be shown globally.

### React state and effects

- Keep derived state out of `useState` when it can be computed from existing state.
- When accessing state inside callbacks, use refs to avoid stale closures (see `useAudioPlayer`).
- Avoid `setState` inside `useEffect` unless you understand the lifecycle; document if intentional.
- Use `useCallback` for stable handlers passed to deep children or event emitters.

### Styling (Tailwind + shadcn)

- Tailwind v4 is used with CSS variables in `app/globals.css`.
- Use the `cn` helper from `lib/utils.ts` to merge class names.
- When adding UI components, follow shadcn patterns and place primitives in `components/ui/`.
- Prefer utility classes over custom CSS unless it is a shared theme token.

### Accessibility

- Keep interactive elements keyboard accessible.
- Use semantic elements where possible (`button`, `nav`, `main`).
- Ensure `aria-*` props are present for custom controls.

## Next.js specifics

- App Router uses server components by default; add `'use client'` where needed.
- Use `Metadata` in `app/layout.tsx` for app-wide metadata.
- Keep `next.config.ts` minimal unless needed.

## Linting configuration

- ESLint is configured via `eslint.config.mjs` using Next.js core-web-vitals + TypeScript.
- Default ignores are overridden to include `.next` and build output rules.

## Notes for agentic changes

- Do not add or modify git config.
- Do not delete user files or reset the repo.
- If you add a test framework or new scripts, update the Commands section.
- Keep changes minimal and consistent with existing file style.
