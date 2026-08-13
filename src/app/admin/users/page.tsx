import { redirect } from "next/navigation";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { Button } from "@/components/ui/button";
import { toggleAdmin, toggleVerified } from "@/app/admin/users/actions";

export default async function AdminUsersPage() {
  const session = await getCurrentUser();
  if (!session?.profile?.is_admin) redirect("/");

  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, is_verified, is_admin, created_at")
    .order("created_at", { ascending: true });

  const { data: listingCounts } = await supabase
    .from("listings")
    .select("seller_id");

  const countsBySeller = new Map<string, number>();
  for (const row of listingCounts ?? []) {
    countsBySeller.set(row.seller_id, (countsBySeller.get(row.seller_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Users</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {profiles?.length ?? 0} registered users.
      </p>

      {error && (
        <p className="mt-8 text-sm text-destructive">
          Couldn&apos;t load users: {error.message}
        </p>
      )}

      <ul className="mt-6 flex flex-col gap-2">
        {profiles?.map((profile) => (
          <li
            key={profile.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium">{profile.username}</span>
                {profile.is_verified && (
                  <BadgeCheck className="size-4 text-primary" />
                )}
                {profile.is_admin && (
                  <ShieldCheck className="size-4 text-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {countsBySeller.get(profile.id) ?? 0} listings · joined{" "}
                {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex gap-2">
              <form action={toggleVerified.bind(null, profile.id, !profile.is_verified)}>
                <Button type="submit" variant="outline" size="sm">
                  {profile.is_verified ? "Unverify" : "Verify"}
                </Button>
              </form>
              {profile.id !== session.user.id && (
                <form action={toggleAdmin.bind(null, profile.id, !profile.is_admin)}>
                  <Button type="submit" variant="outline" size="sm">
                    {profile.is_admin ? "Remove admin" : "Make admin"}
                  </Button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
