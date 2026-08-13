"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";

async function requireAdmin() {
  const session = await getCurrentUser();
  if (!session?.profile?.is_admin) redirect("/");
  return session;
}

/**
 * Approves a pending listing and immediately schedules a live auction for
 * it. There's no background job to promote a "scheduled" auction to "live"
 * later, so approval and going live happen in the same step — the admin
 * picks how many days it should run.
 */
export async function approveListing(listingId: string, formData: FormData) {
  await requireAdmin();

  const durationDays = Number(formData.get("durationDays")) || 7;
  const reservePriceRaw = formData.get("reservePrice");
  const reservePrice =
    reservePriceRaw && String(reservePriceRaw).trim() !== ""
      ? Number(reservePriceRaw)
      : null;

  const supabase = await createClient();
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Create the auction first — only flip the listing to "live" once it
  // actually has one, so a failed insert can't leave a listing marked live
  // with nothing backing it (which would just silently vanish from every
  // listings query, since those all inner-join on auctions).
  const { error: auctionError } = await supabase.from("auctions").insert({
    listing_id: listingId,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    reserve_price: reservePrice,
    status: "live",
  });

  if (auctionError) {
    redirect(
      `/admin/${listingId}/approve?error=${encodeURIComponent(auctionError.message)}`
    );
  }

  const { error: listingError } = await supabase
    .from("listings")
    .update({ status: "live", rejection_reason: null })
    .eq("id", listingId);

  if (listingError) {
    redirect(
      `/admin/${listingId}/approve?error=${encodeURIComponent(listingError.message)}`
    );
  }

  revalidatePath("/admin");
  redirect("/admin");
}

export async function rejectListing(listingId: string, formData: FormData) {
  await requireAdmin();

  const reason = String(formData.get("reason") ?? "").trim() || null;

  const supabase = await createClient();
  await supabase
    .from("listings")
    .update({ status: "rejected", rejection_reason: reason })
    .eq("id", listingId);

  revalidatePath("/admin");
}
