-- Car Bids App — add a "draft" listing status and let sellers edit their
-- own draft or pending_review listings (previously only pending_review).
alter type listing_status add value if not exists 'draft';

drop policy if exists "sellers can update their own pending listings" on listings;
create policy "sellers can update their own draft or pending listings" on listings for update
  using (auth.uid() = seller_id and status in ('draft', 'pending_review'));
