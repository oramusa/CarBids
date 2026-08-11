import { createClient } from "@/lib/supabase/server";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { Hero } from "@/components/hero";
import { FilterBar } from "@/components/filter-bar";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: listings, error } = await supabase
    .from("listings")
    .select(
      `id, make, model, year, photos, location,
       auction:auctions!inner (id, end_time, current_high_bid, reserve_price, reserve_met, status)`
    )
    .eq("auctions.status", "live")
    .order("end_time", { referencedTable: "auctions", ascending: true });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Hero />
      <FilterBar />

      {error && (
        <p className="mt-8 text-sm text-destructive">
          Couldn&apos;t load listings: {error.message}. Have you set your
          Supabase env vars and run the migration yet? See README.md.
        </p>
      )}

      {!error && (!listings || listings.length === 0) && (
        <div className="mt-16 rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No live auctions right now. Once you&apos;ve run the migration
            and approved a listing, it will show up here.
          </p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(listings as unknown as (ListingCardData & { auction: ListingCardData["auction"] })[] | null)?.map(
          (listing) => (
            <ListingCard key={listing.id} listing={listing} />
          )
        )}
      </div>
    </div>
  );
}
