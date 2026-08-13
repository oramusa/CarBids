import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { Hero } from "@/components/hero";
import { FilterBar } from "@/components/filter-bar";
import { buildListingsQuery } from "@/lib/listings";
import { saveSearch } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

export default async function HomePage({
  searchParams,
}: PageProps<"/">) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const session = await getCurrentUser();

  const { data: listings, error } = await buildListingsQuery(supabase, {
    view: "live",
    q: typeof q === "string" ? q : undefined,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Hero />
      <FilterBar />

      {typeof q === "string" && q && session && (
        <form action={saveSearch.bind(null, q)} className="mt-4">
          <Button type="submit" variant="outline" size="sm">
            Save this search
          </Button>
        </form>
      )}

      {error && (
        <p className="mt-8 text-sm text-destructive">
          Couldn&apos;t load listings: {error.message}. Have you set your
          Supabase env vars and run the migration yet? See README.md.
        </p>
      )}

      {!error && (!listings || listings.length === 0) && (
        <div className="mt-16 rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {q
              ? `No live auctions match "${q}".`
              : "No live auctions right now. Once you've run the migration and approved a listing, it will show up here."}
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
