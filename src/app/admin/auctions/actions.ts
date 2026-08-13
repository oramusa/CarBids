"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";

export async function forceEndAuction(auctionId: string) {
  const session = await getCurrentUser();
  if (!session?.profile?.is_admin) redirect("/");

  const supabase = await createClient();
  await supabase
    .from("auctions")
    .update({ status: "ended", end_time: new Date().toISOString() })
    .eq("id", auctionId)
    .eq("status", "live");

  revalidatePath("/admin/auctions");
}
