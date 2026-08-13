import { notFound } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SellerReputation } from "@/components/seller-reputation";
import { ListingCard, type ListingCardData } from "@/components/listing-card";

export default async function SellerProfilePage(
  props: PageProps<"/sellers/[username]">
) {
  const { username } = await props.params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, is_verified")
    .eq("username", username)
    .single();

  if (!profile) notFound();

  const [{ data: listings }, { data: reviews }] = await Promise.all([
    supabase
      .from("listings")
      .select(
        `id, make, model, year, photos, location,
         auction:auctions (id, end_time, current_high_bid, reserve_price, reserve_met, status)`
      )
      .eq("seller_id", profile.id)
      .in("status", ["approved", "live", "ended"])
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("rating, comment, created_at, buyer:profiles!reviews_buyer_id_fkey (username)")
      .eq("seller_id", profile.id)
      .order("created_at", { ascending: false }),
  ]);

  const reviewCount = reviews?.length ?? 0;
  const averageRating =
    reviewCount > 0
      ? reviews!.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {profile.username}
        </h1>
        {profile.is_verified && (
          <span title="Verified seller">
            <BadgeCheck className="size-5 text-primary" />
          </span>
        )}
      </div>
      <div className="mt-1">
        <SellerReputation
          averageRating={averageRating}
          reviewCount={reviewCount}
        />
      </div>

      <h2 className="mt-10 text-lg font-bold tracking-tight">Listings</h2>
      {(!listings || listings.length === 0) && (
        <p className="mt-4 text-sm text-muted-foreground">
          No public listings yet.
        </p>
      )}
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(listings as unknown as (ListingCardData & { auction: ListingCardData["auction"] })[] | null)?.map(
          (listing) => (
            <ListingCard key={listing.id} listing={listing} />
          )
        )}
      </div>

      <h2 className="mt-10 text-lg font-bold tracking-tight">Reviews</h2>
      {reviewCount === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No reviews yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {reviews?.map((review, index) => (
            <li
              key={index}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="text-primary">{"★".repeat(review.rating)}</span>
                <span className="text-muted-foreground">
                  {(review.buyer as { username?: string } | null)?.username ??
                    "buyer"}
                </span>
              </div>
              {review.comment && (
                <p className="mt-1 text-sm">{review.comment}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
