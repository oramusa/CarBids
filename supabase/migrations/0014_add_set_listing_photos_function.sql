-- Car Bids App — let sellers reorder/swap their own listing's photos even
-- after it's posted (live or ended), so changing the cover photo doesn't
-- require the full edit flow, which is locked once bidding starts.
--
-- This is a security-definer function rather than a broader RLS update
-- policy so the write is narrowly scoped to the photos column only — a
-- seller calling this can never touch make/model/status/etc. on a listing
-- that's no longer editable, regardless of what a crafted request sends.
-- Mirrors the place_bid()/create_invoice_on_auction_end() pattern already
-- used elsewhere in this schema for the same "narrow, safe write path"
-- reason.
create or replace function set_listing_photos(p_listing_id uuid, p_photos text[])
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update listings
  set photos = p_photos
  where id = p_listing_id
    and seller_id = auth.uid();

  if not found then
    raise exception 'Listing not found or not owned by the current user';
  end if;
end;
$$;

grant execute on function set_listing_photos(uuid, text[]) to authenticated;
