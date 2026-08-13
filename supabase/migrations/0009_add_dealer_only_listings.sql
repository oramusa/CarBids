-- Car Bids App — dealer-only auctions: a listing marked dealer_only is
-- only visible to verified buyers (reusing profiles.is_verified, since
-- there's no separate dealer role in this schema).
alter table listings add column if not exists dealer_only boolean not null default false;

drop policy if exists "public listings are readable" on listings;
create policy "public listings are readable" on listings for select
  using (
    status in ('approved', 'live', 'ended')
    and (
      not dealer_only
      or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_verified)
    )
  );
