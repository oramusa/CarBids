# UI Visual Design Pass — Design Spec

Date: 2026-08-10

## Context

The app currently uses plain default shadcn styling (black/white, square corners,
no brand identity). The requested target is a dark navy background with a bold
orange accent, rounded pill buttons/badges, and condensed bold headings.

**Important pre-existing note:** none of the following referenced in the original
task request exist yet in this repo: `hero.tsx`, `filter-bar.tsx`,
`car-illustration.tsx`, a `ListingGallery` component, a `pulse-dot` UI component,
or any dark navy/orange theming in `globals.css`. This spec treats the task as
building these from scratch, not fixing existing implementations. Confirmed with
user: build fresh, as originally described.

This is a UI/visual-only pass. No auth, no bidding logic, no RLS changes — except
the one schema addition explicitly required for the location feature (item 5),
which is scoped narrowly (one nullable column + form field + query update).

## Scope

1. Dark navy + orange theme in `src/app/globals.css`
2. New shared components: `CarIllustration`, `PulseDot`, `Footer`
3. Home page: `Hero` + `FilterBar` (disabled "coming soon" pills)
4. Listing card: `CarIllustration` fallback, urgency accent bar, location line
5. Listing detail page: `ListingGallery` (with `CarIllustration` fallback),
   `BidPanel` orange `PulseDot` for live status
6. Schema: nullable `location text` column on `listings`, sell form field,
   query/type updates
7. Responsive pass on hero, grid, footer, bid panel

## 1. Theme

Replace `:root` / `.dark` tokens in `globals.css` with a dark-navy-first palette
(the app has no light/dark toggle today — it will simply render dark by default).

- `--background`: `oklch(0.16 0.03 258)` (deep navy)
- `--card` / `--popover`: `oklch(0.20 0.03 258)`
- `--foreground`: `oklch(0.96 0.01 258)`
- `--primary` (brand orange): `oklch(0.70 0.19 41)`, `--primary-foreground`: near-black `oklch(0.18 0.02 41)`
- `--muted` : `oklch(0.24 0.03 258)`, `--muted-foreground`: `oklch(0.65 0.02 258)`
- `--border` / `--input`: `oklch(0.28 0.03 258)`
- `--destructive`: keep existing red-ish value (already works for "ending very soon")
- New token `--urgency-plenty` (blue, >24h left): `oklch(0.65 0.15 250)`
- `--radius`: increase for pill shapes; add `rounded-full` to `Button`/`Badge` default variants where appropriate (buttons: pill shape on `default`/`lg`; badges: already close to pill, bump radius to full)

Headings get a condensed-bold treatment via existing Tailwind utilities
(`font-bold tracking-tight`) — no new font import (repo intentionally avoids
`next/font/google`, per existing comment in `layout.tsx`).

## 2. New shared components

- **`src/components/car-illustration.tsx`** — inline SVG, stylized car
  silhouette on a subtle gradient (navy → slightly lighter navy), sized via
  `className`/`fill` prop pattern similar to other components. Used anywhere
  a listing has no photo.
- **`src/components/ui/pulse-dot.tsx`** — small `<span>` with a solid dot +
  animated ping ring, color via `className` (defaults to brand orange). Used
  for "live" indicators in `Hero`, `ListingCard`, `BidPanel`.
- **`src/components/footer.tsx`** — brand mark + one-line tagline (left);
  link columns: "How It Works" style column omitted (no such page exists) —
  instead a single "Explore" column with functional links only: Auctions → `/`,
  Sell a Car → `/sell`. Bottom bar: `© {year} Car Bids` + Terms of Use / Privacy
  Policy as inert (non-navigating, muted-styled) text — no social icons or app
  store badges, since there's nothing real to link to. Rendered in `layout.tsx`
  below `<main>`.

## 3. Home page

- **`src/components/hero.tsx`** — headline + short tagline, `PulseDot` +
  "live auctions" microcopy, sits above the listing grid in `page.tsx`.
- **`src/components/filter-bar.tsx`** — Year / Transmission / Body Style /
  Price rendered as pill-shaped buttons, `disabled`, reduced-opacity,
  `cursor-not-allowed`, with a `title="Coming soon"` tooltip. Purely
  presentational — no filtering logic, since the schema doesn't support it.
  Placed between `Hero` and the grid in `page.tsx`.

## 4. Listing card (`listing-card.tsx`)

- Replace the plain "No photo yet" `<div>` with `<CarIllustration />`.
- Add a 3px accent bar spanning the card width directly under the photo:
  - `> 24h` remaining → `--urgency-plenty` (blue)
  - `1h–24h` remaining → brand orange
  - `< 1h` remaining → `--destructive` (red)
  - ended/no auction → muted grey
  Computed client-side from `auction.end_time` (reuse the same threshold logic
  as `Countdown`, factored into a small helper in `src/lib/format.ts` —
  `getUrgencyLevel(endTime)` — since both `Countdown` and `ListingCard` need it).
- Add a location line below the make/model/spec line: small pin icon
  (`MapPin` from `lucide-react`, already a project dependency) +
  `{listing.location}` text, only rendered when `location` is set.

## 5. Listing detail page

- **`src/components/auction/listing-gallery.tsx`** — extracted from the
  inline photo block in `listings/[id]/page.tsx`. Same fallback treatment:
  `CarIllustration` instead of the "No photos yet" text box. Scoped to just
  the photo display (no new carousel/multi-photo behavior — out of scope,
  matches current single-photo-shown behavior).
- **`BidPanel`**: add `<PulseDot />` next to "Time left" while
  `!isEnded`, orange, matching the hero/card treatment.

## 6. Schema change — `location`

Minimal, additive, nullable — no backfill needed:

```sql
-- supabase/migrations/0002_add_listing_location.sql
alter table listings add column location text;
```

- `sell/page.tsx`: add optional `location` field to the zod schema and form
  (single text input, e.g. "City, State"), included in the insert payload.
- `page.tsx` (home) and `listings/[id]/page.tsx` queries: add `location` to
  the `select()` calls.
- `ListingCardData` type (`listing-card.tsx`): add `location: string | null`.
- `types.ts` stays as-is (already an intentional `any` placeholder pending
  real Supabase codegen — not regenerating it as part of this pass).

## 7. Responsive pass

After each section is implemented, check at a mobile viewport width (~375px):
`Hero` (headline wrapping, dot alignment), grid (single column, card spacing),
`Footer` (columns stack, bottom bar wraps cleanly), `BidPanel` (bid input +
button don't overflow, bid history list stays legible). Fix cramped
spacing/wrapping found, no structural redesign.

## Non-goals

- No auth/RLS/bidding-logic changes.
- No light/dark mode toggle — dark navy is the only theme.
- No real filtering functionality for Year/Transmission/Body Style/Price.
- No multi-photo carousel on the gallery.
- No new pages invented for footer links that don't exist in the app.
