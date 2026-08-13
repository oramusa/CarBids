"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";

export async function submitReview(
  listingId: string,
  auctionId: string,
  sellerId: string,
  formData: FormData
) {
  const session = await getCurrentUser();
  if (!session) return;

  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim() || null;

  const supabase = await createClient();
  // RLS ("winning bidder can review after auction ends") enforces that this
  // user actually won this auction and it's over — no need to re-check here.
  await supabase.from("reviews").insert({
    auction_id: auctionId,
    seller_id: sellerId,
    buyer_id: session.user.id,
    rating,
    comment,
  });

  revalidatePath(`/listings/${listingId}`);
}
