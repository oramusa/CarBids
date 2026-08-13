-- Car Bids App — Revenue Model v1: buyer's premium (4.5%, capped at $500),
-- modeled with an invoices table but no real payment processing yet.
create function compute_buyer_premium(winning_bid numeric)
returns numeric
language sql
immutable
as $$
  select round(least(winning_bid * 0.045, 500), 2);
$$;

create table invoices (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null unique references auctions (id) on delete cascade,
  buyer_id uuid not null references profiles (id),
  winning_bid numeric(12, 2) not null,
  buyer_premium numeric(12, 2) not null,
  total_due numeric(12, 2) not null,
  status text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  created_at timestamptz not null default now()
);

alter table invoices enable row level security;

create policy "buyers can read their own invoices" on invoices for select using (auth.uid() = buyer_id);
create policy "admins can read all invoices" on invoices for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin));
create policy "admins can update invoices" on invoices for update
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin));

-- Auto-creates an invoice the moment an auction transitions into a finished
-- state with a winner (mirrors place_bid()'s pattern of centralizing derived
-- state in a security-definer function instead of application code, so this
-- fires no matter how the auction gets ended — admin force-end today, a
-- future cron/scheduled job later).
create function create_invoice_on_auction_end()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status in ('ended', 'sold')
     and old.status is distinct from new.status
     and new.current_high_bidder_id is not null
     and (new.reserve_price is null or new.reserve_met) then
    insert into invoices (auction_id, buyer_id, winning_bid, buyer_premium, total_due)
    values (
      new.id,
      new.current_high_bidder_id,
      new.current_high_bid,
      compute_buyer_premium(new.current_high_bid),
      new.current_high_bid + compute_buyer_premium(new.current_high_bid)
    )
    on conflict (auction_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auction_ended
  after update on auctions
  for each row execute procedure create_invoice_on_auction_end();
