# Car Bids

A Cars & Bids-style car auction app: sellers list cars, buyers place live competitive bids, auctions soft-close (anti-sniping) like the real thing. Built with Next.js 16 (App Router) + Supabase (Postgres, Auth, Realtime, Storage).

This is a **Phase 1 MVP scaffold** — see "What's built vs. what's next" below.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), create a free project.
2. In **Project Settings → API**, copy the Project URL and the `anon public` key.
3. Copy `.env.local.example` to `.env.local` and fill in those two values (leave `SUPABASE_SERVICE_ROLE_KEY` for later — it's not used yet).

## 2. Run the database migration

Open the Supabase SQL Editor for your project and run the contents of `supabase/migrations/0001_init.sql`. This creates:

- Tables: `profiles`, `listings`, `auctions`, `bids`, `comments`, `watches`, `notifications`
- The `place_bid()` Postgres function — the *only* way bids get written. It runs inside a locked transaction so two simultaneous bids on the same auction can't race each other, validates the bid amount against the increment table, and extends the auction by 2 minutes if a bid lands in the final 2 minutes (anti-sniping soft close).
- Row Level Security policies for every table
- A public `listing-photos` storage bucket

If you'd rather use the Supabase CLI: `supabase link` then `supabase db push`.

## 3. Install and run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

## 4. Testing the bidding loop end-to-end

Listing approval and auction scheduling don't have an admin UI yet (see below), so to test bidding:

1. Sign in (magic link email) and submit a listing at `/sell`.
2. In the Supabase Table Editor, manually set that listing's `status` to `live`, then insert a row into `auctions` referencing it with a `start_time` in the past and an `end_time` in the future.
3. Visit `/listings/<id>` — you should see the listing, be able to place bids (from a **different** signed-in account than the seller — the DB function blocks sellers from bidding on their own listing), and watch the bid feed and countdown update live via Supabase Realtime.

## What's built (Phase 1)

- Browse live auctions (`/`)
- Listing detail page with live bid feed, countdown, and a bid form wired to Supabase Realtime (`/listings/[id]`)
- `place_bid()` — concurrency-safe bid placement with tiered increments and anti-sniping soft close
- Public Q&A/comments thread per listing, live-updating
- Email magic-link auth (`/login`)
- Seller listing submission form with photo upload (`/sell`)
- Full RLS policy set

## What's next (Phase 2+, per the product plan)

- Admin approval queue for listings + auction scheduling UI (right now this is a manual DB step — see above)
- Identity verification gate before a user's first bid (Stripe Identity or Persona)
- Watch list + outbid/ending-soon email notifications (the `notifications` table and `watches` table already exist; `place_bid()` already writes outbid notification rows — just needs a UI + an email sender wired to it)
- Search/filter/browse by make, model, price, ending-soonest
- Seller reputation, fee collection (Stripe Connect) once you're ready to monetize

## Tech notes

- **Next.js 16**: this project uses the current App Router conventions — async `params`/`cookies()`, the renamed `proxy.ts` (was `middleware.ts`), and the `PageProps`/`LayoutProps` type helpers. If you (or an AI agent) are used to older Next.js patterns, skim `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` before making changes — quite a bit changed from Next 14/15.
- **shadcn/ui components were hand-written**, not pulled via the `shadcn` CLI, because this sandbox's network allowlist couldn't reach `ui.shadcn.com` (npm itself worked fine). They're already in `src/components/ui/` and behave identically — if you have normal network access, `npx shadcn@latest add <component>` will work going forward for any component not already included (currently: button, card, input, label, badge, separator).
- **Fonts**: uses the system font stack instead of `next/font/google`, since this sandbox couldn't reach `fonts.googleapis.com` either. Swap in a Google Font any time — it'll work fine wherever you actually deploy.
- **Bid concurrency**: don't be tempted to move bid validation into the frontend or an API route "for simplicity" — the whole point of `place_bid()` living in Postgres with a row lock is that it's the single source of truth even under concurrent requests. If you add more bid-related logic later, extend that function rather than duplicating checks elsewhere.
