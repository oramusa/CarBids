# UI Visual Design Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Car Bids a dark-navy/orange visual identity (theme, hero, footer, illustrated no-photo fallback, urgency-colored listing cards with location, filter-bar placeholders, live-status pulse dot) without touching auth, bidding, or RLS logic, plus the one narrowly-scoped schema addition (`listings.location`) needed for the location line.

**Architecture:** New small, single-purpose components (`CarIllustration`, `PulseDot`, `Footer`, `Hero`, `FilterBar`, `ListingGallery`) built on the existing shadcn-style `src/components/ui/` primitives and `cva`/`cn` conventions already in the repo. Theme changes are CSS-variable-only in `globals.css`, so every component that already uses `bg-background`/`bg-card`/`text-primary`-style tokens picks up the new palette automatically. One additive, nullable-column migration for `location`.

**Tech Stack:** Next.js 16 (App Router), React, Tailwind v4 (`@import "tailwindcss"` + `tw-animate-css`), `class-variance-authority`, `lucide-react` (already a dependency, use `MapPin`), Supabase (Postgres + Realtime), `react-hook-form` + `zod`.

## Global Constraints

- No auth/RLS/bidding-logic changes — visual pass only, except the `location` column (explicitly in scope per spec item 5).
- No new npm dependencies — `lucide-react` is already installed; use it for the pin icon.
- No test framework exists in this repo (`package.json` has no test script) — do not introduce one. Verify each task with `npx tsc --noEmit` (type safety) and a manual dev-server check (`npm run dev`), per the user's explicit instruction to "screenshot or check in-browser after each item before moving to the next."
- Dark navy is the only theme — no light/dark toggle.
- Footer links only to real pages (`/`, `/sell`); Terms of Use / Privacy Policy render as inert (non-navigating) text; no other reference-design links (SafePay, Dashboard, podcast, app store badges, social icons, etc.) are added.
- Filter-bar pills are visual-only (`disabled`), no filtering logic.
- Check mobile-width (~375px) rendering as part of the verification step for every task that adds visible UI (Hero, FilterBar, ListingCard, Footer, BidPanel) — fix cramped spacing/wrapping inline, no structural redesign.

---

### Task 1: Dark navy + orange theme tokens

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: CSS custom properties consumed by every component using `bg-background`, `bg-card`, `bg-primary`, `text-primary-foreground`, `bg-muted`, `text-muted-foreground`, `border`, plus a new `--urgency-plenty` token (blue, used by Task 4/6).

- [ ] **Step 1: Replace `:root` token values**

Open `src/app/globals.css` and replace the `:root { ... }` block's color values (keep `--radius` key, other non-color keys as-is) with:

```css
:root {
  --radius: 0.9rem;
  --background: oklch(0.16 0.03 258);
  --foreground: oklch(0.96 0.01 258);
  --card: oklch(0.20 0.03 258);
  --card-foreground: oklch(0.96 0.01 258);
  --popover: oklch(0.20 0.03 258);
  --popover-foreground: oklch(0.96 0.01 258);
  --primary: oklch(0.70 0.19 41);
  --primary-foreground: oklch(0.18 0.02 41);
  --secondary: oklch(0.24 0.03 258);
  --secondary-foreground: oklch(0.96 0.01 258);
  --muted: oklch(0.24 0.03 258);
  --muted-foreground: oklch(0.65 0.02 258);
  --accent: oklch(0.24 0.03 258);
  --accent-foreground: oklch(0.96 0.01 258);
  --destructive: oklch(0.60 0.22 25);
  --border: oklch(0.28 0.03 258);
  --input: oklch(0.28 0.03 258);
  --ring: oklch(0.70 0.19 41 / 0.5);
  --urgency-plenty: oklch(0.65 0.15 250);
}
```

- [ ] **Step 2: Remove or align the `.dark` block**

The app has no theme toggle and is dark-only now. Find the `.dark { ... }` block immediately below `:root` and delete it entirely (it duplicated the old light-mode-inverted values; with `:root` now dark by default, an unused `.dark` class block is dead weight). Confirm `<html>` in `src/app/layout.tsx` has no `className="dark"` or similar toggle logic referencing it (it doesn't — verified: `className="h-full antialiased"`).

- [ ] **Step 3: Verify type/build safety**

Run: `npx tsc --noEmit`
Expected: no new errors (CSS changes don't affect TS, this just confirms the repo baseline is clean before continuing).

- [ ] **Step 4: Visual check**

Run: `npm run dev`, open `http://localhost:3000` in a browser.
Expected: page background is dark navy, existing buttons/badges/cards render with the orange primary color and navy surfaces (existing components already reference the tokens, so this should "just work" with no other code changes). Note anything that looks broken (e.g. low-contrast text) to fix in this step before moving on.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "style: switch theme tokens to dark navy + orange"
```

---

### Task 2: `PulseDot` component

**Files:**
- Create: `src/components/ui/pulse-dot.tsx`

**Interfaces:**
- Produces: `PulseDot({ className }: { className?: string })` — renders a small animated dot. Default color is brand orange (`bg-primary`); callers override via `className` (e.g. pass a different `bg-*` utility).
- Consumed by: Task 6 (`Hero`), Task 6 (`ListingCard` — actually consumed in Task 6's ListingCard update), Task 11 (`BidPanel`).

- [ ] **Step 1: Write the component**

```tsx
import { cn } from "@/lib/utils";

export function PulseDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-2", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-current" />
    </span>
  );
}
```

Note: the dot uses `bg-current`, so color is set by the caller via a `text-*` class on `className` (e.g. `className="text-primary"`), not `bg-*` — this lets one component work for orange, blue, or red without variants.

- [ ] **Step 2: Verify type safety**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/pulse-dot.tsx
git commit -m "feat: add PulseDot component"
```

---

### Task 3: `CarIllustration` component

**Files:**
- Create: `src/components/car-illustration.tsx`

**Interfaces:**
- Produces: `CarIllustration({ className }: { className?: string })` — fills its container (`className` should include sizing, e.g. `h-full w-full`), renders an inline SVG car silhouette on a navy gradient background.
- Consumed by: Task 6 (`ListingCard`), Task 10 (`ListingGallery`).

- [ ] **Step 1: Write the component**

```tsx
export function CarIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label="No photo available"
      className={className}
    >
      <defs>
        <linearGradient id="car-illustration-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.22 0.03 258)" />
          <stop offset="100%" stopColor="oklch(0.16 0.03 258)" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#car-illustration-bg)" />
      <g transform="translate(60 150)" fill="none" stroke="oklch(0.55 0.03 258)" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round">
        <path d="M10 40 L40 0 L220 0 L260 40 L280 40 L280 70 L0 70 L0 40 Z" />
        <line x1="0" y1="55" x2="280" y2="55" />
        <circle cx="60" cy="70" r="22" fill="oklch(0.16 0.03 258)" />
        <circle cx="220" cy="70" r="22" fill="oklch(0.16 0.03 258)" />
      </g>
    </svg>
  );
}
```

- [ ] **Step 2: Verify type safety**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/car-illustration.tsx
git commit -m "feat: add CarIllustration no-photo fallback"
```

---

### Task 4: `getUrgencyLevel` helper

**Files:**
- Modify: `src/lib/format.ts`

**Interfaces:**
- Produces: `getUrgencyLevel(endTime: string, now?: number): "plenty" | "soon" | "urgent" | "ended"` — `plenty` = >24h remaining, `soon` = 1h–24h, `urgent` = <1h (and >0), `ended` = ≤0. Optional `now` param (defaults to `Date.now()`) for deterministic callers.
- Consumed by: Task 6 (`ListingCard` accent bar + card `PulseDot` color).

- [ ] **Step 1: Add the function**

Append to `src/lib/format.ts`:

```ts
export function getUrgencyLevel(
  endTime: string,
  now: number = Date.now()
): "plenty" | "soon" | "urgent" | "ended" {
  const remainingMs = new Date(endTime).getTime() - now;
  if (remainingMs <= 0) return "ended";
  if (remainingMs < 60 * 60 * 1000) return "urgent";
  if (remainingMs < 24 * 60 * 60 * 1000) return "soon";
  return "plenty";
}
```

This is intentionally independent from `Countdown`'s own 2-minute "ending soon" pulse-animation threshold in `src/components/auction/countdown.tsx` — that threshold governs a different concern (when the countdown text itself starts pulsing) and is not being changed by this pass.

- [ ] **Step 2: Manually verify the thresholds**

Run: `node -e "
const endTime = new Date(Date.now() + 25*3600*1000).toISOString();
console.log(endTime);
"` — then temporarily paste the function body into a `node -e` one-liner (or just eyeball the logic) to confirm: 25h away → `plenty`, 12h away → `soon`, 30min away → `urgent`, -5min away → `ended`. Since there's no test runner in this repo (see Global Constraints), this is a manual sanity check, not an automated test.

Expected: all four cases match by inspection of the boundary math (`< 60*60*1000` and `< 24*60*60*1000`).

- [ ] **Step 3: Verify type safety**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/format.ts
git commit -m "feat: add getUrgencyLevel helper for card accent bar"
```

---

### Task 5: `location` schema + sell form + query/type updates

**Files:**
- Create: `supabase/migrations/0002_add_listing_location.sql`
- Modify: `src/app/sell/page.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/listings/[id]/page.tsx`
- Modify: `src/components/listing-card.tsx` (type only — UI in Task 6)

**Interfaces:**
- Produces: `listings.location` (nullable text, Postgres); `ListingCardData.location: string | null`; `location` field flows through the sell form insert and both listing queries.
- Consumed by: Task 6 (`ListingCard` location line).

- [ ] **Step 1: Write the migration**

```sql
-- Car Bids App — add optional location to listings
alter table listings add column location text;
```

Save as `supabase/migrations/0002_add_listing_location.sql`. (Applying it against a live Supabase project is the user's responsibility per the existing `README.md` convention — this task only adds the file.)

- [ ] **Step 2: Add the field to the sell form schema**

In `src/app/sell/page.tsx`, update the zod schema:

```ts
const schema = z.object({
  make: z.string().min(1, "Required"),
  model: z.string().min(1, "Required"),
  year: z.coerce.number().int().min(1900).max(2100),
  mileage: z.coerce.number().int().min(0),
  vin: z.string().optional(),
  condition: z.string().optional(),
  location: z.string().optional(),
  description: z.string().min(20, "Tell buyers a bit more (20+ characters)"),
});
```

- [ ] **Step 3: Add the form input**

In `src/app/sell/page.tsx`, inside the `<div className="grid grid-cols-2 gap-4">` block, after the `condition` field's closing `</div>`, add:

```tsx
<div className="flex flex-col gap-2">
  <Label htmlFor="location">Location (optional)</Label>
  <Input
    id="location"
    placeholder="City, State"
    {...register("location")}
  />
</div>
```

- [ ] **Step 4: Confirm the insert payload carries it through**

`onSubmit` already does `.insert({ ...values, seller_id: user.id, photos: photoUrls })` — since `location` is now part of `values` (the zod-parsed `FormValues`), no further change is needed here. Read `src/app/sell/page.tsx` after Steps 2–3 to confirm this.

- [ ] **Step 5: Add `location` to the home page query**

In `src/app/page.tsx`, update the `.select()` call:

```ts
const { data: listings, error } = await supabase
  .from("listings")
  .select(
    `id, make, model, year, photos, location,
     auction:auctions!inner (id, end_time, current_high_bid, reserve_price, reserve_met, status)`
  )
  .eq("auctions.status", "live")
  .order("end_time", { referencedTable: "auctions", ascending: true });
```

- [ ] **Step 6: Add `location` to the listing detail query**

`src/app/listings/[id]/page.tsx` already uses `select('*, seller:profiles!listings_seller_id_fkey (username), auction:auctions!inner (*)')` — the `*` already covers the new column once the migration is applied, so no change needed there. Read the file to confirm the `*` is still present.

- [ ] **Step 7: Add the field to `ListingCardData`**

In `src/components/listing-card.tsx`, update the type:

```ts
export type ListingCardData = {
  id: string;
  make: string;
  model: string;
  year: number;
  photos: string[];
  location: string | null;
  auction: {
    id: string;
    end_time: string;
    current_high_bid: number | null;
    reserve_price: number | null;
    reserve_met: boolean;
  } | null;
};
```

- [ ] **Step 8: Verify type safety**

Run: `npx tsc --noEmit`
Expected: no errors. (`src/app/page.tsx`'s cast to `ListingCardData & {...}` will now require `location` in the selected columns, which Step 5 provides.)

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/0002_add_listing_location.sql src/app/sell/page.tsx src/app/page.tsx src/components/listing-card.tsx
git commit -m "feat: add optional location field to listings"
```

---

### Task 6: `ListingCard` — illustration fallback, urgency accent bar, location line

**Files:**
- Modify: `src/components/listing-card.tsx`

**Interfaces:**
- Consumes: `CarIllustration` (Task 3), `PulseDot` (Task 2), `getUrgencyLevel` (Task 4), `ListingCardData.location` (Task 5).

- [ ] **Step 1: Swap the no-photo fallback**

In `src/components/listing-card.tsx`, add the import:

```ts
import { CarIllustration } from "@/components/car-illustration";
import { MapPin } from "lucide-react";
import { getUrgencyLevel } from "@/lib/format";
```

Replace:

```tsx
<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
  No photo yet
</div>
```

with:

```tsx
<CarIllustration className="h-full w-full" />
```

- [ ] **Step 2: Add the urgency accent bar**

Compute the urgency level and map it to a color class. Above the `return (`, inside the component body, add:

```ts
const urgencyLevel = auction ? getUrgencyLevel(auction.end_time) : "ended";
const urgencyBarClass = {
  plenty: "bg-[oklch(0.65_0.15_250)]",
  soon: "bg-primary",
  urgent: "bg-destructive",
  ended: "bg-muted",
}[urgencyLevel];
```

Directly below the closing `</div>` of the photo block (still inside `<Card>`, before `<CardContent>`), add:

```tsx
<div className={`h-[3px] w-full ${urgencyBarClass}`} />
```

- [ ] **Step 3: Add the location line**

Inside `<CardContent className="pt-4">`, directly after the `<h3>` make/model/year heading and before the reserve-badge `<div>`, add:

```tsx
{listing.location && (
  <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
    <MapPin className="size-3" />
    {listing.location}
  </div>
)}
```

- [ ] **Step 4: Verify type safety**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Visual + mobile check**

Run: `npm run dev`, open `http://localhost:3000`. Confirm: cards with no photo show the car illustration (not a gray box); cards show a thin colored bar under the photo; if any test listing has `location` set, confirm the pin + text render below the title. Resize the browser to ~375px width and confirm cards still stack in a single column without overflow or squished text.

Expected: all checks pass; fix any spacing issues found before moving on.

- [ ] **Step 6: Commit**

```bash
git add src/components/listing-card.tsx
git commit -m "feat: add illustration fallback, urgency bar, and location to ListingCard"
```

---

### Task 7: `Footer` component

**Files:**
- Create: `src/components/footer.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: `Footer()` — no props.
- Consumed by: `RootLayout` in `src/app/layout.tsx`.

- [ ] **Step 1: Write the component**

```tsx
import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:justify-between">
        <div>
          <div className="text-lg font-bold tracking-tight">Car Bids</div>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Bid on enthusiast cars in live online auctions.
          </p>
        </div>

        <div>
          <div className="text-sm font-semibold">Explore</div>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground">
                Auctions
              </Link>
            </li>
            <li>
              <Link href="/sell" className="hover:text-foreground">
                Sell a Car
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {year} Car Bids</span>
          <div className="flex gap-4">
            <span className="cursor-default">Terms of Use</span>
            <span className="cursor-default">Privacy Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Wire it into the layout**

In `src/app/layout.tsx`, add the import:

```ts
import { Footer } from "@/components/footer";
```

Change:

```tsx
<Providers>
  <Nav />
  <main className="flex-1">{children}</main>
</Providers>
```

to:

```tsx
<Providers>
  <Nav />
  <main className="flex-1">{children}</main>
  <Footer />
</Providers>
```

- [ ] **Step 3: Verify type safety**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Visual + mobile check**

Run: `npm run dev`, open any page. Confirm the footer renders at the bottom with brand + tagline, an "Explore" column with working `Auctions`/`Sell a Car` links, and a bottom bar with copyright + inert "Terms of Use"/"Privacy Policy" text (not styled as clickable links, no `href`). Resize to ~375px and confirm the two columns stack vertically and the bottom bar wraps without overlap.

- [ ] **Step 5: Commit**

```bash
git add src/components/footer.tsx src/app/layout.tsx
git commit -m "feat: add Footer component"
```

---

### Task 8: `Hero` component on the home page

**Files:**
- Create: `src/components/hero.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `PulseDot` (Task 2).
- Produces: `Hero()` — no props.
- Consumed by: `HomePage` in `src/app/page.tsx`.

- [ ] **Step 1: Write the component**

```tsx
import { PulseDot } from "@/components/ui/pulse-dot";

export function Hero() {
  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-primary">
        <PulseDot className="text-primary" />
        Live auctions updating in real time
      </div>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Bid on enthusiast cars
      </h1>
      <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
        Browse live auctions ending soonest first, place your bid, and
        follow the action as it happens.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the home page**

In `src/app/page.tsx`, add the import:

```ts
import { Hero } from "@/components/hero";
```

Replace the existing heading block:

```tsx
<h1 className="text-2xl font-semibold tracking-tight">Live auctions</h1>
<p className="mt-1 text-sm text-muted-foreground">
  Bid on enthusiast cars, ending soonest first.
</p>
```

with:

```tsx
<Hero />
```

- [ ] **Step 3: Verify type safety**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Visual + mobile check**

Run: `npm run dev`, open `http://localhost:3000`. Confirm the hero renders above the grid with the pulse dot, bold heading, and tagline. Resize to ~375px and confirm the heading wraps cleanly and the pill badge doesn't overflow the viewport.

- [ ] **Step 5: Commit**

```bash
git add src/components/hero.tsx src/app/page.tsx
git commit -m "feat: add Hero component to home page"
```

---

### Task 9: `FilterBar` component (disabled placeholder pills)

**Files:**
- Create: `src/components/filter-bar.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces: `FilterBar()` — no props, no filtering logic.
- Consumed by: `HomePage` in `src/app/page.tsx`.

- [ ] **Step 1: Write the component**

```tsx
const FILTERS = ["Year", "Transmission", "Body Style", "Price"] as const;

export function FilterBar() {
  return (
    <div className="flex flex-wrap gap-2 py-2">
      {FILTERS.map((label) => (
        <button
          key={label}
          type="button"
          disabled
          title="Coming soon"
          className="cursor-not-allowed rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground opacity-60"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the home page**

In `src/app/page.tsx`, add the import:

```ts
import { FilterBar } from "@/components/filter-bar";
```

Place it directly below `<Hero />` and above the `{error && (...)}` block:

```tsx
<Hero />
<FilterBar />
```

- [ ] **Step 3: Verify type safety**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Visual + mobile check**

Run: `npm run dev`, open `http://localhost:3000`. Confirm the four pills render below the hero, visibly muted/disabled (not styled like active buttons), and hovering shows a "Coming soon" tooltip and not-allowed cursor. Resize to ~375px and confirm the pills wrap onto multiple lines instead of overflowing horizontally.

- [ ] **Step 5: Commit**

```bash
git add src/components/filter-bar.tsx src/app/page.tsx
git commit -m "feat: add FilterBar placeholder pills to home page"
```

---

### Task 10: `ListingGallery` extraction + detail page wiring

**Files:**
- Create: `src/components/auction/listing-gallery.tsx`
- Modify: `src/app/listings/[id]/page.tsx`

**Interfaces:**
- Consumes: `CarIllustration` (Task 3).
- Produces: `ListingGallery({ photos, alt }: { photos: string[]; alt: string })`.
- Consumed by: `ListingPage` in `src/app/listings/[id]/page.tsx`.

- [ ] **Step 1: Write the component**

```tsx
import Image from "next/image";
import { CarIllustration } from "@/components/car-illustration";

export function ListingGallery({
  photos,
  alt,
}: {
  photos: string[];
  alt: string;
}) {
  const photo = photos[0];

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
      {photo ? (
        <Image src={photo} alt={alt} fill className="object-cover" />
      ) : (
        <CarIllustration className="h-full w-full" />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace the inline photo block**

In `src/app/listings/[id]/page.tsx`, add the import:

```ts
import { ListingGallery } from "@/components/auction/listing-gallery";
```

Replace:

```tsx
<div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
  {listing.photos?.[0] ? (
    <Image
      src={listing.photos[0]}
      alt={`${listing.year} ${listing.make} ${listing.model}`}
      fill
      className="object-cover"
    />
  ) : (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      No photos yet
    </div>
  )}
</div>
```

with:

```tsx
<ListingGallery
  photos={listing.photos ?? []}
  alt={`${listing.year} ${listing.make} ${listing.model}`}
/>
```

Remove the now-unused `Image` import from `src/app/listings/[id]/page.tsx` if nothing else in the file uses it (check with a quick read after this edit).

- [ ] **Step 3: Verify type safety**

Run: `npx tsc --noEmit`
Expected: no errors, and no unused-import lint warning for `Image` in the detail page.

- [ ] **Step 4: Visual check**

Run: `npm run dev`, open a listing detail page (`/listings/<id>`) for a listing with no photos. Confirm the car illustration renders in place of the old "No photos yet" text box, matching the style used on the home page cards.

- [ ] **Step 5: Commit**

```bash
git add src/components/auction/listing-gallery.tsx src/app/listings/[id]/page.tsx
git commit -m "feat: extract ListingGallery with illustration fallback"
```

---

### Task 11: `BidPanel` — orange `PulseDot` for live status

**Files:**
- Modify: `src/components/auction/bid-panel.tsx`

**Interfaces:**
- Consumes: `PulseDot` (Task 2).

- [ ] **Step 1: Add the import**

In `src/components/auction/bid-panel.tsx`, add:

```ts
import { PulseDot } from "@/components/ui/pulse-dot";
```

- [ ] **Step 2: Add the dot next to "Time left"**

Replace:

```tsx
<div className="text-right">
  <div className="text-sm text-muted-foreground">
    {isEnded ? "Auction ended" : "Time left"}
  </div>
  {!isEnded && <Countdown endTime={auction.end_time} />}
</div>
```

with:

```tsx
<div className="text-right">
  <div className="flex items-center justify-end gap-1.5 text-sm text-muted-foreground">
    {!isEnded && <PulseDot className="text-primary" />}
    {isEnded ? "Auction ended" : "Time left"}
  </div>
  {!isEnded && <Countdown endTime={auction.end_time} />}
</div>
```

- [ ] **Step 3: Verify type safety**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Visual + mobile check**

Run: `npm run dev`, open a live listing's detail page. Confirm the orange pulse dot appears next to "Time left" (not a green dot, and matching the hero/card orange). Resize to ~375px and confirm the bid input, "Place bid" button, and this dot/label row don't overflow or overlap.

- [ ] **Step 5: Commit**

```bash
git add src/components/auction/bid-panel.tsx
git commit -m "feat: add orange PulseDot to BidPanel live status"
```

---

## Self-Review Notes

- **Spec coverage:** Theme (Task 1) ✓, CarIllustration (Tasks 3, 6, 10) ✓, PulseDot (Tasks 2, 8, 11) ✓, Footer (Task 7) ✓, Hero (Task 8) ✓, FilterBar (Task 9) ✓, ListingCard accent bar + location (Tasks 4–6) ✓, ListingGallery (Task 10) ✓, BidPanel color consistency (Task 11) ✓, schema/form/query for location (Task 5) ✓, responsive checks folded into each visible-UI task's verification step ✓.
- **No test framework** exists in this repo — all verification steps use `tsc --noEmit` + manual dev-server checks instead of a unit-test runner, per Global Constraints; this is a deliberate adaptation, not an omission.
- **Type consistency:** `ListingCardData.location` (Task 5) matches the field read in Task 6; `getUrgencyLevel`'s return type (`"plenty" | "soon" | "urgent" | "ended"`) matches the object-literal keys used in Task 6's `urgencyBarClass` lookup; `PulseDot`'s `className`-driven `text-*` color convention is used consistently in Tasks 8, 6 (implicitly not needed there since Task 6 uses raw bg classes for the bar, not PulseDot), and 11.
