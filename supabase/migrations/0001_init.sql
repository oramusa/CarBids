-- Car Bids App — initial schema
-- Run this against your Supabase project (SQL Editor, or `supabase db push`
-- if you've linked the CLI to your project).

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- Enums
-- ============================================================================
create type listing_status as enum ('pending_review', 'approved', 'rejected', 'live', 'ended');
create type auction_status as enum ('scheduled', 'live', 'ended', 'sold', 'no_sale');
create type notification_type as enum ('outbid', 'ending_soon', 'auction_won', 'auction_sold', 'comment_reply', 'listing_approved', 'listing_rejected');

-- ============================================================================
-- profiles — one row per auth.users row
-- ============================================================================
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  avatar_url text,
  is_verified boolean not null default false, -- identity verification (e.g. Stripe Identity) gate for bidding
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================================
-- listings
-- ============================================================================
create table listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles (id) on delete cascade,
  make text not null,
  model text not null,
  year int not null check (year between 1900 and 2100),
  mileage int not null check (mileage >= 0),
  vin text,
  condition text,
  description text not null,
  photos text[] not null default '{}',
  status listing_status not null default 'pending_review',
  rejection_reason text,
  created_at timestamptz not null default now()
);

create index listings_status_idx on listings (status);
create index listings_seller_idx on listings (seller_id);

-- ============================================================================
-- auctions — one-to-one with an approved listing once scheduled
-- ============================================================================
create table auctions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references listings (id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  reserve_price numeric(12, 2), -- null = no-reserve auction
  reserve_met boolean not null default false,
  current_high_bid numeric(12, 2),
  current_high_bidder_id uuid references profiles (id),
  status auction_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index auctions_status_idx on auctions (status);
create index auctions_end_time_idx on auctions (end_time);

-- ============================================================================
-- bids — append-only; rows are only ever created via place_bid() below
-- ============================================================================
create table bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions (id) on delete cascade,
  bidder_id uuid not null references profiles (id),
  amount numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create index bids_auction_idx on bids (auction_id, created_at desc);

-- ============================================================================
-- comments — public Q&A thread per listing
-- ============================================================================
create table comments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  parent_comment_id uuid references comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index comments_listing_idx on comments (listing_id, created_at);

-- ============================================================================
-- watches — a user's saved/followed auctions
-- ============================================================================
create table watches (
  user_id uuid not null references profiles (id) on delete cascade,
  auction_id uuid not null references auctions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, auction_id)
);

-- ============================================================================
-- notifications
-- ============================================================================
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  type notification_type not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx on notifications (user_id) where read_at is null;

-- ============================================================================
-- Bid increment schedule (mirrors the tiered increments common to this
-- auction category). Adjust freely.
-- ============================================================================
create function get_min_increment(current_price numeric)
returns numeric
language sql
immutable
as $$
  select case
    when current_price is null or current_price < 1000 then 50
    when current_price < 10000 then 100
    when current_price < 25000 then 250
    when current_price < 50000 then 500
    when current_price < 100000 then 1000
    else 2500
  end;
$$;

-- ============================================================================
-- place_bid — the one and only way bids get inserted.
--
-- SECURITY DEFINER so it can bypass the (deliberately bid-insert-less) RLS
-- policy on `bids`, but every authorization check the RLS policy would have
-- done is re-implemented explicitly below. All validation + the write happen
-- inside one transaction with a row lock on the auction, so two simultaneous
-- bids on the same auction are serialized rather than racing.
-- ============================================================================
create function place_bid(p_auction_id uuid, p_amount numeric)
returns auctions
language plpgsql
security definer set search_path = public
as $$
declare
  v_auction auctions%rowtype;
  v_seller_id uuid;
  v_min_next_bid numeric;
  v_bidder_id uuid := auth.uid();
begin
  if v_bidder_id is null then
    raise exception 'Must be signed in to bid';
  end if;

  -- Lock the auction row so concurrent bids on the same auction are
  -- processed one at a time, not interleaved.
  select * into v_auction from auctions where id = p_auction_id for update;

  if not found then
    raise exception 'Auction not found';
  end if;

  if v_auction.status <> 'live' or now() < v_auction.start_time or now() > v_auction.end_time then
    raise exception 'Auction is not currently accepting bids';
  end if;

  select seller_id into v_seller_id from listings where id = v_auction.listing_id;
  if v_seller_id = v_bidder_id then
    raise exception 'Sellers cannot bid on their own listing';
  end if;

  v_min_next_bid := coalesce(v_auction.current_high_bid, 0) + get_min_increment(v_auction.current_high_bid);
  if v_auction.current_high_bid is null then
    -- First bid on the auction just needs to be a positive amount that
    -- respects the increment table's floor.
    v_min_next_bid := get_min_increment(null);
  end if;

  if p_amount < v_min_next_bid then
    raise exception 'Bid must be at least %', v_min_next_bid;
  end if;

  insert into bids (auction_id, bidder_id, amount)
  values (p_auction_id, v_bidder_id, p_amount);

  update auctions
  set
    current_high_bid = p_amount,
    current_high_bidder_id = v_bidder_id,
    reserve_met = (reserve_price is null or p_amount >= reserve_price),
    -- Anti-sniping soft close: a bid in the final 2 minutes extends the
    -- auction by 2 more minutes from now, repeating until bidding stops.
    end_time = case
      when v_auction.end_time - now() < interval '2 minutes'
        then now() + interval '2 minutes'
      else v_auction.end_time
    end
  where id = p_auction_id
  returning * into v_auction;

  -- Notify the previous high bidder that they've been outbid.
  if v_auction.current_high_bidder_id is not null and v_auction.current_high_bidder_id <> v_bidder_id then
    insert into notifications (user_id, type, payload)
    select bidder_id, 'outbid', jsonb_build_object('auction_id', p_auction_id, 'amount', p_amount)
    from bids
    where auction_id = p_auction_id and bidder_id <> v_bidder_id
    order by created_at desc
    limit 1;
  end if;

  return v_auction;
end;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table profiles enable row level security;
alter table listings enable row level security;
alter table auctions enable row level security;
alter table bids enable row level security;
alter table comments enable row level security;
alter table watches enable row level security;
alter table notifications enable row level security;

-- profiles: readable by everyone, editable only by the owner
create policy "profiles are publicly readable" on profiles for select using (true);
create policy "users can update their own profile" on profiles for update using (auth.uid() = id);

-- listings: public listings are readable by everyone; sellers can see + manage their own regardless of status
create policy "public listings are readable" on listings for select using (status in ('approved', 'live', 'ended'));
create policy "sellers can read their own listings" on listings for select using (auth.uid() = seller_id);
create policy "sellers can create listings" on listings for insert with check (auth.uid() = seller_id);
create policy "sellers can update their own pending listings" on listings for update
  using (auth.uid() = seller_id and status = 'pending_review');

-- auctions: public read only; all writes happen via place_bid() / admin tooling (service role)
create policy "auctions are publicly readable" on auctions for select using (true);

-- bids: public read; NO insert policy on purpose — inserts only happen inside
-- the SECURITY DEFINER place_bid() function above.
create policy "bids are publicly readable" on bids for select using (true);

-- comments: public read, authenticated users can post as themselves
create policy "comments are publicly readable" on comments for select using (true);
create policy "users can post comments as themselves" on comments for insert with check (auth.uid() = user_id);
create policy "users can delete their own comments" on comments for delete using (auth.uid() = user_id);

-- watches: users manage their own watch list only
create policy "users can read their own watches" on watches for select using (auth.uid() = user_id);
create policy "users can add their own watches" on watches for insert with check (auth.uid() = user_id);
create policy "users can remove their own watches" on watches for delete using (auth.uid() = user_id);

-- notifications: users can only see and update their own
create policy "users can read their own notifications" on notifications for select using (auth.uid() = user_id);
create policy "users can mark their own notifications read" on notifications for update using (auth.uid() = user_id);

-- ============================================================================
-- Realtime — expose bids and auctions for live subscriptions
-- ============================================================================
alter publication supabase_realtime add table bids;
alter publication supabase_realtime add table auctions;
alter publication supabase_realtime add table comments;

-- ============================================================================
-- Storage — public bucket for listing photos
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

create policy "listing photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

create policy "authenticated users can upload listing photos"
  on storage.objects for insert
  with check (bucket_id = 'listing-photos' and auth.role() = 'authenticated');
