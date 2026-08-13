-- Car Bids App — let admins update any profile (verify sellers, grant/revoke
-- admin), so this doesn't require the Table Editor either.
create policy "admins can update any profile" on profiles for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
