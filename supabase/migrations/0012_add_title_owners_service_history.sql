-- Car Bids App — more seller-reported vehicle details, same trust model as
-- accident_history/condition (self-reported, not independently verified).
alter table listings add column if not exists title_status text
  not null default 'clean' check (title_status in ('clean', 'salvage', 'rebuilt', 'lemon', 'other'));
alter table listings add column if not exists number_of_owners int check (number_of_owners >= 1);
alter table listings add column if not exists service_history text;
