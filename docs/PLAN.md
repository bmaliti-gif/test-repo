# BoardZM — 2-day build plan (Claude Code + VS Code)

**Goal:** a working, installable BoardZM web app, front end and back end, built in two working days by prompting Claude Code. The design to copy is `docs/design/boardzm-app.dc.html`; the screen-by-screen spec is `docs/README.md`.

## 0. How to use this kit

1. Copy everything in this folder (`CLAUDE.md` and `docs/`) into the root of your repo `bmaliti-gif/test-repo`. You can rename the repo to `boardzm` on GitHub if you like.
2. Open the repo folder in VS Code and start Claude Code. It reads `CLAUDE.md` automatically at the start of every session.
3. Work through §7 one block at a time:
   - Paste the block's prompt. Claude shows you a plan; say "go" or correct it.
   - When it says it's done, do the **Check** steps in the browser.
   - Broken? Say what you expected and what happened, and paste any red error text (browser: F12 → Console, or the VS Code terminal).
   - Working? Say: `commit this as "Block N: <name>"`.
   - Type `/clear` before the next block. Claude starts fresh but still reads CLAUDE.md.
4. Read every permission prompt. Approve file edits and local commands. Say no to anything that signs in to or sends data to a service you haven't approved. CLAUDE.md and `.claude/settings.json` make Claude ask first.
5. If Claude goes round in circles twice on the same bug, say `undo everything since the last commit`, then ask again in a smaller step.

Words you'll see: **migration** is a SQL file that changes the database. **RLS** (row level security) is a set of database rules about who can read or change each row. **`.env.local`** is a private file holding your keys; it never goes to GitHub. **PWA** is a website that installs like an app.

## 1. The MVP

**What the first version does:** a student or young professional can find a room near campus on a map, check that the landlord is verified, read reviews from real past tenants, reserve the room with a mobile-money deposit and message the landlord on WhatsApp. A landlord can list rooms, get verified and track deposits and payouts for a small fee instead of an agent's commission. You run everything from one admin page. It installs from the browser on Android, iPhone and desktop.

Payments are **simulated**. The whole flow works (provider choice, phone prompt, deposit held, released or refunded, payouts), but no money moves. Switching to a real provider later changes one front-end module and two database functions.

### In scope: all 12 features, in build order
| # | Feature | Done means |
|---|---|---|
| 1 | Accounts | Email + password and Google sign-in; tenant or landlord; WhatsApp number |
| 2 | Search + map + filters | Area, max rent, room type, verified only, sort; map pins stay in sync with the list |
| 3 | Listing page + photos | Gallery, details, amenities, landlord card, reviews, reserve panel |
| 4 | Reservation deposit | Simulated MTN MoMo / Airtel Money / Zamtel Kwacha; deposit held, then released on move-in or refunded; WhatsApp unlocks |
| 5 | Landlord listings | Create and edit with photos and a map pin; K40 publish fee; automatic content check; deposits & payouts table |
| 6 | Verified landlord badge | Upload NRC, selfie and proof of ownership; K50 fee; you approve; badge shows everywhere |
| 7 | Admin page | Approve landlords and listings, handle reports and disputes, run ads, edit fees |
| 8 | Tenant reviews | Only tenants who moved in can review; reviews with banned words wait for approval |
| 9 | Saved rooms | Heart a room; saved list; count in the header |
| 10 | Featured listings | K30 for 7 days; shown first with a Featured tag |
| 11 | Roommate matching | Profile, match score, requests, WhatsApp after accepting |
| 12 | Local business ads | You create ads in admin; one sponsored card in results, filtered by area; click count |
| | Theme switcher | Blueprint, Night, Copper, Emerald, built into the app shell in block 1 |

All amounts are placeholders and can be changed in Admin → Settings: deposit K500, booking fee K25, listing K40, featuring K30/week, verification K50.

### Not in the MVP
Real money · SMS or phone-number sign-in · in-app chat (WhatsApp instead) · Play Store / App Store apps · automatic ID checks · email or SMS notifications beyond sign-in emails · several rooms in one listing (landlords duplicate the listing per room) · automatic deposit release after a deadline · landlords buying ads themselves · analytics.

## 2. Technology

| Layer | Choice | Why | Cost |
|---|---|---|---|
| Editor + AI | VS Code + Claude Code | Claude writes and runs the code; you review and test | Your Claude plan (Pro/Max or API credits), the only build cost |
| Front end | React 19 + TypeScript + Vite | The most common setup; Claude knows it very well; fast | Free |
| Pages / data | React Router · TanStack Query | URLs and pages · caching, loading and error states | Free |
| Styling | Industry design system CSS (`industry.css` + `themes.css`) | The exact look of the design; no extra UI kit | Free |
| Icons / fonts | lucide-react (stroke 1.5) · Barlow + Barlow Condensed via @fontsource | Fonts stored with the app: work offline, save data | Free |
| Map | Leaflet + react-leaflet + OpenStreetMap | No API key or billing account | Free for light use, with credit shown |
| Back end | Supabase: Postgres database, Auth, Storage, RLS, SQL functions | Database, sign-in, photo storage and server rules in one place, with no server to run | Free plan |
| Validation | zod | One set of rules for forms and data | Free |
| Installable app | vite-plugin-pwa | Install from the browser; fast repeat visits | Free |
| Tests | Vitest | Checks money, phone and match-score logic | Free |
| Hosting | Cloudflare Pages | Free plan allows commercial sites; redeploys on every GitHub push | Free |

**Running cost: K0 a month** on free plans, with these limits:
- Supabase's free plan pauses a project after about a week with no activity (you un-pause it in the dashboard). Database space, file storage and backups are limited. That's fine for building and early testing; upgrade before you hold real deposits. Check supabase.com/pricing for current limits.
- Supabase's built-in sign-in emails are limited to a few per hour, which is enough for testing. Before launch, add a free email-sending service (Claude needs your OK to connect it).
- A custom domain such as boardzm.com is optional and paid. You start on a free `*.pages.dev` address.

## 3. Accounts you create yourself (Claude never connects without asking)
| Account | When | Used for |
|---|---|---|
| GitHub | You already have it | Stores the code (`bmaliti-gif/test-repo`) |
| Claude (Pro/Max) | Before day 1 | Claude Code |
| Supabase | Before day 1 | Database, sign-in, photos |
| Google Cloud | Before block 3 | "Continue with Google" (free OAuth client) |
| Cloudflare | Day 2, block 13 | Hosting |

## 4. Before day 1 (about 1.5 hours)
1. Install VS Code, Node.js (the LTS version from nodejs.org), Git and the **Claude Code** extension for VS Code. Sign in to Claude Code.
2. Clone your repo in VS Code: Source Control → Clone Repository → `https://github.com/bmaliti-gif/test-repo`. Copy this kit into it.
3. Create a Supabase project named `boardzm` with a strong database password (keep it in a password manager). Choose the region nearest Zambia that's offered. In Project Settings → API keys, copy the **Project URL** and the **publishable** key (called *anon* on older projects); you'll need them in block 3. Never share the **secret** / **service_role** key.
4. Fill in `docs/places.md` with coordinates for each campus and area. In Google Maps, right-click a spot and click the numbers to copy them.
5. Collect 10–15 room photos for testing uploads (your own, or used with the landlord's permission).
6. Pick test emails with Gmail + aliases: `you+landlord@gmail.com`, `you+tenant@gmail.com`, `you+tenant2@gmail.com`, `you+admin@gmail.com`. They all arrive in your normal inbox.

## 5. Data model (Supabase)
Rules for every table: RLS on; money stored as whole ngwee (`int`); timestamps are `timestamptz default now()`; ids are `uuid default gen_random_uuid()` unless stated otherwise.

### Tables
**profiles** — public info, readable by everyone
`id` (primary key → auth.users, delete cascades) · `full_name` · `role` tenant|landlord · `headline` (e.g. "2nd-year Nursing · UNZA") · `campus` · `onboarded` bool · `is_admin` bool · `verified_at` (set only when an admin approves) · `created_at`.
Users can update only `full_name, role, headline, campus, onboarded` (column grants). A trigger on `auth.users` creates this row on sign-up (taking the name from Google if available) plus an empty `contacts` row.

**contacts** — private: the owner and admins only
`user_id` (primary key → profiles) · `whatsapp` (E.164) · `payout_provider` mtn|airtel|zamtel · `payout_number`.

**listings**
`landlord_id` → profiles · `title` · `description` · `type_label` (Self-contained room, Bedsitter, Bedspace, Studio, Cottage, Single room, Shared flat, Shared house) · `category` single|shared|self_contained · `area` · `lat`, `lng` (a trigger rounds them to 3 decimals, about 100 m, so exact homes aren't public) · `rent_ngwee` (K300–K20,000) · `available_from` date · `amenities` text[] · `status` draft|in_review|live|reserved|let|rejected|archived · `review_note` (reasons from the auto-check or the admin) · `featured_until` · `created_at` · `updated_at`.
Everyone can read `live` and `reserved` listings. Landlords read their own and edit the content columns. Only functions can change `status` and `featured_until`. Editing the title or description of a live listing re-runs the auto-check.

**listing_photos** — `listing_id` (delete cascades) · `path` · `position`. Readable with its listing; only the listing's landlord can add or remove photos.

**saved_listings** — `user_id` + `listing_id` (together the primary key) · `created_at`. Users see and change only their own rows.

**reservations** — `reference` (BZ-000123, from a sequence) · `listing_id` · `tenant_id` · `status` pending_payment|held|released|refunded|cancelled · `deposit_ngwee` · `booking_fee_ngwee` · `expires_at` (15 minutes after a pending reservation is created) · `held_at` · `released_at` · `refunded_at` · `created_at`.
A partial unique index allows only one `pending_payment` or `held` reservation per listing. The tenant, the listing's landlord and admins can read it. Only functions write to it.

**payments** — `user_id` · `kind` reservation|listing_fee|feature_fee|verification_fee · `amount_ngwee` · `provider` mtn|airtel|zamtel · `phone` · `status` pending|succeeded|failed · `mode` simulated|live · `provider_ref` · `reservation_id` / `listing_id` / `verification_id` (whichever applies) · `created_at` · `completed_at`. The payer and admins can read; only functions write.

**payouts** — `recipient_id` · `reservation_id` · `reason` release|refund · `amount_ngwee` · `provider` · `number` · `status` queued|paid|failed · `mode` · `created_at` · `paid_at`. The recipient and admins can read.

**verifications** — `landlord_id` · `status` awaiting_payment|pending|approved|rejected · `nrc_front_path` · `nrc_back_path` · `selfie_path` · `ownership_path` · `rejection_reason` · `submitted_at` · `reviewed_at` · `reviewed_by`. The landlord reads their own; admins read all.

**reviews** — `listing_id` · `reservation_id` (unique) · `tenant_id` · `rating` 1–5 · `body` (20–1000 characters) · `status` published|pending|hidden · `created_at`. Everyone reads published reviews; authors also see their own. Written only through `submit_review`.

**roommate_profiles** — `user_id` (primary key) · `campus` · `budget_min_ngwee` · `budget_max_ngwee` · `move_in_month` (the 1st of the month) · `habits` text[] · `gender` female|male|null · `same_gender_only` bool · `bio` (up to 280 characters) · `visible` bool · `updated_at`. Signed-in users can read visible profiles; owners edit their own.

**roommate_requests** — `from_user` · `to_user` · `status` pending|accepted|declined · `created_at` · `responded_at`. Unique per (from, to) pair, and from ≠ to. Users can send requests as themselves and read requests they're part of; replies go through a function.

**ads** — `business_name` · `headline` · `body` · `cta_label` · `cta_url` · `image_path` · `areas` text[] (empty means everywhere) · `starts_on` · `ends_on` · `active` · `clicks` · `created_at`. Everyone reads running ads; only admins write.

**reports** — `reporter_id` · `target_type` listing|review|user|reservation · `target_id` · `reason` · `note` · `status` open|resolved · `created_at` · `resolved_at`. Users can file reports as themselves; admins read and resolve them. A trigger hides a listing (sets `in_review`) or a review (sets `hidden`) once it has 3 open reports.

**app_settings** — a single row (`id = 1`): `deposit_ngwee` 50000 · `booking_fee_ngwee` 2500 · `listing_fee_ngwee` 4000 · `feature_fee_ngwee` 3000 · `feature_days` 7 · `verification_fee_ngwee` 5000 · `payments_mode` simulated|live · `banned_words` text[]. Everyone reads; admins update everything except `payments_mode`.

### View
**listing_cards** (`security_invoker = on`) — each listing plus `landlord_name`, `landlord_verified`, `cover_path`, `photo_count`, `avg_rating`, `review_count` and `is_featured` (`featured_until > now()`). Search and the map read from this view.

### Functions (`security definer`, `set search_path = ''`, check `auth.uid()`)
| Function | Who can call | What it does |
|---|---|---|
| `is_admin()` | anyone | True if the caller is an admin (used inside policies) |
| `create_reservation(listing_id, provider, phone)` | tenant | Cancels expired pending reservations, checks the room is live and not the caller's own, then creates a reservation and a pending payment (deposit + booking fee) |
| `start_payment(kind, target_id, provider, phone)` | owner | Creates a pending payment for listing_fee, feature_fee or verification_fee after checking ownership and state |
| `simulate_payment(payment_id, approve)` | payer | Works only while `payments_mode = 'simulated'`; calls `complete_payment` |
| `complete_payment(payment_id, success)` | internal only (app users get no access) | Reservation: held and listing reserved, or cancelled · listing fee: runs `check_listing`, then live or in_review · feature fee: extends `featured_until` · verification fee: status becomes pending |
| `check_listing(listing_id)` | landlord, admin | Lists problems: fewer than 3 photos, short title or description, rent out of range, banned words, phone numbers in the text |
| `confirm_move_in(reservation_id)` | tenant | held → released; listing → let; payout to the landlord (marked paid immediately in simulated mode) |
| `cancel_reservation(reservation_id, reason)` | landlord, admin | held → refunded; listing → live; refund payout to the tenant |
| `get_landlord_contact(listing_id)` | tenant | Returns the landlord's WhatsApp only if the caller has a held or released reservation |
| `get_roommate_contact(user_id)` | member | Returns the WhatsApp number only if a request between the two was accepted |
| `respond_roommate_request(request_id, accept)` | recipient | Accepts or declines |
| `submit_review(reservation_id, rating, body)` | tenant | Only for the caller's own released reservation; banned words set it to pending |
| `review_verification(id, approve, reason)` | admin | Approving sets `profiles.verified_at` |
| `review_listing(id, approve, reason)` | admin | in_review → live or rejected |
| `resolve_report(id, action)` | admin | Hide, restore or dismiss |
| `track_ad_click(ad_id)` | anyone | Adds 1 to clicks |

### Storage buckets
- `listing-photos`: anyone can view; landlords upload only into a folder named after their own user id.
- `verification-docs`: **private**. Owners upload to and read their own folder; admins view files through short-lived signed links.
- `ad-images`: anyone can view; only admins upload.

## 6. Screens and routes
| Route | Screen | Who |
|---|---|---|
| `/` | Find a room: filters, list, map, ad | everyone |
| `/listing/:id` | Listing: gallery, details, reviews, reserve | everyone (reserving needs sign-in) |
| `/saved` | Saved rooms | signed in |
| `/reservations` | My reservations: status, WhatsApp, confirm move-in, review | signed in |
| `/roommates` | Roommate matching, my profile, requests | signed in |
| `/landlord` | Dashboard: stats, listings, deposits & payouts, verification | landlords |
| `/landlord/listings/new`, `/landlord/listings/:id` | Listing form | landlords |
| `/landlord/verification` | Verification upload and status | landlords |
| `/account` | Profile, WhatsApp, payout number, role, theme, sign out | signed in |
| `/welcome` | First-time setup | signed in |
| `/signin`, `/signup`, `/reset-password`, `/auth/callback` | Sign-in | everyone |
| `/admin` (with tabs) | Verifications, Listings, Reports, Reservations, Ads, Settings | admins |

Phone tab bar: Find · Roommates · Saved · Reservations (tenants) or Dashboard (landlords) · Account.

## 7. Build blocks
Times are rough. Paste each prompt as it is, filling in anything in `<angle brackets>`.

### Day 1: backbone and the tenant journey

#### Block 1 · App shell (1 h)
```
Read CLAUDE.md, docs/PLAN.md and docs/README.md, and look at docs/design/boardzm-app.dc.html.
Block 1: project setup and app shell. Show me your plan first.
1. Scaffold a Vite + React + TypeScript app in this folder. Keep CLAUDE.md, docs/ and README.md.
2. Copy docs/claude-settings.json to .claude/settings.json.
3. Install the stack listed in CLAUDE.md.
4. Copy docs/design/industry.css to src/styles/industry.css, deleting only its Google Fonts @import line (fonts come from @fontsource). Copy docs/design/themes.css to src/styles/themes.css. Create src/styles/app.css with --color-text-muted.
5. Build the shell from the design: sticky header (BoardZM + Lusaka, nav with icons, theme select, Saved count), footer, and below 768px a bottom tab bar instead of the header nav. Save the theme in localStorage and set it as data-theme on <html>.
6. Add a <Blueprint> component and a Button component whose primary variant always has the corner marks.
7. Add every route from PLAN.md §6 with placeholder pages, plus a Not found page.
8. Create src/data/ from docs/places.md (campuses, areas), plus the amenity and habit lists from the design.
9. Create .env.example (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY) and src/lib/supabase.ts. Don't connect to anything.
Then run the dev server and tell me what to click.
```
**Check:** the header matches the design · all four themes work and survive a refresh · narrowing the window shows the tab bar · every link opens a placeholder · `npm run build` passes.

#### Block 2 · Database (1.5 h)
```
Block 2: database. Show me your plan first.
Write the schema in docs/PLAN.md §5 as SQL files in supabase/migrations/:
0001_tables.sql: tables, constraints, indexes, the app_settings row
0002_security.sql: RLS on every table, policies, column grants, is_admin()
0003_functions.sql: every function and trigger, and the listing_cards view
0004_storage.sql: buckets and storage policies
Also write supabase/seed.sql with the 8 listings and the sponsored ad from the design file, placed using docs/places.md, owned by my landlord test account looked up by email (<you+landlord@gmail.com>), with no photos. Reviews and roommate profiles will come from real testing.
Then write src/lib/database.types.ts to match.
Don't run anything against Supabase. I'll paste the files into the SQL editor in order. Explain each file in two lines.
```
**You do:** Supabase → SQL Editor → New query → paste `0001` → Run. Repeat for 0002–0004. If one fails, paste the error to Claude and run the fixed version. (`seed.sql` runs at the end of block 3.)
**Check:** Table Editor lists every table, each marked RLS enabled · Storage shows three buckets.

#### Block 3 · Sign-in and onboarding (1 h)
**You do first:** copy `.env.example` to `.env.local` and paste in your Project URL and publishable key. In Supabase → Authentication: enable Email; under URL Configuration set the Site URL to `http://localhost:5173` and add the redirect URL `http://localhost:5173/**`. For Google: in Google Cloud Console → APIs & Services, set up the OAuth consent screen (app name BoardZM), then Credentials → Create OAuth client ID → Web application. Add the redirect (callback) URL shown on Supabase's Google provider page, then paste the client ID and secret into Supabase.
```
Block 3: sign-in and onboarding. My keys are in .env.local. Show me your plan first.
- Sign up and sign in with email + password and with Google (Supabase Auth); forgot and reset password; sign out.
- An auth context and route guards (signed in, landlord, admin) per PLAN.md §6. After sign-in, return to the page the user came from.
- /welcome after the first sign-in: "I'm looking for a room" / "I'm a landlord", full name, WhatsApp number (Zambian, saved as E.164 in contacts), headline (course · campus, or job). Landlords also give a payout provider and number.
- /account to edit the same details, plus the theme select and sign out.
- Use the design-system forms; write errors in plain words.
```
**Check:** sign up with email and confirm via the email · sign in with Google · complete /welcome · sign out and back in.
**Then:** create the four test accounts. Make one an admin in the SQL editor:
`update public.profiles set is_admin = true where id = (select id from auth.users where email = '<you+admin@gmail.com>');`
Then run `supabase/seed.sql`. Tip: if confirmation emails stop arriving (rate limit), turn off "Confirm email" while you build and turn it back on before launch.

#### Block 4 · Find a room (2 h)
```
Block 4: the Find a room page, matching the search screen in the design. Show me your plan first.
- Filters: area, max rent slider, room type, sort (Recommended / Lowest rent / Nearest campus), verified landlords only, and a "Near" campus select used for distances. Keep the filters in the URL.
- Results come from listing_cards (status live or reserved). Recommended = featured first, then verified, then newest.
- Cards exactly as in the design: duotone cover (or the stripe placeholder), Featured / Verified landlord tags, area · km to campus · type, price, rating. Reserved rooms get a Reserved tag.
- A Leaflet map with OpenStreetMap tiles and attribution, tiles greyed to sit in the theme, price pins and campus markers styled like the design. Hovering a card highlights its pin and the other way round; clicking either opens the listing.
- On phones: list first, with a floating Map / List toggle.
- One sponsored ad card after the 4th result (ads matching the area; call track_ad_click on click).
- An empty state with Reset filters; loading skeletons.
```
**Check:** every filter and sort changes both the list and the pins · hover works both ways · a copied URL restores the filters · phone layout · the ad appears.

#### Block 5 · Listing page and saved rooms (1.5 h)
```
Block 5: listing page and saved rooms, matching the listing screen in the design. Show me your plan first.
- Photo grid (main + 4) opening a full-screen gallery in true colour (cards stay duotone).
- Tags, title, area, spec cells (rent, type, distance, available, deposit), amenities, landlord card with the Verified badge and "on BoardZM since", reviews with the average.
- Reserve panel showing deposit + booking fee from app_settings: sticky on desktop, a sticky bottom bar on phones. Signed out: go to sign-in, then come back here.
- Save / Saved (saved_listings) updating the header count; /saved lists saved rooms.
- "Report this listing" (reason + note) creates a report.
```
**Check:** seeded listings open with all details · Save updates the header count · tapping Reserve while signed out → sign in → back on the listing.

#### Block 6 · Reserve with mobile money, simulated (2 h)
```
Block 6: reservation with simulated mobile money, following the reservation dialog in the design. Show me your plan first.
- src/lib/payments.ts wraps create_reservation, start_payment and simulate_payment, so real payments can replace the simulation later without changing any screen.
- PaymentDialog, reused for every fee: provider (MTN MoMo / Airtel Money / Zamtel Kwacha); phone field that picks the provider from the prefix (warn on a mismatch, don't block); total; "Send payment prompt" → "Check your phone" → a clearly labelled "Simulated phone prompt" with Approve / Decline → success with the reference, or failure with Try again.
- A slim "Test mode: payments are simulated" banner across the app while payments_mode is simulated.
- After success the room shows Reserved, and the tenant gets "Message landlord on WhatsApp" (get_landlord_contact → a wa.me link with a pre-filled message including the reference).
- /reservations: my reservations with status, reference, WhatsApp, Confirm move-in, Report a problem.
- Vitest tests for phone parsing, provider detection and money formatting.
```
**Check:** reserve as the tenant (Decline once, then Approve) · the second tenant sees Reserved and can't book it · WhatsApp opens with the landlord's number · Confirm move-in → Released · `npm run test` passes.
**End of day 1:** ask Claude to push to GitHub. It will ask your permission first.

### Day 2: landlords, trust, community, admin, launch

#### Block 7 · Landlord listings (2 h)
```
Block 7: landlord dashboard and listing form, matching "For landlords" in the design. Listing status replaces the design's per-listing verify button, because verification belongs to the landlord. Show me your plan first.
- /landlord: stat cells (live listings, deposits held, paid out), a Listings table (status tag, Featured tag; Edit, Feature, View, Archive / Relist), a Deposits & payouts table, the verification card.
- Listing form: title, description, type, area, rent, available from, amenity chips, a map to drop a pin, 3–8 photos compressed in the browser (≤ 1600 px, WebP), reorderable, first = cover. Save draft.
- "Publish · K40" → PaymentDialog (listing_fee) → live, or "In review" showing the check_listing reasons.
- "Feature · K30 for 7 days" → PaymentDialog (feature_fee); show the featured-until date.
- The landlord can cancel a held reservation ("room no longer available"), which refunds the tenant.
```
**Check:** create a listing with phone photos → publish → it appears in search · a description containing a phone number goes to In review with the reason · featuring puts it first in Recommended · cancelling a reservation → the tenant sees Refunded.

#### Block 8 · Verified landlord badge (1 h)
```
Block 8: landlord verification. Show me your plan first.
- /landlord/verification: upload NRC front, NRC back, a selfie holding the NRC, and proof of ownership (title deed, lease or utility bill; image or PDF up to 5 MB) to the private verification-docs bucket.
- "Verify · K50" → PaymentDialog (verification_fee) → Pending review. Show the status, any rejection reason and Resubmit.
- Approved landlords show the Verified landlord tag on cards, listing pages and their dashboard.
```
**Check:** submit as the landlord → Pending · a copied document link doesn't open when signed out.

#### Block 9 · Reviews and reports (1 h)
```
Block 9: reviews and reports. Show me your plan first.
- On /reservations, released reservations get "Write a review" (1–5 stars, 20–1000 characters) through submit_review, one per reservation.
- Reviews containing banned words go to pending, and the author sees "Under review".
- Report buttons on reviews too. Three open reports hide the item until an admin decides.
```
**Check:** a review after move-in appears on the listing and updates the average · there's no review option without a move-in.

#### Block 10 · Roommate matching (1.5 h)
```
Block 10: roommate matching, matching the Roommates screen in the design. Show me your plan first.
- My roommate profile: campus, budget range, move-in month, habit chips, optional gender + "same gender only", short bio, a visible toggle.
- Browse visible profiles with the campus filter, sorted by the match score from src/lib/match.ts (budget overlap 40, same campus 25, move-in within a month 15, shared habits 20; respect "same gender only" both ways). Unit-test it.
- Request to match → pending / accepted / declined; incoming requests with Accept / Decline; accepted requests show WhatsApp through get_roommate_contact.
- Change the design's "Profiles are ID-verified" line to "Only signed-in members can see profiles."
```
**Check:** two tenants match, send and accept a request, and see each other's WhatsApp · a third account can't see it.

#### Block 11 · Admin and ads (1.5 h)
```
Block 11: an admin area at /admin (admins only), using the design's tables, tags and dialogs. Show me your plan first.
- Verifications: a queue with document previews (signed URLs); Approve / Reject with a reason.
- Listings: the in-review queue with reasons and photos; Approve / Reject; search all listings.
- Reports: open reports with the reported item; Hide / Restore / Dismiss.
- Reservations: filter by status; Release / Refund for disputes.
- Ads: create and edit (business, headline, body, button label + link, image, areas, dates, active), with click counts.
- Settings: fees, deposit, feature days, banned words; payments mode shown read-only.
```
**Check:** approving the landlord makes the badge appear · approve an in-review listing · an ad for one area shows only there · a tenant account can't open /admin.

#### Block 12 · Installable app and polish (1 h)
```
Block 12: installable app and performance. Show me your plan first.
- vite-plugin-pwa: manifest (name BoardZM, theme colour #5980a6, background #f2f2f3, standalone), 192/512 and maskable icons (a simple BoardZM wordmark for now), and a service worker caching the app shell and listing photos. Never cache auth, payment or admin requests.
- An "Install app" button on Android/desktop, and an iPhone hint (Share → Add to Home Screen).
- Lazy-load routes and images; tell me the production bundle size.
- Check every page at 360 px wide, in all four themes, with visible keyboard focus and tap targets of at least 44 px. Fix anything that's off.
```
**Check:** Chrome DevTools → Application shows a valid manifest and service worker · the app installs on desktop.

#### Block 13 · Test and launch (1.5 h)
1. Run the full test script in §8 and paste any failures to Claude to fix.
2. Deploy, **with your permission**: Cloudflare → Workers & Pages → Create → Pages → connect GitHub → pick the repo. Build command `npm run build`, output folder `dist`, variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. If the build complains about the Node version, add the variable `NODE_VERSION` = `22`. If Cloudflare suggests Workers instead of Pages, ask Claude; either works for this app.
3. Add the live URL to Supabase → Authentication → URL Configuration (Site URL, plus redirect `https://<your-site>/**`) and to the Google OAuth client's authorised JavaScript origins.
4. Open the live URL on an Android phone and an iPhone: install it, sign in, reserve, upload a photo from the camera.

## 8. Full test script (before you call the MVP done)
1. **Landlord:** sign up → onboarding with WhatsApp and payout number → new listing with 3+ photos and a pin → Publish (Approve) → live. Feature it (Approve). Submit verification and pay (Approve) → Pending.
2. **Admin:** approve the verification → the Verified tag appears. Approve any in-review listing. Create an ad for one area.
3. **Tenant:** filter to that area → the ad shows · Verified only keeps the listing · save it · Reserve → Decline (failure message) → Reserve → Approve → Reserved with a reference · WhatsApp opens a chat with the landlord's number.
4. **Tenant 2:** sees Reserved and can't reserve.
5. **Landlord:** the deposit shows Held.
6. **Tenant:** Confirm move-in → the landlord sees Paid out · write a review → it appears and the average updates.
7. A review with a banned word → Under review → the admin publishes or hides it.
8. Three accounts report a listing → it's hidden → the admin restores it.
9. **Roommates:** tenant and tenant 2 create profiles → request → accept → WhatsApp visible.
10. Every page in every theme; a refresh keeps the theme.
11. Security: signed out, `/admin` and `/landlord` redirect · a tenant can't open `/landlord` · in DevTools → Network, the landlord's number never appears before reserving · verification files don't open from a copied link.

**The MVP is done** when all of the above pass on the live URL, on desktop Chrome and a real Android phone, with no red errors in the console.

## 9. Before real money or a public launch
- Finish business registration (PACRA, ZRA TPIN). Payment providers require it.
- Choose a licensed payment partner that collects and pays out on MTN, Airtel and Zamtel. Ask how deposits are held: holding customers' money may need Bank of Zambia approval, so get advice and prefer a partner that holds the funds.
- Build live mode (with your permission to connect): a Supabase Edge Function asks the provider to collect, and a webhook function calls `complete_payment`. Switch `payments_mode` to live and remove `simulate_payment`.
- Data protection: you will store ID documents. Check your obligations under Zambia's Data Protection Act (2021), publish a privacy policy, ask for consent at upload, and delete documents after review (for example, after 30 days).
- Publish terms of use and a deposit refund policy (what counts as "not as listed", time limits).
- Set up a custom email sender for Supabase Auth, and upgrade Supabase so the project never pauses and has backups.
- If traffic grows, move map tiles from OpenStreetMap's public servers to a tile provider.

## 10. After the MVP
Real payments · automatic deposit release a few days after move-in (a scheduled job) · SMS / WhatsApp notifications · automated ID checks · several rooms per listing · landlords buying targeted ads themselves · in-app messaging · analytics · a Play Store listing by wrapping the PWA (Trusted Web Activity).

## 11. If you fall behind
Cut in this order and add the items back after launch: (1) the admin ad editor (keep the seeded ad), (2) roommate matching, (3) automatic hiding on reports, (4) featured listings. Never cut search + map, the listing page, reservations, landlord listings, verification or admin approvals.
