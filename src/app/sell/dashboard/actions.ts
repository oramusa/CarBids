"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";

/**
 * Relist an unsold listing: copies its details into a brand-new
 * pending_review listing under the same seller. The original listing and
 * its (ended) auction are left untouched as history.
 */
export async function relistListing(listingId: string) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: original } = await supabase
    .from("listings")
    .select("make, model, year, mileage, vin, condition, description, photos, location, seller_id")
    .eq("id", listingId)
    .single();

  if (!original || original.seller_id !== session.user.id) {
    redirect("/sell/dashboard");
  }

  const { data: relisted, error } = await supabase
    .from("listings")
    .insert({
      seller_id: session.user.id,
      make: original.make,
      model: original.model,
      year: original.year,
      mileage: original.mileage,
      vin: original.vin,
      condition: original.condition,
      description: original.description,
      photos: original.photos,
      location: original.location,
    })
    .select("id")
    .single();

  if (error || !relisted) {
    redirect("/sell/dashboard");
  }

  redirect(`/sell/${relisted.id}/edit`);
}
