# DECISIONS.md — AIMF Frontend Architecture Decisions

## D-001 — Tailwind CSS v4 (not v3)
**Decision:** Use Tailwind CSS v4 via `@tailwindcss/vite` plugin
**Reason:** v4 eliminates the need for a `tailwind.config.js`. Design tokens are defined in CSS using `@theme {}` which is more maintainable and colocated with styles. The `@tailwindcss/vite` plugin integrates directly with Vite's build pipeline without PostCSS configuration.
**Impact:** No `tailwind.config.js`. All tokens in `src/styles/globals.css`.

## D-002 — React 19
**Decision:** Use React 19 (latest stable)
**Reason:** React 19 ships with the new React Compiler (optional), improved Suspense, and `use()` hook. Project is new so no migration cost.

## D-003 — Zustand for state management
**Decision:** Zustand v5 over Redux Toolkit or Context
**Reason:** Zero boilerplate, excellent TypeScript support, built-in persist middleware, tiny bundle. For a frontend-only project without complex server state synchronization, Zustand is sufficient for all UI state (theme, sidebar, settings).

## D-004 — TanStack Query for data fetching
**Decision:** TanStack Query v5 for all mock data fetching
**Reason:** Even with mock data, Query provides caching, loading states, error handling, and stale-while-revalidate. When connecting to the real backend, only the query function changes — the cache layer stays the same.

## D-005 — Lazy loading all routes
**Decision:** All page components use `React.lazy()`
**Reason:** Route-level code splitting reduces initial bundle. Each page loads only when visited, which is important for a project with 9+ pages.

## D-006 — Dark mode via className
**Decision:** Apply dark/light mode by setting `document.documentElement.className`
**Reason:** More explicit than `prefers-color-scheme` media query alone. Allows user override without system dependency. Persisted via Zustand localStorage.

## D-007 — Framer Motion for all animations
**Decision:** Use Framer Motion exclusively (no CSS @keyframes for component animations)
**Reason:** Framer Motion's `AnimatePresence` correctly handles unmount animations which CSS cannot do. The `motion` components provide declarative animation API that's easy to maintain and extend.

## D-008 — Path aliases
**Decision:** Configure `@/` and named aliases in both `vite.config.ts` and `tsconfig.json`
**Reason:** Avoids brittle relative imports like `../../../../components/`. Easier to refactor folder structure without updating import paths across files.

## D-009 — Mock-first architecture
**Decision:** All data comes from `src/mock/` JSON files + service functions with simulated delays
**Reason:** Allows complete frontend development without backend dependency. Service layer is thin enough that swapping mock → real API only requires changing the service function implementation.

## D-010 — Inter + JetBrains Mono fonts
**Decision:** Inter as primary sans-serif, JetBrains Mono for code/monospace
**Reason:** Inter is the standard for enterprise SaaS dashboards (used by Linear, Vercel, Notion). JetBrains Mono provides excellent readability for AMGS scores and technical values. Both are loaded from Google Fonts for reliability.

## D-011 — Recharts for data visualization
**Decision:** Recharts v2 over Chart.js, D3, or Victory
**Reason:** Recharts is React-native (no DOM manipulation), supports TypeScript, has good responsiveness support, and integrates naturally with React's render cycle. Sufficient for all required chart types (bar, line, pie, area, radar).

## D-012 — react-hot-toast for notifications
**Decision:** react-hot-toast over sonner or radix-ui toast
**Reason:** Minimal API, zero configuration, beautiful by default, and customizable styling to match AIMF dark theme.
