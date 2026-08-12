-- Car Bids App — add is_featured flag to listings for the Featured Auctions nav view
alter table listings add column if not exists is_featured boolean not null default false;
