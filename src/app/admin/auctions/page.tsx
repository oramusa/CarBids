import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { forceEndAuction } from "@/app/admin/auctions/actions";

export default async function AdminAuctionsPage() {
  const session = await getCurrentUser();
  if (!session?.profile?.is_admin) redirect("/");

  const supabase = await createClient();
  const { data: auctions, error } = await supabase
    .from("auctions")
    .select(
      `id, end_time, current_high_bid, status,
       listing:listings (id, make, model, year)`
    )
    .order("status", { ascending: true })
    .order("end_time", { ascending: true });

  const { data: bidRows } = await supabase.from("bids").select("auction_id");
  const bidCounts = new Map<string, number>();
  for (const row of bidRows ?? []) {
    bidCounts.set(row.auction_id, (bidCounts.get(row.auction_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">All auctions</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {auctions?.length ?? 0} total, platform-wide.
      </p>

      {error && (
        <p className="mt-8 text-sm text-destructive">
          Couldn&apos;t load auctions: {error.message}
        </p>
      )}

      <ul className="mt-6 flex flex-col gap-2">
        {auctions?.map((auction) => {
          const listing = Array.isArray(auction.listing)
            ? auction.listing[0]
            : auction.listing;
          return (
            <li
              key={auction.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div>
                {listing && (
                  <Link
                    href={`/listings/${listing.id}`}
                    className="font-medium hover:underline"
                  >
                    {listing.year} {listing.make} {listing.model}
                  </Link>
                )}
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="capitalize">
                    {auction.status.replace("_", " ")}
                  </Badge>
                  <span>{formatCurrency(auction.current_high_bid)}</span>
                  <span>{bidCounts.get(auction.id) ?? 0} bids</span>
                  <span>ends {new Date(auction.end_time).toLocaleString()}</span>
                </div>
              </div>
              {auction.status === "live" && (
                <form action={forceEndAuction.bind(null, auction.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    Force end
                  </Button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
