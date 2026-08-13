import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { relistListing, submitDraftForReview } from "@/app/sell/dashboard/actions";
import { SellerReputation } from "@/components/seller-reputation";

type DashboardListing = {
  id: string;
  make: string;
  model: string;
  year: number;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  auction:
    | {
        id: string;
        end_time: string;
        current_high_bid: number | null;
        status: string;
      }
    | { id: string; end_time: string; current_high_bid: number | null; status: string }[]
    | null;
};

const TABS = [
  { key: "drafts", label: "Drafts" },
  { key: "active", label: "Active" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function normalizeAuction(listing: DashboardListing) {
  return Array.isArray(listing.auction) ? listing.auction[0] ?? null : listing.auction;
}

function categorize(listing: DashboardListing): TabKey | null {
  const auction = normalizeAuction(listing);
  if (listing.status === "draft") return "drafts";
  if (listing.status === "rejected") return "rejected";
  if (auction?.status === "live") return "active";
  if (auction && ["ended", "sold", "no_sale"].includes(auction.status)) {
    return "completed";
  }
  // pending_review, approved, or scheduled-but-not-live all read as "upcoming"
  return "upcoming";
}

export default async function SellerDashboardPage(
  props: PageProps<"/sell/dashboard">
) {
  const { tab } = await props.searchParams;
  const activeTab: TabKey = TABS.some((t) => t.key === tab)
    ? (tab as TabKey)
    : "active";

  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const [{ data: listings, error }, { data: ownReviews }] = await Promise.all([
    supabase
      .from("listings")
      .select(
        `id, make, model, year, status, rejection_reason, created_at,
         auction:auctions (id, end_time, current_high_bid, status)`
      )
      .eq("seller_id", session.user.id)
      .order("created_at", { ascending: false }),
    supabase.from("reviews").select("rating").eq("seller_id", session.user.id),
  ]);

  const reviewCount = ownReviews?.length ?? 0;
  const averageRating =
    reviewCount > 0
      ? ownReviews!.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : null;

  const grouped: Record<TabKey, DashboardListing[]> = {
    drafts: [],
    active: [],
    upcoming: [],
    completed: [],
    rejected: [],
  };

  for (const listing of (listings as DashboardListing[] | null) ?? []) {
    const key = categorize(listing);
    if (key) grouped[key].push(listing);
  }

  const shown = grouped[activeTab];

  // Bid/bidder/watcher counts for the auctions on the currently-shown tab.
  // Aggregated client-side from raw rows rather than a DB view, since a
  // seller's own auction volume is small and this keeps the schema untouched.
  const auctionIds = shown
    .map((listing) => normalizeAuction(listing)?.id)
    .filter((id): id is string => !!id);

  const stats = new Map<
    string,
    { bidCount: number; bidderCount: number; watcherCount: number }
  >();

  if (auctionIds.length > 0) {
    const [{ data: bids }, { data: watches }] = await Promise.all([
      supabase
        .from("bids")
        .select("auction_id, bidder_id")
        .in("auction_id", auctionIds),
      supabase
        .from("watches")
        .select("auction_id")
        .in("auction_id", auctionIds),
    ]);

    for (const id of auctionIds) {
      const auctionBids = bids?.filter((b) => b.auction_id === id) ?? [];
      stats.set(id, {
        bidCount: auctionBids.length,
        bidderCount: new Set(auctionBids.map((b) => b.bidder_id)).size,
        watcherCount:
          watches?.filter((w) => w.auction_id === id).length ?? 0,
      });
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight">
              {session.profile?.username ?? "My listings"}
            </h1>
            {session.profile?.is_verified && (
              <span title="Verified seller">
                <BadgeCheck className="size-5 text-primary" />
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Manage the cars you&apos;ve listed for auction.
            </p>
            <SellerReputation
              averageRating={averageRating}
              reviewCount={reviewCount}
            />
          </div>
        </div>
        <div className="flex gap-2">
          {session.profile?.username && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/sellers/${session.profile.username}`}>
                View public profile
              </Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link href="/sell">List another car</Link>
          </Button>
        </div>
      </div>

      <div className="mt-8 flex gap-2 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/sell/dashboard?tab=${t.key}`}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              activeTab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-muted-foreground">
              {grouped[t.key].length}
            </span>
          </Link>
        ))}
      </div>

      {error && (
        <p className="mt-8 text-sm text-destructive">
          Couldn&apos;t load your listings: {error.message}
        </p>
      )}

      {!error && shown.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing here yet.
          </p>
        </div>
      )}

      <ul className="mt-6 flex flex-col gap-3">
        {shown.map((listing) => {
          const auction = normalizeAuction(listing);
          const auctionStats = auction ? stats.get(auction.id) : undefined;
          return (
            <li
              key={listing.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div>
                <Link
                  href={`/listings/${listing.id}`}
                  className="font-medium hover:underline"
                >
                  {listing.year} {listing.make} {listing.model}
                </Link>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="capitalize">
                    {listing.status.replace("_", " ")}
                  </Badge>
                  {auction?.current_high_bid != null && (
                    <span>{formatCurrency(auction.current_high_bid)}</span>
                  )}
                </div>
                {auctionStats && (
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {auctionStats.bidCount}{" "}
                      {auctionStats.bidCount === 1 ? "bid" : "bids"}
                    </span>
                    <span>
                      {auctionStats.bidderCount}{" "}
                      {auctionStats.bidderCount === 1 ? "bidder" : "bidders"}
                    </span>
                    <span>
                      {auctionStats.watcherCount}{" "}
                      {auctionStats.watcherCount === 1
                        ? "watcher"
                        : "watchers"}
                    </span>
                  </div>
                )}
                {listing.status === "rejected" && listing.rejection_reason && (
                  <p className="mt-1 text-xs text-destructive">
                    {listing.rejection_reason}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/sell/${listing.id}/photos`}>Photos</Link>
                </Button>
                {(listing.status === "pending_review" ||
                  listing.status === "draft") && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/sell/${listing.id}/edit`}>Edit</Link>
                  </Button>
                )}
                {listing.status === "draft" && (
                  <form action={submitDraftForReview.bind(null, listing.id)}>
                    <Button size="sm" type="submit">
                      Submit for review
                    </Button>
                  </form>
                )}
                {auction &&
                  ["ended", "no_sale"].includes(auction.status) && (
                    <form action={relistListing.bind(null, listing.id)}>
                      <Button variant="outline" size="sm" type="submit">
                        Relist
                      </Button>
                    </form>
                  )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
