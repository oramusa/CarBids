import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { BidPanel } from "@/components/auction/bid-panel";
import { CommentsSection } from "@/components/auction/comments-section";
import { ListingGallery } from "@/components/auction/listing-gallery";
import { SellerReputation } from "@/components/seller-reputation";
import { ReviewForm } from "@/components/auction/review-form";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { MarketEstimate } from "@/components/market-estimate";
import { VehicleHistory } from "@/components/vehicle-history";
import { getRecalls } from "@/lib/nhtsa-recalls";
import { getBuyerPremium } from "@/lib/format";

export default async function ListingPage(props: PageProps<"/listings/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const session = await getCurrentUser();

  const { data: listing } = await supabase
    .from("listings")
    .select(
      `*, seller:profiles!listings_seller_id_fkey (username),
       auction:auctions!inner (*)`
    )
    .eq("id", id)
    .single();

  if (!listing) notFound();

  const auction = Array.isArray(listing.auction)
    ? listing.auction[0]
    : listing.auction;

  const [
    { data: bids },
    { data: comments },
    { data: sellerReviews },
    { data: ownReview },
    { data: ownWatch },
    { data: similarListings },
    { data: comparableSales },
    { data: invoice },
  ] = await Promise.all([
    supabase
      .from("bids")
      .select("id, amount, bidder_id, created_at, bidder:profiles(username)")
      .eq("auction_id", auction.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("comments")
      .select("id, body, created_at, user_id, author:profiles(username)")
      .eq("listing_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("reviews").select("rating").eq("seller_id", listing.seller_id),
    session
      ? supabase
          .from("reviews")
          .select("id")
          .eq("auction_id", auction.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    session
      ? supabase
          .from("watches")
          .select("user_id")
          .eq("user_id", session.user.id)
          .eq("auction_id", auction.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("listings")
      .select(
        `id, make, model, year, photos, location,
         auction:auctions!inner (id, end_time, current_high_bid, reserve_price, reserve_met, status)`
      )
      .eq("make", listing.make)
      .eq("auctions.status", "live")
      .neq("id", id)
      .limit(4),
    supabase
      .from("listings")
      .select(
        `id, model, year, auction:auctions!inner (current_high_bid, end_time, status)`
      )
      .eq("make", listing.make)
      .in("auctions.status", ["ended", "sold"])
      .not("auctions.current_high_bid", "is", null)
      .neq("id", id)
      .order("end_time", { referencedTable: "auctions", ascending: false })
      .limit(10),
    session
      ? supabase
          .from("invoices")
          .select("winning_bid, buyer_premium, total_due, status")
          .eq("auction_id", auction.id)
          .eq("buyer_id", session.user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const recalls = await getRecalls(listing.make, listing.model, listing.year);

  type CompRow = {
    model: string;
    year: number;
    auction:
      | { current_high_bid: number | null; end_time: string }
      | { current_high_bid: number | null; end_time: string }[]
      | null;
  };

  const compSales = ((comparableSales ?? []) as CompRow[])
    .map((row) => {
      const a = Array.isArray(row.auction) ? row.auction[0] : row.auction;
      if (a?.current_high_bid == null) return null;
      const bid = a.current_high_bid;
      return {
        model: row.model,
        year: row.year,
        // Total the buyer actually paid, not just the winning bid — this
        // is what makes it a true "estimated auction value" comparison
        // rather than an apples-to-oranges bid-only number.
        price: bid + getBuyerPremium(bid),
        endTime: a.end_time,
      };
    })
    .filter((v): v is { model: string; year: number; price: number; endTime: string } => v != null);

  const comps = compSales.map((c) => c.price);

  const marketEstimate =
    comps.length > 0
      ? { low: Math.min(...comps), high: Math.max(...comps) }
      : null;

  const reviewCount = sellerReviews?.length ?? 0;
  const averageRating =
    reviewCount > 0
      ? sellerReviews!.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : null;

  const isAuctionOver = ["ended", "sold"].includes(auction.status);
  const isWinner = session?.user.id === auction.current_high_bidder_id;
  const canReview = isAuctionOver && isWinner && !ownReview;

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-10 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <ListingGallery
          photos={listing.photos ?? []}
          alt={`${listing.year} ${listing.make} ${listing.model}`}
        />
        <div>
          <h1 className="text-2xl font-semibold">
            {listing.year} {listing.make} {listing.model}
          </h1>
          <p className="text-sm text-muted-foreground">
            {listing.mileage.toLocaleString()} miles · Listed by{" "}
            {listing.seller?.username ? (
              <Link
                href={`/sellers/${listing.seller.username}`}
                className="hover:underline"
              >
                {listing.seller.username}
              </Link>
            ) : (
              "seller"
            )}
          </p>
          <div className="mt-1">
            <SellerReputation
              averageRating={averageRating}
              reviewCount={reviewCount}
            />
          </div>
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed">
          {listing.description}
        </p>

        <VehicleHistory
          accidentSeverity={listing.accident_severity ?? "none"}
          accidentDetails={listing.accident_details}
          titleStatus={listing.title_status ?? "clean"}
          numberOfOwners={listing.number_of_owners}
          serviceHistory={listing.service_history}
          recalls={recalls}
        />

        {canReview && (
          <ReviewForm
            listingId={id}
            auctionId={auction.id}
            sellerId={listing.seller_id}
          />
        )}

        <CommentsSection
          listingId={id}
          isSignedIn={!!session}
          initialComments={
            comments?.map((c) => ({
              ...c,
              username: (c.author as { username?: string } | null)?.username,
            })) ?? []
          }
        />
      </div>

      <div>
        {marketEstimate && (
          <div className="mb-4">
            <MarketEstimate
              low={marketEstimate.low}
              high={marketEstimate.high}
              currentTotalCost={
                auction.current_high_bid != null
                  ? auction.current_high_bid +
                    getBuyerPremium(auction.current_high_bid)
                  : null
              }
              sampleSize={comps.length}
              comps={compSales}
              make={listing.make}
            />
          </div>
        )}

        <BidPanel
          auction={auction}
          isSignedIn={!!session}
          initialIsWatching={!!ownWatch}
          invoice={invoice}
          initialBids={
            bids?.map((b) => ({
              ...b,
              bidder_username: (b.bidder as { username?: string } | null)
                ?.username,
            })) ?? []
          }
        />

        {similarListings && similarListings.length > 0 && (
          <div className="mt-10">
            <h3 className="mb-3 text-sm font-medium">Similar vehicles</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(similarListings as unknown as (ListingCardData & { auction: ListingCardData["auction"] })[]).map(
                (similar) => (
                  <ListingCard key={similar.id} listing={similar} />
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
