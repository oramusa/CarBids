import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { Hero } from "@/components/hero";
import { FilterBar } from "@/components/filter-bar";
import { buildListingsQuery } from "@/lib/listings";
import { saveSearch } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

const YEAR_RANGES: Record<string, { yearMin?: number; yearMax?: number }> = {
  "2020s": { yearMin: 2020 },
  "2010s": { yearMin: 2010, yearMax: 2019 },
  "2000s": { yearMin: 2000, yearMax: 2009 },
  pre2000: { yearMax: 1999 },
};

const PRICE_RANGES: Record<string, { priceMin?: number; priceMax?: number }> = {
  under10k: { priceMax: 10000 },
  "10k-25k": { priceMin: 10000, priceMax: 25000 },
  "25k-50k": { priceMin: 25000, priceMax: 50000 },
  "50k-100k": { priceMin: 50000, priceMax: 100000 },
  "100kplus": { priceMin: 100000 },
};

export default async function HomePage({
  searchParams,
}: PageProps<"/">) {
  const { q, year, transmission, body, price } = await searchParams;
  const supabase = await createClient();
  const session = await getCurrentUser();

  const yearRange =
    typeof year === "string" ? YEAR_RANGES[year] : undefined;
  const priceRange =
    typeof price === "string" ? PRICE_RANGES[price] : undefined;

  const { data: listings, error } = await buildListingsQuery(supabase, {
    view: "live",
    q: typeof q === "string" ? q : undefined,
    yearMin: yearRange?.yearMin,
    yearMax: yearRange?.yearMax,
    priceMin: priceRange?.priceMin,
    priceMax: priceRange?.priceMax,
    transmission: typeof transmission === "string" ? transmission : undefined,
    bodyStyle: typeof body === "string" ? body : undefined,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Hero />
      <Suspense fallback={null}>
        <FilterBar />
      </Suspense>

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
              : year || transmission || body || price
                ? "No live auctions match these filters."
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
