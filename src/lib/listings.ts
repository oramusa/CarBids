import type { SupabaseClient } from "@supabase/supabase-js";

type ListingsFilter = {
  /** "live" shows currently-live auctions; "past" shows ended/sold/no_sale ones. */
  view: "live" | "past";
  featuredOnly?: boolean;
  /** Free-text search against make/model. */
  q?: string;
};

const LIVE_STATUSES = ["live"];
const PAST_STATUSES = ["ended", "sold", "no_sale"];

/**
 * Builds the shared listings+auction query used by the live, featured, and
 * past-results pages, so filtering logic lives in one place.
 */
export function buildListingsQuery(
  supabase: SupabaseClient,
  { view, featuredOnly, q }: ListingsFilter
) {
  let query = supabase
    .from("listings")
    .select(
      `id, make, model, year, photos, location,
       auction:auctions!inner (id, end_time, current_high_bid, reserve_price, reserve_met, status)`
    )
    .in("auctions.status", view === "live" ? LIVE_STATUSES : PAST_STATUSES)
    .order("end_time", {
      referencedTable: "auctions",
      ascending: view === "live",
    });

  if (featuredOnly) {
    query = query.eq("is_featured", true);
  }

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    query = query.or(`make.ilike.${term},model.ilike.${term}`);
  }

  return query;
}
