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
        `id, auction:auctions!inner (current_high_bid, status)`
      )
      .eq("make", listing.make)
      .in("auctions.status", ["ended", "sold"])
      .not("auctions.current_high_bid", "is", null)
      .neq("id", id),
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

  const comps = ((comparableSales ?? []) as { auction: { current_high_bid: number | null } | { current_high_bid: number | null }[] | null }[])
    .map((row) => {
      const a = Array.isArray(row.auction) ? row.auction[0] : row.auction;
      return a?.current_high_bid ?? null;
    })
    .filter((v): v is number => v != null);

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
              currentBid={auction.current_high_bid}
              sampleSize={comps.length}
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
