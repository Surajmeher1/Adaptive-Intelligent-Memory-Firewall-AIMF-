# CHANGELOG.md — AIMF Frontend

## [Unreleased]

### Phase 1 — Task 1.1 (2026-08-05)
**Project Initialization**

#### Added
- Vite 5 + React 19 + TypeScript 5 project scaffold
- Tailwind CSS v4 with `@tailwindcss/vite` plugin
- All core dependencies: Zustand 5, TanStack Query 5, Framer Motion 11, Recharts 2, React Router DOM 6, React Hook Form 7, Zod 3, Lucide React, clsx, date-fns 3, react-hot-toast, axios
- Dev tooling: ESLint 9 (flat config), Prettier 3, Vitest 2
- Complete `src/` folder structure (app, assets, components, hooks, layouts, mock, pages, routes, services, store, styles, themes, types, utils)
- `src/styles/globals.css` — design system with `@theme` tokens, glassmorphism utilities, glow effects, gradient text, skeleton shimmer, status badge classes
- `src/types/index.ts` — complete TypeScript types for all AIMF entities
- `src/store/index.ts` — Zustand stores: `useThemeStore`, `useSidebarStore`, `useSettingsStore`, `useNotificationStore`
- `src/routes/index.tsx` — lazy-loaded router for all 9 pages
- `src/layouts/RootLayout.tsx` — root layout with Sidebar + Header + AnimatePresence page transitions
- `src/components/layout/Sidebar.tsx` — animated collapsible sidebar with mobile overlay
- `src/components/layout/Header.tsx` — sticky header with theme toggle, notification badge, route titles
- `src/components/common/PageLoader.tsx` — Suspense fallback loader
- `src/pages/NotFoundPage.tsx` — themed 404 page
- 9 stub pages (Dashboard, MemoryLab, MemoryVault, Analytics, Timeline, Privacy, Comparison, Settings, About)
- `index.html` — Inter + JetBrains Mono fonts, dark class default, SEO meta
- `vite.config.ts` — path aliases (`@/`, `@components/`, etc.), Tailwind plugin, backend proxy
- `tsconfig.json` — strict mode, path aliases
- `eslint.config.js` — flat config with TypeScript + React Hooks rules
- `.prettierrc` — consistent code formatting config
- `PROJECT_STATE.md`, `TASKS.md`, `CONTEXT_HANDOFF.md`, `CHANGELOG.md`, `DECISIONS.md`

#### Design Decisions
- Dark mode applied via `document.documentElement.className` (not CSS media query)
- Tailwind v4 uses `@theme {}` in CSS — no `tailwind.config.js` needed
- All routes lazy-loaded for code-splitting performance
- Zustand persist middleware for sidebar collapse + theme preference
