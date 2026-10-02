# Handoff: BoardZM web app

## Overview
BoardZM is a housing marketplace for Lusaka. Students and young professionals find rooms near campus from verified landlords, read reviews from past tenants, find roommates and reserve with a mobile-money deposit; landlords list rooms and track deposits and payouts. This document describes the screens to build. Scope, stack, data model and build order are in `PLAN.md`.

## About the design files
`design/boardzm-app.dc.html` is a **design reference made in HTML**: a clickable prototype with sample data showing the intended look and behaviour. It is not production code. Recreate it in the app's stack (React + TypeScript + Vite, see `PLAN.md`) with real data from Supabase. Open it in Chrome to click through, and read its source for exact copy, spacing and sample data; it uses inline styles, so every value is in the markup.

## Fidelity
**High fidelity** for the desktop screens: colours, type, spacing, copy, states and flows are final. The **phone layout**, **listing form**, **verification page**, **account pages** and **admin area** aren't drawn. Build them from the rules below with the same components.

Deliberate changes from the prototype (it's a demo; these match the real product):
1. Verification belongs to the landlord, not to each listing. The landlord table's status column shows the listing status (Draft, In review, Live, Reserved, Let, Rejected, Archived); "Verify · K50" lives on the verification card.
2. An admin reviews verification. Card copy: "Reviewed by the BoardZM team, usually within a day. No office visit." (replaces "Checked automatically — usually within minutes.").
3. Roommates sub-line: "Matches are scored on budget, campus, move-in date and living habits. Only signed-in members can see profiles." Tenants aren't ID-verified.
4. "List a room" opens a full form page, not the small dialog.
5. The drawn map becomes a real Leaflet map; pin and campus-marker styling stay.
6. The payment dialog gains a "Simulated phone prompt" (Approve / Decline) and a failure step; a test-mode banner shows across the app while payments are simulated.
7. Every primary button has the blueprint corner marks (the prototype's roommate buttons are missing them).
8. Tenants with a reservation get "Message landlord on WhatsApp".
9. Amounts come from `app_settings`; the K figures in the prototype are placeholders.

## Design system
Industry is a blueprint wireframe: a steel-blue accent on a light technical ground, Barlow Condensed headings over Barlow, square corners, hairline borders and "+" registration marks on cards, figures and primary buttons. Photos are duotoned into the accent. Use `design/industry.css` as-is (the classes are listed in `CLAUDE.md`) and `design/themes.css` for the four themes.

### Tokens (Blueprint theme, from industry.css)
| Token | Value |
|---|---|
| `--color-bg` | #f2f2f3 |
| `--color-surface` | #e9e9ea (inputs) |
| `--color-text` | #1d1f20 |
| `--color-accent` | #5980a6 |
| `--color-divider` | text at 16% |
| Accent ramp 100 → 900 | #eef6ff #d6ebff #b5d9fd #94bce3 #749dc4 #597ea3 #416180 #2c455d #1d2d3d |
| Neutral ramp 100 → 900 | #f5f5f8 #e7e7ea #d4d4d7 #b7b7ba #98989b #7a7a7d #5d5d60 #424244 #2b2b2d |
| `--font-heading` | Barlow Condensed, weight 600 |
| `--font-body` | Barlow 400 / 500 / 700; base 15px / 1.55 (app text mostly 13–14px) |
| `--space-1 / 2 / 3 / 4 / 6 / 8` | 3.4 / 6.8 / 10.2 / 13.6 / 20.4 / 27.2 px (there is no 5) |
| Radius | 0 on cards, buttons, inputs, tags and dialogs |
| `--shadow-sm / md / lg` | 0 1px 2px · 0 3px 10px · 0 12px 32px (ink at 14 / 16 / 22%) |
| `--color-text-muted` (add in app.css) | text at 70%, for small secondary text |

Type sizes: page title h1 40px / 1.0 (listing title 44px / 1.02) · section h2 24px · card titles 20px (listing cards), 21px (roommates), 19px (landlord card) · price 22px (cards), 36px (reserve panel) · stat value 34px · body 14px · meta 13px · labels 12px · kicker 11px uppercase, letter-spacing .1em, accent-700 · tags 11px.

### Themes
Set with `data-theme` on `<html>`: **Blueprint** (default), **Night** (dark navy: bg #141c25, accent #7fa6cc), **Copper** (warm paper #f4f1ec, accent #b06a3c), **Emerald** (#f1f3f1, accent #2f7d58). Full values are in `design/themes.css`; Night sets `color-scheme: dark`.

### Icons (lucide-react, strokeWidth 1.5)
Find a room `Search` · Roommates `Users` · For landlords `Building2` · Saved `Heart` · Verified `ShieldCheck` · Featured `Zap` · rating `Star` · location `MapPin` · back `ArrowLeft` · mobile money `Smartphone` · deposit safety `Lock` · add `Plus` · sent `Check` · request `UserPlus` · approved `CircleCheck` · sponsored `Store` · WhatsApp `MessageCircle` · map/list toggle `Map` / `List` · account `User`.
Sizes: 12px in tags, 13–15px inline and in buttons, 16px in primary buttons, 24–26px in dialog titles.

## Shell
- **Header** (`.nav`, sticky, z-index 20, `--color-bg` ground, 1px divider at the bottom): brand button "BoardZM" (heading 24px) + "Lusaka" (11px uppercase, .08em, accent-700) · nav ghost buttons with icons (padding 6px 10px; active = text colour + 2px accent bottom border; inactive = accent-700) · theme select (`.input`, auto width, 32px high, 13px) · `tag-accent` with Heart "Saved · N".
- **Footer**: 1px divider on top, 12px muted text; "BoardZM · Direct from landlords, no agents" on the left, "Deposits held via MTN MoMo · Airtel Money · Zamtel Kwacha" on the right.
- **Toast**: fixed 24px from the bottom, centred; text-colour ground with bg-colour text, 13px, padding 10px 16px, `--shadow-md`; disappears after 2.6 s.
- **Test-mode banner** (new): a one-line strip under the header, `--color-accent-100` ground, `--color-accent-800` 12px text: "Test mode — payments are simulated, no real money moves."

## Screens

### 1. Find a room (`/`)
Layout: an intro band (padding space-4 space-4 space-3, divider at the bottom), then a two-column grid `repeat(auto-fit, minmax(min(100%, 420px), 1fr))`: the list (padding space-4, gap space-3) and the map (sticky, top 64px, padding space-4).
- **Intro:** kicker "Off-campus rooms · verified landlords"; h1 "Find a room near campus"; on the right, "N rooms · rent shown in Kwacha per month" (13px muted).
- **Filters** (wrapping row, gap space-3, bottom-aligned): Area select (min 170px; "All areas" + areas) · Max rent range K1,000–K5,000, step 100, label "Max rent · K 5,000 / month" · Room type `.seg` Any / Single / Shared / Self-contained (selected = accent ground, bg-colour text) · Sort select Recommended / Lowest rent / Nearest campus · checkbox "Verified landlords only" (accent-color). Add a "Near" campus select for distances.
- **Listing card:** `.card` + Blueprint, row layout, gap space-3, padding space-2.
  - Cover 132px wide, at least 112px tall, `.duotone`, 1px divider border. With no photo, a stripe placeholder: `repeating-linear-gradient(135deg, var(--color-accent-100) 0 8px, transparent 8px 16px)`.
  - Right column (gap 6px): tags (Featured: `tag-outline` + Zap · Verified landlord: `tag-accent` + ShieldCheck · Not yet verified: `tag-neutral` · Reserved: `tag-neutral`, new) · title 20px · meta 13px muted with MapPin, e.g. "Kalingalinga · 0.8 km to UNZA · Self-contained" · bottom row: price (heading 22px) + " / month" (12px), and the rating (12px accent-700 with Star), e.g. "4.5/5 · 2 reviews" or "New listing".
  - States: divider border by default; accent-300 border when featured; when hovered (or its pin is hovered), accent border + accent-100 ground.
- **Sponsored card:** `.card` with a dashed border, row layout; kicker with Store "Sponsored · Local business"; title; body; `btn-secondary` call to action. Placed after the 4th result.
- **Map:** Blueprint frame, height min(640px, 100vh − 110px), at least 420px. Greyscale tiles (inverted greyscale in Night) so the steel pins stand out.
  - Price pin: e.g. "1.8k", 12px weight 600, padding 3px 7px, 1px accent border, `--shadow-sm`, anchored at the bottom centre. Default: bg-colour ground with accent-800 text. Highlighted: accent ground with bg-colour text, raised above the others.
  - Campus marker: a 14px square with a 1.5px text-colour border, plus a label (heading 13px on a bg-colour ground).
  - Legend at the bottom left: Campus · Room (rent in K). OpenStreetMap attribution is required.
- **Empty state:** Blueprint card with "No rooms match", "Try a higher rent limit or a different area." and a `btn-secondary` "Reset filters".

### 2. Listing (`/listing/:id`)
Max width 1240px, padding space-4, gap space-4.
- Ghost button "← Back to results" (ArrowLeft).
- **Photo grid:** columns 2fr 1fr 1fr, rows 180px 180px, gap space-2. The main photo spans both rows (Blueprint + duotone), with four smaller photos beside it. Tapping opens a full-screen gallery in true colour (swipe on phones).
- **Body grid** `repeat(auto-fit, minmax(min(100%, 340px), 1fr))`, gap space-6; the main column spans 2.
  - Tags · h1 44px · location 15px muted with MapPin: "Kalingalinga, Lusaka · 0.8 km to UNZA".
  - **Spec cells:** grid `repeat(auto-fit, minmax(140px, 1fr))`, ruled (top and left borders on the grid, right and bottom on each cell), cell padding 12px 14px; key 11px uppercase accent-700; value heading 22px. Cells: Rent · Type · To {campus} · Available · Deposit.
  - "What's included" (h2 24px); amenity tags `tag-neutral`, 13px, padding 5px 12px.
  - **Landlord card** (Blueprint, row, padding space-3): 52px initials square (heading 20px, accent-700) · name 19px · note 13px muted: "ID and ownership verified · on BoardZM since 2025" or "Verification in progress · on BoardZM since 2026" · `btn-secondary` with Heart "Save" / "Saved".
  - **Reviews:** h2 "Tenant reviews" + "4.5/5 · 2 reviews · only past tenants can review" (13px accent-700, Star). Each review: divider on top, padding 12px 0; "**Mutale K.** · 4th-year Engineering" + "5/5 · Jun 2026" (accent-700); text 14px / 1.5, max 68ch; a Report link (new). With none: "No reviews yet — this is a new listing."
- **Reserve panel** (Blueprint `.card` + `elev-sm`, sticky, top 80px, padding space-4, gap space-3): price 36px + " / month" · rows "Reservation deposit K 500", "Booking service fee K 25", "**Pay now K 525**" (divider above the last) · primary block button with Smartphone "Reserve with mobile money" (min height 44px, 15px) · note 12px muted with Lock: "Your deposit is held by BoardZM, not the landlord, until you move in. Deducted from your first month's rent."
  - **Reserved by you:** a box with a 1px accent border, accent-100 ground and 12px padding: ShieldCheck "**Reserved — deposit held**" (accent-800) and "Ref BZ-000123. Released to the landlord when you confirm move-in, refunded if the room isn't as listed." Below it: `btn-secondary` with MessageCircle "Message landlord on WhatsApp" (new) and a `btn-secondary` block "Confirm move-in".
  - **Reserved by someone else:** Reserved tag + "This room is currently reserved."
  - **Moved in:** a bordered box: "Move-in confirmed. Deposit released to {landlord}."
  - **Phones:** the panel becomes a sticky bottom bar (price + Reserve button).

### 3. Payment dialog (reservation and every fee)
`.dialog` + Blueprint on `--color-bg`, width min(460px, 100%). Clicking the backdrop closes it, except while waiting.
1. **Details:** title 26px "Reserve {listing title}" (for fees: "Publish listing", "Feature for 7 days", "Verify your account") · "Pay with" `.seg` at full width, 3 equal options, 40px high: MTN MoMo / Airtel Money / Zamtel Kwacha · "Mobile money number" input (16px, 44px high, letter-spacing .04em), placeholder per provider: 096 123 4567 / 097 123 4567 / 095 123 4567. Typing a known prefix selects the provider · error 12px weight 600 · Total row (divider above, weight 600) · actions: ghost "Cancel", primary with Smartphone "Send payment prompt".
   Validation: 10 digits starting with 0, or +260 plus 9 digits; otherwise "Enter a 10-digit Zambian number, e.g. 0971 234 567." A provider mismatch shows a warning but is allowed: "That looks like an Airtel Money number — check the provider."
2. **Waiting:** title with Smartphone (24px, accent) "Check your phone" · "A {provider} prompt for **K 525** was sent to **{phone}**. Enter your PIN to approve." · a pulsing 10px accent square (opacity 1 ↔ .35, 1 s) with "Waiting for approval…" (accent-700, 13px). In simulated mode, add a dashed box "Simulated phone prompt" with Decline (secondary) and Approve (primary).
3. **Success:** title with CircleCheck (26px, accent) "Room reserved" · "K 500 is held safely by BoardZM. {landlord} has been notified and will share viewing and key details." · reference box (1px divider, padding 10px 12px) · primary "Done". Fee payments use matching wording ("Listing published", "In review", and so on).
4. **Failed** (new): "Payment not completed" + "No money was taken. Try again or use another number." · "Try again".

### 4. Roommates (`/roommates`)
Max width 1240px. Kicker "Split the rent", h1 "Roommate matching", sub-line (see the changes above). Campus `.seg`: All / UNZA / UNILUS / Evelyn Hone / Working. Grid `repeat(auto-fill, minmax(min(100%, 280px), 1fr))`, gap space-4.
- **Card** (Blueprint, padding space-3, gap 10px): name 21px + role 13px muted · match "92%" (heading 28px, accent-700) + "MATCH" (10px) · a 4px bar (accent-100 track, accent fill) · Budget and Move-in in two columns, 13px · habit tags · button: primary with UserPlus "Request to match" → secondary with Check "Request sent" → "Accepted" + MessageCircle "WhatsApp".
- **New:** "My roommate profile" (an "Edit my profile" button opening a dialog) and "Requests" (incoming, with Accept / Decline).

### 5. Landlord dashboard (`/landlord`)
Kicker "Landlord · {name}", h1 "Your properties", primary with Plus "List a room". Stat cells (ruled grid `repeat(auto-fit, minmax(200px, 1fr))`, padding 16px 18px; key 11px uppercase accent-700; value heading 34px): Live listings · Deposits held · Paid out this year.
The grid below has a main column (spans 2) and an aside:
- **Listings** `.table`: Room (bold title + 12px muted area) · Rent · Status (tag, plus a Featured `tag-outline`) · Actions on the right: Edit, Feature (ghost with Zap), View, Archive / Relist.
- **Deposits & payouts** `.table`: Tenant · Room · Amount · Status (Held `tag-outline`, Paid out `tag-accent`, Refunded `tag-neutral`). Note 12px muted: "Payouts go to {provider} {masked number} when the tenant confirms move-in."
- **Verification card** (Blueprint): kicker "Identity verification", title "Verified landlord" (22px), the copy above, then rows (divider on top, 14px): National Registration Card · Selfie match · Title deed / lease · Mobile money payout, each with a value in accent-700 weight 600 with CircleCheck: Approved / Uploaded / Needs attention / Linked. "Verify · K50" button while not verified.

### 6. Listing form (`/landlord/listings/new`, `/landlord/listings/:id`): not drawn
One column, max width 720px, `.field` + `.input`. Sections: Basics (title, description textarea, type select, area select, rent, available from) · Amenities (toggle tags) · Location (Leaflet map in a Blueprint frame, 320px high; tap to drop a pin) · Photos (Blueprint drop zone; 3–8 thumbnails, drag to reorder, first is the cover, remove) · sticky footer with secondary "Save draft" and primary "Publish · K40". Show any `check_listing` reasons in a bordered list above the footer.

### 7. Verification (`/landlord/verification`): not drawn
Four upload slots in a 2 × 2 grid of Blueprint cards (label, hint, thumbnail or file name, Replace). A status strip: Awaiting payment / Pending review / Approved / Rejected + reason. Primary "Verify · K50".

### 8. Saved, reservations, account, welcome, sign-in: not drawn
Saved = the search list without the map. Reservations = cards with a status tag, reference, WhatsApp, Confirm move-in and Write a review. Forms use `.field` / `.input` in one column, max 420px. Sign-in: a centred Blueprint card with a secondary "Continue with Google" button above the email form.

### 9. Admin (`/admin`): not drawn
Tabs as a `.seg` (scrolls sideways on phones): Verifications · Listings · Reports · Reservations · Ads · Settings, with a count in each label. Each tab is a `.table`; clicking a row opens a `.dialog` with details and actions (primary Approve; secondary Reject with a required reason).

## Phone layout (under 768px)
- **Header:** brand + Saved count only. The nav moves to a fixed bottom tab bar (56px + safe-area inset, `--color-bg`, divider on top; 20px icon over an 11px label; active = text colour with an accent icon). The theme select moves to Account.
- **Search:** filters collapse into a "Filters" button (opens a full-height sheet) next to the result count; the list shows first; a floating "Map" / "List" toggle (primary, bottom centre, above the tab bar).
- **Listing:** photos become a swipeable strip; the reserve panel becomes a sticky bottom bar.
- **Dialogs:** full-width sheets anchored to the bottom.
- **Tables** (landlord, admin) become stacked cards.
- Tap targets at least 44px; inputs 16px so iOS doesn't zoom.

## Interactions & behaviour
- Hover and press styles come from the CSS (primary hover accent-600, active accent-700; secondary and ghost tints). Focus: 2px accent outline, offset 2px.
- Card ↔ pin hover stays in sync; clicking either opens the listing.
- Save toggles instantly (optimistic update) and updates the header count.
- Filters update the URL and results immediately (debounce the rent slider by 200ms).
- Reserving requires sign-in, then returns to the listing.
- Payment steps: details → waiting → success or failed; the dialog can't close while waiting.
- Toasts confirm: listing published, featured, request sent, move-in confirmed, review submitted.
- Loading: skeleton cards (Blueprint outlines with accent-100 bars). Errors: inline, in plain words, with Retry.

## State
- Server data through TanStack Query: `['settings']`, `['listings', filters]`, `['listing', id]`, `['saved']`, `['reservations']`, `['me']`, `['landlord', 'dashboard']`, `['roommates', campus]`, `['requests']`, `['admin', tab]`. Invalidate the related queries after each change.
- URL: search filters. localStorage: theme. Auth session: supabase-js.
- Local UI state: payment dialog step, hovered listing id, map/list toggle.

## Assets
No image assets: photos come from landlords (Supabase Storage), and placeholders use the stripe pattern above. Fonts: Barlow 400 / 500 / 700 and Barlow Condensed 400 / 600 (@fontsource). App icons: a simple wordmark for now; replace it with a real logo later.

## Files
- `design/boardzm-app.dc.html`: the prototype. Open it in Chrome; it needs `support.js` and `_ds/` next to it and an internet connection.
- `design/industry.css`: the design system stylesheet → `src/styles/industry.css`.
- `design/themes.css`: the four themes → `src/styles/themes.css`.
- `places.md`: campus and area coordinates (you fill this in).
- `claude-settings.json`: Claude Code permissions → `.claude/settings.json`.
- `PLAN.md`: MVP, stack, data model, build blocks.
