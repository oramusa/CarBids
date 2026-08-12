import { createClient } from "@/lib/supabase/server";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { Hero } from "@/components/hero";
import { buildListingsQuery } from "@/lib/listings";

export default async function PastResultsPage({
  searchParams,
}: PageProps<"/past">) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const { data: listings, error } = await buildListingsQuery(supabase, {
    view: "past",
    q: typeof q === "string" ? q : undefined,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Hero />
      <h2 className="mt-6 text-xl font-bold tracking-tight">Past Results</h2>

      {error && (
        <p className="mt-8 text-sm text-destructive">
          Couldn&apos;t load listings: {error.message}.
        </p>
      )}

      {!error && (!listings || listings.length === 0) && (
        <div className="mt-8 rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No past auctions yet.
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
