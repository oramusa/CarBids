import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { Button } from "@/components/ui/button";
import { rejectListing } from "@/app/admin/actions";

export default async function AdminQueuePage() {
  const session = await getCurrentUser();
  if (!session?.profile?.is_admin) redirect("/");

  const supabase = await createClient();
  const { data: pending, error } = await supabase
    .from("listings")
    .select(
      "id, make, model, year, mileage, description, created_at, seller:profiles!listings_seller_id_fkey (username)"
    )
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Listing approval queue</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/auctions">Auctions</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/users">Users</Link>
          </Button>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {pending?.length ?? 0} listing{pending?.length === 1 ? "" : "s"} waiting for review.
      </p>

      {error && (
        <p className="mt-8 text-sm text-destructive">
          Couldn&apos;t load the queue: {error.message}
        </p>
      )}

      {!error && (!pending || pending.length === 0) && (
        <div className="mt-8 rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">Nothing to review.</p>
        </div>
      )}

      <ul className="mt-6 flex flex-col gap-4">
        {pending?.map((listing) => (
          <li
            key={listing.id}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">
                  {listing.year} {listing.make} {listing.model}
                </p>
                <p className="text-xs text-muted-foreground">
                  {listing.mileage.toLocaleString()} miles · Submitted by{" "}
                  {(listing.seller as { username?: string } | null)?.username ?? "seller"}
                </p>
              </div>
              <Button asChild size="sm">
                <Link href={`/admin/${listing.id}/approve`}>Approve…</Link>
              </Button>
            </div>

            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {listing.description}
            </p>

            <form action={rejectListing.bind(null, listing.id)} className="mt-3 flex gap-2">
              <input
                type="text"
                name="reason"
                placeholder="Rejection reason (optional)"
                className="h-8 flex-1 rounded-md border border-input bg-transparent px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              <Button type="submit" variant="outline" size="sm">
                Reject
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
