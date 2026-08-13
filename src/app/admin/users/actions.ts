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

export async function toggleVerified(userId: string, nextValue: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ is_verified: nextValue })
    .eq("id", userId);
  revalidatePath("/admin/users");
}

export async function toggleAdmin(userId: string, nextValue: boolean) {
  const session = await requireAdmin();
  if (userId === session.user.id) return; // can't demote/promote yourself by accident
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ is_admin: nextValue })
    .eq("id", userId);
  revalidatePath("/admin/users");
}
