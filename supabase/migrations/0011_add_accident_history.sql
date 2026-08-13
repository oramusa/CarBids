-- Car Bids App — seller-reported accident history (self-reported, same
-- trust model as the existing `condition` field — not independently
-- verified).
alter table listings add column if not exists accident_severity text
  not null default 'none' check (accident_severity in ('none', 'minor', 'major'));
alter table listings add column if not exists accident_details text;
