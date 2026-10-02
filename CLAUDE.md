# BoardZM — Claude Code instructions

BoardZM is a housing marketplace for Lusaka, Zambia. University students and young professionals find rooms from verified landlords, read tenant reviews, find roommates and reserve rooms with a mobile-money deposit; landlords list rooms for less than agents charge. It is one installable web app (PWA) for phones and desktops.

The owner is new to coding. Explain plans in plain words, keep each change small, and end every task with what changed and exactly how to check it in the browser.

## Ground rules
- **Commit and push every change.** After every change to the app, commit it and `git push` to `origin` (GitHub: `bmaliti-gif/test-repo`, branch `main`). The owner has approved these pushes in advance; don't ask each time. Never force-push, and never commit secrets (see below). Run `npm run build` (and `npm run test` once tests exist) before committing; if it fails, fix it first or say so plainly.
- **Ask before connecting to anything else.** Get the owner's explicit OK before any other command or code that signs in to, links, deploys to, or sends data to an outside service or account — Supabase CLI (`supabase login`, `link`, `db push`), `gh`, Cloudflare or Netlify, Google Cloud, payment, SMS or email providers, MCP servers, analytics. Writing local code and SQL files is fine.
- **The owner prefers not to do setup by hand.** Where Claude can do a step itself (for example in the Supabase or Google dashboards through the Claude in Chrome extension, once it is installed), do it, after saying what you are about to do. Only hand a step to the owner when Claude has no way to do it.
- Payments are **simulated**. Never call a real payment API until the owner says payments are going live.
- Secrets: the browser only gets `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never use the secret / service-role key in frontend code. Never commit `.env*` files except `.env.example`.
- Work one block of `docs/PLAN.md` at a time. Don't add libraries beyond the stack below without asking.
- Never delete `CLAUDE.md` or `docs/`.
- `npm run build` must pass before you call a block done.

## Read first
- `docs/PLAN.md` — MVP scope, stack, data model (§5), routes (§6), build blocks (§7), launch checklist (§8)
- `docs/README.md` — design spec: screens, components, tokens, interactions, phone layout
- `docs/design/boardzm-app.dc.html` — clickable design reference. Its markup has the exact copy, spacing and sample data — match it. Open it in Chrome to see it working.

## Stack
React 19 + TypeScript + Vite · React Router · TanStack Query · Supabase (Postgres, Auth, Storage, RLS, SQL functions) · Leaflet + react-leaflet + OpenStreetMap tiles · lucide-react · zod · vite-plugin-pwa · Vitest · @fontsource/barlow + @fontsource/barlow-condensed · hosted on Cloudflare Pages.

## Commands
- `npm run dev` — app at http://localhost:5173 (`npm run dev -- --host` to open it on a phone on the same Wi-Fi)
- `npm run build` — type-check and production build
- `npm run test` — Vitest

## Layout
```
src/
  main.tsx, App.tsx          routes
  styles/industry.css        design system — never edit
  styles/themes.css          the four themes
  styles/app.css             app CSS (Leaflet, pins, layout helpers, --color-text-muted)
  lib/                       supabase, money, phone, geo, match, images, payments
  data/                      campuses, areas, amenities, habits
  components/                shared UI (Blueprint, Header, TabBar, ListingCard, PaymentDialog…)
  pages/                     search, listing, roommates, landlord, account, admin, auth
supabase/migrations/         numbered SQL files — the database source of truth
supabase/seed.sql            sample data
```

## Design rules (Industry design system)
- Build with the classes in `industry.css`: `.btn` (`-primary/-secondary/-ghost/-icon/-block`), `.tag` (`-accent/-neutral/-outline`), `.card` (`-kicker/-title/-body/-meta`), `.field` + `.input`, `.seg` + `.seg-opt`, `.nav` + `.nav-brand`, `.table`, `.dialog-backdrop` + `.dialog` (`-title/-body/-actions`), `.blueprint`, `.duotone`.
- Colours, fonts, spacing and shadows only through CSS variables (`--color-*`, `--font-*`, `--space-*`, `--shadow-*`). No hex values outside `themes.css`. There is no `--space-5`.
- Square corners everywhere. Cards, figures and every primary button are blueprint objects: use `<Blueprint>` (adds `.blueprint` + four `<i className="corner tl|tr|bl|br" />` marks). Cards stay transparent line drawings — no fills.
- Headings Barlow Condensed 600; body Barlow 14px. Icons: lucide-react with `strokeWidth={1.5}`.
- Small muted text uses `var(--color-text-muted)` (text at 70%, defined in app.css) for contrast; `.text-muted` (55%) only for large text. Accent-coloured small text uses `--color-accent-700`; the plain accent is for icons, borders and large text.
- Themes: `blueprint` (default), `night`, `copper`, `emerald` — `data-theme` on `<html>`, saved in localStorage.
- Mobile first: works at 360 px wide, tap targets ≥ 44 px, bottom tab bar below 768 px (see `docs/README.md`).

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

