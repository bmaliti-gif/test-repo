# BoardZM — Claude Code instructions

BoardZM is a housing marketplace for Lusaka, Zambia. University students and young professionals find rooms from verified landlords, read tenant reviews, find roommates and reserve rooms with a mobile-money deposit; landlords list rooms for less than agents charge. It is one installable web app (PWA) for phones and desktops.

The owner is new to coding. Explain plans in plain words, keep each change small, and end every task with what changed and exactly how to check it in the browser.

## Ground rules
- **Keep going without waiting for permission.** Work straight through the build: when a block is done (built, tested, committed and pushed), give a short summary of what changed and how to check it, then start the next block of `docs/PLAN.md` right away. Don't stop to ask for a "go" or wait for a plan to be approved; share the plan in a few lines and proceed. The only reason to stop and wait is when the work needs a more powerful model; then say so plainly and pause. (Steps listed below that need the owner's OK still need it.)
- **Commit and push every change.** After every change to the app, commit it and `git push` to `origin` (GitHub: `bmaliti-gif/test-repo`, branch `main`). The owner has approved these pushes in advance; don't ask each time. Never force-push, and never commit secrets (see below). Run `npm run build` (and `npm run test` once tests exist) before committing; if it fails, fix it first or say so plainly.
- **Nothing is left uncommitted.** Before ending any task or reply that changed files, run `git status` and `git fetch` and make sure the working tree is clean and `main` is level with `origin/main` (GitHub). This covers every file in the repo (code, SQL, docs, `CLAUDE.md`, icons), not just app code. `.env.local` and other secrets stay out of git (they are git-ignored). If a push fails, say so and retry; never report work as done while it exists only on this computer.
- **Connected services the owner has approved:** Supabase (database, sign-in, storage) and Vercel (hosting). Claude may work in their dashboards (e.g. through the Claude in Chrome extension) and configure them for BoardZM. Never paste the Supabase secret / service_role key anywhere, and never change billing or delete projects without asking.
- **Ask before connecting to anything else.** Get the owner's explicit OK before any other command or code that signs in to, links, deploys to, or sends data to an outside service or account — Supabase CLI (`supabase login`, `link`, `db push`), `gh`, other hosting providers, Google Cloud, payment, SMS or email providers, MCP servers, analytics. Writing local code and SQL files is fine.
- **The owner prefers not to do setup by hand.** Where Claude can do a step itself (for example in the Supabase or Google dashboards through the Claude in Chrome extension, once it is installed), do it, after saying what you are about to do. Only hand a step to the owner when Claude has no way to do it.
- Payments are **simulated**. Never call a real payment API until the owner says payments are going live.
- Secrets: the browser only gets `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never use the secret / service-role key in frontend code. Never commit `.env*` files except `.env.example`.
- Work one block of `docs/PLAN.md` at a time, in order (ignore "Show me your plan first" in the block prompts; see the first rule). Don't add libraries beyond the stack below without asking.
- Never delete `CLAUDE.md` or `docs/`.
- `npm run build` must pass before you call a block done.

## Read first
- `docs/PLAN.md` — MVP scope, stack, data model (§5), routes (§6), build blocks (§7), launch checklist (§8)
- `docs/README.md` — design spec: screens, components, tokens, interactions, phone layout
- `docs/design/boardzm-app.dc.html` — clickable design reference. Its markup has the exact copy, spacing and sample data — match it. Open it in Chrome to see it working.

## Stack
React 19 + TypeScript + Vite · React Router · TanStack Query · Supabase (Postgres, Auth, Storage, RLS, SQL functions) · Leaflet + react-leaflet + OpenStreetMap tiles · lucide-react · zod · vite-plugin-pwa · Vitest · @fontsource/barlow + @fontsource/barlow-condensed · hosted on Vercel (from GitHub `bmaliti-gif/test-repo`, branch `main`; config in `vercel.json`).

## Commands
- `npm run dev` — app at http://localhost:5173 (`npm run dev -- --host` to open it on a phone on the same Wi-Fi)
- `npm run build` — type-check and production build
- `npm run test` — Vitest

## Layout
```
src/
  main.tsx, App.tsx          routes
  styles/industry.css        design system — never edit
  styles/themes.css          colour themes (the only file with hex values)
  styles/app.css             page layout CSS (Leaflet, pins, helpers, --color-text-muted)
  styles/brand.css           brand look, loaded last (radii, cards, buttons, search cards)
  lib/                       supabase, money, phone, geo, match, images, payments
  data/                      campuses, areas, amenities, habits
  components/                shared UI (Blueprint, Header, TabBar, ListingCard, PaymentDialog…)
  pages/                     search, listing, roommates, landlord, account, admin, auth
supabase/migrations/         numbered SQL files — the database source of truth
supabase/seed.sql            sample data
```

## Design rules (BoardZM brand, Oct 2026)
The look is a modern, photo-first marketplace (like Airbnb or Zillow), not the original blueprint wireframe. `docs/design/boardzm-app.dc.html` is still the reference for copy, flows and sample data, but **not** for the visual style.
- Colours: **Zambezi teal** `--color-accent` (trust + growth) as the main colour; **copper** `--color-accent-2` for highlights (Featured, saved hearts, counts); warm off-white `--color-bg`; white `--color-card` for cards, panels and dialogs; `--color-on-accent` for text on teal. All colour values live only in `themes.css`; everything else uses variables (`--color-*`, `--font-*`, `--space-*`, `--shadow-*`, `--radius-*`). There is no `--space-5`.
- Shape: rounded corners (`--radius-sm` 8px controls, `--radius-md` 12px, `--radius-lg` 16px cards, pills for tags and filter chips), white cards with a hairline border and `--shadow-sm`, lifting to `--shadow-md` on hover. No corner marks: `<Blueprint>` still works but its marks are hidden by `brand.css`.
- Photos in true colour (no duotone). Room cards: photo on top (4:3) with tags and the save heart over it, then place · distance and rating, title, type, price and the Verified badge.
- Type: Barlow throughout — headings 700 with tight letter-spacing, body 15px. Icons: lucide-react (`strokeWidth` 1.5–2).
- Classes from `industry.css` are still the base (`.btn`, `.tag`, `.card`, `.field` + `.input`, `.seg`, `.table`, `.dialog`); `brand.css` (loaded last) restyles them. Put new brand-level styling in `brand.css`, page layout in `app.css`.
- Small muted text uses `var(--color-text-muted)`; small accent text uses `--color-accent-700` (WCAG AA).
- Themes: `zambezi` (default, no attribute), `night`, `copper`, `sky` — `data-theme` on `<html>`, saved in localStorage; the picker lives on the Account page.
- Mobile first: works at 360 px wide, tap targets ≥ 44 px, bottom tab bar below 768 px; below 1024 px the search list and map take turns.

## Product rules
- Money is integer **ngwee** (K1 = 100 ngwee), shown as `K 1,800`. Rent is per month.
- Fees and the deposit come from the `app_settings` table — never hard-code amounts.
- Phones are stored as E.164 (`+260971234567`); accept `0971234567`. Guess the provider from the prefix (096/076 MTN, 097/077 Airtel, 095 Zamtel) — warn on a mismatch, never block.
- A landlord's WhatsApp number is revealed only through `get_landlord_contact` (tenant has a held or released reservation); a roommate's only after an accepted request.
- Every table has RLS on. Business rules live in SQL functions (`security definer`, `set search_path = ''`), never only in the browser.
- Users are on low-end Android phones with expensive data: compress photos before upload (≤ 1600 px, WebP), lazy-load images and routes, keep the bundle small.
- Copy: plain, friendly and trustworthy; Kwacha prices; real Lusaka place names.

## Database workflow
- Schema changes are new numbered files in `supabase/migrations/` (never edit one that has been applied). The owner pastes them into the Supabase SQL editor unless they have approved CLI access.
- Keep `src/lib/database.types.ts` in sync with the migrations.
- Test accounts use Gmail + aliases (e.g. `name+tenant@gmail.com`).

