# BoardZM

Rooms near campus in Lusaka, straight from verified landlords. Students and young professionals find a room on a map, read reviews from past tenants, find a roommate and reserve with a mobile-money deposit. Landlords list rooms for less than an agent charges.

One installable web app (PWA) for phones and desktops. Payments are **simulated** for now; no real money moves.

## Run it

```sh
npm install
cp .env.example .env.local   # then add your Supabase Project URL and publishable key
npm run dev                  # http://localhost:5173
```

- `npm run build` — type-check and production build
- `npm run test` — unit tests (Vitest)

## Stack

React 19 + TypeScript + Vite · React Router · TanStack Query · Supabase (Postgres, Auth, Storage, row level security, SQL functions) · Leaflet + OpenStreetMap · Industry design system CSS · hosted on Vercel (from GitHub `bmaliti-gif/test-repo`, branch `main`; config in `vercel.json`).

## Where things are

- `src/` — the app (pages, components, `lib/` helpers, `styles/`)
- `supabase/migrations/` — the database, as numbered SQL files run in order
- `supabase/seed.sql` — sample rooms from the design
- `docs/PLAN.md` — scope, data model and build plan; `docs/README.md` — design spec
- `CLAUDE.md` — working rules for Claude Code
