"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";

export async function reorderListingPhotos(
  listingId: string,
  photos: string[]
) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_listing_photos", {
    p_listing_id: listingId,
    p_photos: photos,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/sell/dashboard");
  revalidatePath(`/sell/${listingId}/photos`);
  return { error: null };
}
