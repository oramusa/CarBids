-- Car Bids App — seller reputation: one review per completed auction, left
-- by the winning bidder only, visible to everyone.
create table reviews (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null unique references auctions (id) on delete cascade,
  seller_id uuid not null references profiles (id) on delete cascade,
  buyer_id uuid not null references profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index reviews_seller_idx on reviews (seller_id);

alter table reviews enable row level security;

create policy "reviews are publicly readable" on reviews for select using (true);

-- Only the auction's winning bidder can review it, and only once it's
-- actually over — mirrors place_bid()'s security-definer-free approach by
-- putting the eligibility check directly in the RLS policy instead of a
-- function, since this is a plain insert with no derived state to compute.
create policy "winning bidder can review after auction ends" on reviews for insert
  with check (
    auth.uid() = buyer_id
    and exists (
      select 1 from auctions
      where auctions.id = auction_id
        and auctions.current_high_bidder_id = auth.uid()
        and auctions.status in ('ended', 'sold')
    )
  );
