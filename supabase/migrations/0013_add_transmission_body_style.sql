-- Car Bids App — transmission and body style, seller-entered, used to power
-- the home page's Transmission/Body Style filters.
alter table listings add column transmission text;
alter table listings add column body_style text;
