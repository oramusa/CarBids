-- Car Bids App — let admins (profiles.is_admin) see/update any listing and
-- create/update auctions, so listing approval + scheduling can happen
-- through the app instead of the SQL Editor/Table Editor.
create policy "admins can read all listings" on listings for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin));

create policy "admins can update any listing" on listings for update
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin));

create policy "admins can insert auctions" on auctions for insert
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin));

create policy "admins can update auctions" on auctions for update
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin));
