import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { cn } from "@/lib/utils";
import { deleteSavedSearch } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

type AuctionRow = {
  id: string;
  end_time: string;
  current_high_bid: number | null;
  reserve_price: number | null;
  reserve_met: boolean;
  status: string;
  current_high_bidder_id: string | null;
  listing:
    | { id: string; make: string; model: string; year: number; photos: string[]; location: string | null }
    | { id: string; make: string; model: string; year: number; photos: string[]; location: string | null }[]
    | null;
};

const TABS = [
  { key: "winning", label: "Winning" },
  { key: "active", label: "Active Bids" },
  { key: "watchlist", label: "Watchlist" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function toCardData(row: AuctionRow): (ListingCardData & { auction: ListingCardData["auction"] }) | null {
  const listing = Array.isArray(row.listing) ? row.listing[0] : row.listing;
  if (!listing) return null;
  return {
    id: listing.id,
    make: listing.make,
    model: listing.model,
    year: listing.year,
    photos: listing.photos,
    location: listing.location,
    auction: {
      id: row.id,
      end_time: row.end_time,
      current_high_bid: row.current_high_bid,
      reserve_price: row.reserve_price,
      reserve_met: row.reserve_met,
      status: row.status,
    },
  };
}

export default async function BuyerDashboardPage(
  props: PageProps<"/dashboard">
) {
  const { tab } = await props.searchParams;
  const activeTab: TabKey = TABS.some((t) => t.key === tab)
    ? (tab as TabKey)
    : "winning";

  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const userId = session.user.id;

  const auctionColumns =
    "id, end_time, current_high_bid, reserve_price, reserve_met, status, current_high_bidder_id, listing:listings (id, make, model, year, photos, location)";

  const [{ data: myBids }, { data: watchRows }, { data: endingSoon }, { data: savedSearches }] =
    await Promise.all([
      supabase.from("bids").select("auction_id").eq("bidder_id", userId),
      supabase
        .from("watches")
        .select(`auction:auctions (${auctionColumns})`)
        .eq("user_id", userId),
      supabase
        .from("auctions")
        .select(auctionColumns)
        .eq("status", "live")
        .order("end_time", { ascending: true })
        .limit(3),
      supabase
        .from("saved_searches")
        .select("id, query, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

  const biddedAuctionIds = [...new Set(myBids?.map((b) => b.auction_id) ?? [])];

  const { data: biddedAuctions } =
    biddedAuctionIds.length > 0
      ? await supabase.from("auctions").select(auctionColumns).in("id", biddedAuctionIds)
      : { data: [] as AuctionRow[] };

  const grouped: Record<TabKey, ReturnType<typeof toCardData>[]> = {
    winning: [],
    active: [],
    watchlist: [],
    won: [],
    lost: [],
  };

  for (const auction of (biddedAuctions as AuctionRow[] | null) ?? []) {
    const isLive = auction.status === "live";
    const isMine = auction.current_high_bidder_id === userId;
    const card = toCardData(auction);
    if (isLive && isMine) grouped.winning.push(card);
    else if (isLive && !isMine) grouped.active.push(card);
    else if (!isLive && isMine) grouped.won.push(card);
    else if (!isLive && !isMine) grouped.lost.push(card);
  }

  for (const row of (watchRows as { auction: AuctionRow | AuctionRow[] | null }[] | null) ?? []) {
    const auction = Array.isArray(row.auction) ? row.auction[0] : row.auction;
    if (auction) grouped.watchlist.push(toCardData(auction));
  }

  const shown = grouped[activeTab].filter(
    (c): c is NonNullable<typeof c> => c !== null
  );

  const endingSoonCards = ((endingSoon as AuctionRow[] | null) ?? [])
    .map(toCardData)
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">My Bids</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Track auctions you&apos;re watching and bidding on.
      </p>

      {endingSoonCards.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium">Auctions ending soon</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {endingSoonCards.map((c) => (
              <ListingCard key={c.id} listing={c} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex gap-2 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard?tab=${t.key}`}
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

      {shown.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">Nothing here yet.</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {shown.map((c) => (
          <ListingCard key={c.id} listing={c} />
        ))}
      </div>

      {savedSearches && savedSearches.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-medium">Saved searches</h2>
          <ul className="flex flex-col gap-2">
            {savedSearches.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5"
              >
                <Link href={`/?q=${encodeURIComponent(s.query)}`} className="text-sm hover:underline">
                  {s.query}
                </Link>
                <form action={deleteSavedSearch.bind(null, s.id)}>
                  <Button variant="ghost" size="sm" type="submit">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
