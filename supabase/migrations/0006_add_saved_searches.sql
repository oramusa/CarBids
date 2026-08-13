-- Car Bids App — saved searches: a buyer can save a search term and revisit
-- it later from their dashboard.
create table saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  query text not null check (char_length(query) between 1 and 100),
  created_at timestamptz not null default now()
);

create index saved_searches_user_idx on saved_searches (user_id, created_at desc);

alter table saved_searches enable row level security;

create policy "users can read their own saved searches" on saved_searches for select using (auth.uid() = user_id);
create policy "users can create their own saved searches" on saved_searches for insert with check (auth.uid() = user_id);
create policy "users can delete their own saved searches" on saved_searches for delete using (auth.uid() = user_id);
