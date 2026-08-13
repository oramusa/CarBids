import Link from "next/link";
import { Gavel, ShieldCheck, FileSearch, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";

async function getStats() {
  const supabase = await createClient();

  const [{ count: completedCount }, { data: soldAuctions }, { count: memberCount }] =
    await Promise.all([
      supabase
        .from("auctions")
        .select("id", { count: "exact", head: true })
        .in("status", ["ended", "sold"]),
      supabase
        .from("auctions")
        .select("current_high_bid")
        .in("status", ["ended", "sold"])
        .not("current_high_bidder_id", "is", null),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

  const valueSold = (soldAuctions ?? []).reduce(
    (sum, a) => sum + (a.current_high_bid ?? 0),
    0
  );

  return {
    completedCount: completedCount ?? 0,
    valueSold,
    memberCount: memberCount ?? 0,
  };
}

export default async function AboutPage() {
  const stats = await getStats();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">About Car Bids</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Car Bids is an online marketplace for buying and selling enthusiast
        cars through timed auctions. Sellers list a car with photos, a
        description, and its history; buyers bid over a set window, and the
        highest bid at close wins.
      </p>

      <dl className="mt-6 grid grid-cols-3 gap-4 rounded-lg border border-border bg-card p-4 sm:max-w-md">
        <div>
          <dt className="text-xl font-bold tracking-tight">
            {stats.completedCount}
          </dt>
          <dd className="text-xs text-muted-foreground">
            Auctions completed
          </dd>
        </div>
        <div>
          <dt className="text-xl font-bold tracking-tight">
            {formatCurrency(stats.valueSold)}
          </dt>
          <dd className="text-xs text-muted-foreground">Value of cars sold</dd>
        </div>
        <div>
          <dt className="text-xl font-bold tracking-tight">
            {stats.memberCount}
          </dt>
          <dd className="text-xs text-muted-foreground">Members</dd>
        </div>
      </dl>

      <div className="mt-10">
        <h2 className="text-base font-semibold tracking-tight">
          How an auction works
        </h2>
        <ol className="mt-4 flex flex-col gap-4">
          <li className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
              1
            </span>
            <div>
              <div className="text-sm font-medium">A seller lists a car</div>
              <p className="text-sm text-muted-foreground">
                Photos, mileage, description, and vehicle history are
                submitted for review before the listing goes live.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
              2
            </span>
            <div>
              <div className="text-sm font-medium">Buyers bid over a set window</div>
              <p className="text-sm text-muted-foreground">
                Every auction has a fixed close time. Bids near the end can
                extend it briefly, and comments let buyers ask the seller
                questions in public.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
              3
            </span>
            <div>
              <div className="text-sm font-medium">Highest bid wins at close</div>
              <p className="text-sm text-muted-foreground">
                The winning bidder is invoiced for the bid plus a buyer&apos;s
                premium (4.5%, capped at $500), shown up front on every
                listing before you bid.
              </p>
            </div>
          </li>
        </ol>
      </div>

      <div className="mt-10">
        <h2 className="text-base font-semibold tracking-tight">
          What we show you before you bid
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex gap-3 rounded-lg border border-border bg-card p-3">
            <FileSearch className="size-5 shrink-0 text-primary" />
            <div>
              <div className="text-sm font-medium">Vehicle history</div>
              <p className="text-xs text-muted-foreground">
                Accident history, title status, and owner count are
                seller-reported and clearly labeled as such — we don&apos;t
                claim to independently verify them.
              </p>
            </div>
          </div>
          <div className="flex gap-3 rounded-lg border border-border bg-card p-3">
            <ShieldCheck className="size-5 shrink-0 text-primary" />
            <div>
              <div className="text-sm font-medium">NHTSA safety recalls</div>
              <p className="text-xs text-muted-foreground">
                Pulled live from NHTSA&apos;s public recall database by make,
                model, and year on every listing.
              </p>
            </div>
          </div>
          <div className="flex gap-3 rounded-lg border border-border bg-card p-3">
            <Gavel className="size-5 shrink-0 text-primary" />
            <div>
              <div className="text-sm font-medium">Estimated auction value</div>
              <p className="text-xs text-muted-foreground">
                A price range built from actual past Car Bids sales of the
                same make, including the buyer&apos;s premium — not a
                third-party estimate.
              </p>
            </div>
          </div>
          <div className="flex gap-3 rounded-lg border border-border bg-card p-3">
            <Users className="size-5 shrink-0 text-primary" />
            <div>
              <div className="text-sm font-medium">Seller reputation</div>
              <p className="text-xs text-muted-foreground">
                Ratings and reviews are left only by the buyer who actually
                won that seller&apos;s auction, one review per sale.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/community"
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          See what buyers are saying
        </Link>
        <Link
          href="/sell"
          className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-secondary"
        >
          Sell your car
        </Link>
      </div>
    </div>
  );
}
