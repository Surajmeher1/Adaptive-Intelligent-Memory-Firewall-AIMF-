# CONTEXT_HANDOFF.md — AIMF Frontend

## Project
**Adaptive Intelligent Memory Firewall (AIMF)**
B.Tech CSE Final Year Project — Frontend Only

## Location
`c:\Users\suraj\Desktop\projtest1000\frontend\`

## Current Status
Phase 1, Task 1.1 complete. App boots and renders Sidebar + Header + stub pages.

---

## Tech Stack
| Tool | Version | Purpose |
|------|---------|---------|
| React | 19 | UI framework |
| TypeScript | 5.5 | Type safety |
| Vite | 5.4 | Build tool |
| Tailwind CSS | 4.x | Styling (uses @theme, no config file) |
| React Router DOM | 6 | Client-side routing |
| Zustand | 5 | State (theme, sidebar, settings, notifications) |
| TanStack Query | 5 | Server state / mock data fetching |
| Framer Motion | 11 | Animations |
| Recharts | 2 | Charts |
| Lucide React | latest | Icons |
| React Hook Form | 7 | Form management |
| Zod | 3 | Schema validation |
| react-hot-toast | 2 | Toast notifications |
| clsx | 2 | Conditional classes |
| date-fns | 3 | Date formatting |
| axios | 1.7 | HTTP client |
| Vitest | 2 | Testing |

---

## Key Design Decisions
1. **Tailwind v4** — uses `@import "tailwindcss"` + `@theme {}` tokens. NO tailwind.config.js.
2. **Dark mode** — applied via `document.documentElement.className = 'dark'|'light'`. HTML default class is `dark`.
3. **Fonts** — Inter (sans) + JetBrains Mono loaded via Google Fonts in `index.html`.
4. **Lazy loading** — ALL pages are lazy-loaded via `React.lazy()` in `src/routes/index.tsx`.
5. **Page transitions** — Framer Motion `AnimatePresence` in `RootLayout.tsx`.
6. **Sidebar collapse** — persisted in localStorage via Zustand persist middleware.
7. **Path aliases** — `@/` = `src/`, configured in both `vite.config.ts` and `tsconfig.json`.

---

## File Map (created in Task 1.1)
```
frontend/
├── index.html                        ← Fonts, meta, dark class default
├── vite.config.ts                    ← Path aliases, Tailwind plugin, proxy /api → :8000
├── tsconfig.json                     ← Strict, path aliases
├── tsconfig.node.json
├── eslint.config.js                  ← Flat config, React Hooks + TS rules
├── .prettierrc                       ← Single quotes, no semis
├── package.json                      ← All deps listed
└── src/
    ├── main.tsx                      ← Entry: QueryClient + BrowserRouter + Toaster
    ├── styles/globals.css            ← @theme tokens + base styles + utilities
    ├── types/index.ts                ← ALL TypeScript types (Memory, Analytics, etc.)
    ├── store/index.ts                ← useThemeStore, useSidebarStore, useSettingsStore, useNotificationStore
    ├── routes/index.tsx              ← Lazy router, all 9 routes
    ├── layouts/RootLayout.tsx        ← Sidebar + Header + AnimatePresence<Outlet>
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx           ← Animated collapsible, mobile overlay
    │   │   └── Header.tsx            ← Route titles, theme toggle, notif badge
    │   └── common/
    │       └── PageLoader.tsx        ← Suspense fallback spinner
    └── pages/
        ├── NotFoundPage.tsx          ← 404
        ├── dashboard/DashboardPage.tsx    ← STUB
        ├── memory-lab/MemoryLabPage.tsx   ← STUB
        ├── memory-vault/MemoryVaultPage.tsx ← STUB
        ├── analytics/AnalyticsPage.tsx    ← STUB
        ├── timeline/TimelinePage.tsx      ← STUB
        ├── privacy/PrivacyPage.tsx        ← STUB
        ├── comparison/ComparisonPage.tsx  ← STUB
        ├── settings/SettingsPage.tsx      ← STUB
        └── about/AboutPage.tsx            ← STUB
```

---

## Routes
| Path | Component | Status |
|------|-----------|--------|
| `/` | → redirect `/dashboard` | ✅ |
| `/dashboard` | DashboardPage | Stub |
| `/lab` | MemoryLabPage | Stub |
| `/vault` | MemoryVaultPage | Stub |
| `/analytics` | AnalyticsPage | Stub |
| `/timeline` | TimelinePage | Stub |
| `/privacy` | PrivacyPage | Stub |
| `/compare` | ComparisonPage | Stub |
| `/settings` | SettingsPage | Stub |
| `/about` | AboutPage | Stub |
| `*` | NotFoundPage | Done |

---

## Next Task: 1.2 — Design System + Mock Data
Create:
- `src/components/ui/` — Button, Badge, Card, Input, Spinner, Skeleton, etc.
- `src/mock/` — JSON data files (dashboard.json, memories.json, analytics.json, etc.)
- `src/services/` — Mock service functions with simulated delays

---

## Gotchas for Next Agent
- Tailwind v4: no config file, use `@theme {}` in CSS
- `@/` alias works in both Vite and TypeScript
- Sidebar width: `240px` expanded, `64px` collapsed (animated via Framer Motion)
- All stores use `zustand/middleware` `persist` — check localStorage key names
- Page transition key is `location.pathname` in RootLayout
