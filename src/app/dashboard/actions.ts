"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";

export async function saveSearch(query: string) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  if (!query.trim()) return;

  const supabase = await createClient();
  await supabase
    .from("saved_searches")
    .insert({ user_id: session.user.id, query: query.trim().slice(0, 100) });

  revalidatePath("/dashboard");
}

export async function deleteSavedSearch(id: string) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const supabase = await createClient();
  await supabase
    .from("saved_searches")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  revalidatePath("/dashboard");
}
