import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { formatCurrency } from "@/lib/format";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

export default async function AdminReportsPage() {
  const session = await getCurrentUser();
  if (!session?.profile?.is_admin) redirect("/");

  const supabase = await createClient();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [
    { count: userCount },
    { data: listingsByStatus },
    { count: bidCount },
    { data: soldAuctions },
    { count: endingTodayCount },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("status"),
    supabase.from("bids").select("id", { count: "exact", head: true }),
    supabase
      .from("auctions")
      .select("current_high_bid")
      .in("status", ["ended", "sold"])
      .not("current_high_bidder_id", "is", null),
    supabase
      .from("auctions")
      .select("id", { count: "exact", head: true })
      .eq("status", "live")
      .gte("end_time", startOfToday.toISOString())
      .lte("end_time", endOfToday.toISOString()),
  ]);

  const statusCounts = new Map<string, number>();
  for (const row of listingsByStatus ?? []) {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
  }

  const gmv = (soldAuctions ?? []).reduce(
    (sum, a) => sum + (a.current_high_bid ?? 0),
    0
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Platform-wide stats.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total users" value={userCount ?? 0} />
        <StatCard label="Total bids" value={bidCount ?? 0} />
        <StatCard label="Gross merchandise value" value={formatCurrency(gmv)} />
        <StatCard label="Auctions ending today" value={endingTodayCount ?? 0} />
        <StatCard label="Live listings" value={statusCounts.get("live") ?? 0} />
        <StatCard label="Pending review" value={statusCounts.get("pending_review") ?? 0} />
      </div>

      <h2 className="mt-10 mb-3 text-sm font-medium">Listings by status</h2>
      <ul className="flex flex-col gap-1.5 text-sm">
        {[...statusCounts.entries()].map(([status, count]) => (
          <li key={status} className="flex items-center justify-between">
            <span className="capitalize text-muted-foreground">
              {status.replace("_", " ")}
            </span>
            <span className="font-medium">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
