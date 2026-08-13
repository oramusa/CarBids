import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";

async function getStats() {
  const supabase = await createClient();

  const [
    { count: completedCount },
    { count: soldCount },
    { data: soldAuctions },
    { count: memberCount },
  ] = await Promise.all([
    supabase
      .from("auctions")
      .select("id", { count: "exact", head: true })
      .in("status", ["ended", "sold"]),
    supabase
      .from("auctions")
      .select("id", { count: "exact", head: true })
      .in("status", ["ended", "sold"])
      .not("current_high_bidder_id", "is", null),
    supabase
      .from("auctions")
      .select("current_high_bid")
      .in("status", ["ended", "sold"])
      .not("current_high_bidder_id", "is", null),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  const valueSold = (soldAuctions ?? []).reduce(
    (sum, a) => sum + (a.current_high_bid ?? 0),
    0
  );
  const sellThroughRate =
    completedCount && completedCount > 0
      ? Math.round(((soldCount ?? 0) / completedCount) * 100)
      : null;

  return {
    completedCount: completedCount ?? 0,
    sellThroughRate,
    valueSold,
    memberCount: memberCount ?? 0,
  };
}

async function getFeaturedReview() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("rating, comment, buyer:profiles!reviews_buyer_id_fkey (username)")
    .order("rating", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const buyer = Array.isArray(data.buyer) ? data.buyer[0] : data.buyer;
  return { rating: data.rating, comment: data.comment, username: buyer?.username };
}

export async function Footer() {
  const year = new Date().getFullYear();
  const [stats, review] = await Promise.all([getStats(), getFeaturedReview()]);

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl justify-center px-4 py-8">
        <Link
          href="/past"
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          View auction results
        </Link>
      </div>

      {(stats.completedCount > 0 || review) && (
        <div className="border-t border-border">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-10 sm:grid-cols-2">
            {stats.completedCount > 0 && (
              <div>
                <h2 className="text-base font-bold tracking-tight">
                  Why Car Bids?
                </h2>
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5">
                  <div>
                    <dt className="text-2xl font-bold tracking-tight">
                      {stats.completedCount}
                    </dt>
                    <dd className="text-xs text-muted-foreground">
                      Auctions completed
                    </dd>
                  </div>
                  {stats.sellThroughRate != null && (
                    <div>
                      <dt className="text-2xl font-bold tracking-tight">
                        {stats.sellThroughRate}%
                      </dt>
                      <dd className="text-xs text-muted-foreground">
                        Sell-through rate
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-2xl font-bold tracking-tight">
                      {formatCurrency(stats.valueSold)}
                    </dt>
                    <dd className="text-xs text-muted-foreground">
                      Value of cars sold
                    </dd>
                  </div>
                  <div>
                    <dt className="text-2xl font-bold tracking-tight">
                      {stats.memberCount}
                    </dt>
                    <dd className="text-xs text-muted-foreground">
                      Registered members
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {review && (
              <div>
                <h2 className="text-base font-bold tracking-tight">
                  Our buyers love us!
                </h2>
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <span className="tracking-tight text-primary">
                    {"★".repeat(review.rating)}
                  </span>
                  <span className="font-semibold">
                    {review.username ?? "buyer"}
                  </span>
                </div>
                {review.comment && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    &ldquo;{review.comment}&rdquo;
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:justify-between">
          <div>
            <div className="text-lg font-bold tracking-tight">Car Bids</div>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Bid on enthusiast cars in live online auctions.
            </p>
          </div>

          <div className="flex gap-12">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Explore
              </div>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/" className="hover:text-foreground">
                    Auctions
                  </Link>
                </li>
                <li>
                  <Link href="/featured" className="hover:text-foreground">
                    Featured Auctions
                  </Link>
                </li>
                <li>
                  <Link href="/past" className="hover:text-foreground">
                    Past Results
                  </Link>
                </li>
                <li>
                  <Link href="/community" className="hover:text-foreground">
                    Community
                  </Link>
                </li>
                <li>
                  <Link href="/events" className="hover:text-foreground">
                    Events
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-foreground">
                    About Us
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Sellers
              </div>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/sell" className="hover:text-foreground">
                    Sell a Car
                  </Link>
                </li>
                <li>
                  <Link href="/sell/dashboard" className="hover:text-foreground">
                    Seller Dashboard
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {year} Car Bids</span>
          <div className="flex gap-4">
            <span className="cursor-default">Terms of Use</span>
            <span className="cursor-default">Privacy Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
