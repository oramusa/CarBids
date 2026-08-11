-- Car Bids App — add optional location to listings
alter table listings add column if not exists location text;
