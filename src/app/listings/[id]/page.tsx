import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { BidPanel } from "@/components/auction/bid-panel";
import { CommentsSection } from "@/components/auction/comments-section";
import { ListingGallery } from "@/components/auction/listing-gallery";
import { SellerReputation } from "@/components/seller-reputation";
import { ReviewForm } from "@/components/auction/review-form";

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

  const [{ data: bids }, { data: comments }, { data: sellerReviews }, { data: ownReview }] =
    await Promise.all([
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
    ]);

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
            {listing.seller?.username ?? "seller"}
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
        <BidPanel
          auction={auction}
          isSignedIn={!!session}
          initialBids={
            bids?.map((b) => ({
              ...b,
              bidder_username: (b.bidder as { username?: string } | null)
                ?.username,
            })) ?? []
          }
        />
      </div>
    </div>
  );
}
