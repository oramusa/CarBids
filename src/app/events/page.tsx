import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { CarIllustration } from "@/components/car-illustration";
import { Countdown } from "@/components/auction/countdown";

type EventListing = {
  id: string;
  make: string;
  model: string;
  year: number;
  photos: string[];
  auction:
    | { start_time: string; end_time: string; status: string }
    | { start_time: string; end_time: string; status: string }[]
    | null;
};

function auctionOf(v: EventListing["auction"]) {
  return Array.isArray(v) ? v[0] : v;
}

async function getUpcoming() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(
      `id, make, model, year, photos,
       auction:auctions!inner (start_time, end_time, status)`
    )
    .eq("auctions.status", "scheduled")
    .order("start_time", { referencedTable: "auctions", ascending: true })
    .limit(30);
  return (data ?? []) as EventListing[];
}

async function getLiveEndingSoon() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(
      `id, make, model, year, photos,
       auction:auctions!inner (start_time, end_time, status)`
    )
    .eq("auctions.status", "live")
    .order("end_time", { referencedTable: "auctions", ascending: true })
    .limit(6);
  return (data ?? []) as EventListing[];
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const sameDay = (a: Date, b: Date) =>
    a.toDateString() === b.toDateString();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, tomorrow)) return "Tomorrow";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function EventRow({ listing, when }: { listing: EventListing; when: string }) {
  const photo = listing.photos[0];
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="flex items-center gap-4 rounded-lg border border-border bg-card p-3 transition-shadow hover:shadow-md"
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
        {photo ? (
          <Image
            src={photo}
            alt={`${listing.year} ${listing.make} ${listing.model}`}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <CarIllustration className="h-full w-full" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium">
          {listing.year} {listing.make} {listing.model}
        </div>
        <div className="text-xs text-muted-foreground">{when}</div>
      </div>
    </Link>
  );
}

export default async function EventsPage() {
  const [upcoming, endingSoon] = await Promise.all([
    getUpcoming(),
    getLiveEndingSoon(),
  ]);

  const grouped = new Map<string, EventListing[]>();
  for (const listing of upcoming) {
    const auction = auctionOf(listing.auction);
    if (!auction) continue;
    const key = dayLabel(auction.start_time);
    grouped.set(key, [...(grouped.get(key) ?? []), listing]);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Auctions going live soon, and auctions closing soon.
      </p>

      {endingSoon.length > 0 && (
        <div className="mt-8">
          <h2 className="text-base font-semibold tracking-tight">
            Closing soon
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {endingSoon.map((listing) => {
              const auction = auctionOf(listing.auction);
              if (!auction) return null;
              return (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="flex items-center gap-4 rounded-lg border border-border bg-card p-3 transition-shadow hover:shadow-md"
                >
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {listing.photos[0] ? (
                      <Image
                        src={listing.photos[0]}
                        alt={`${listing.year} ${listing.make} ${listing.model}`}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <CarIllustration className="h-full w-full" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {listing.year} {listing.make} {listing.model}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Bidding closes in
                    </div>
                  </div>
                  <Countdown endTime={auction.end_time} />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-base font-semibold tracking-tight">
          Upcoming auctions
        </h2>
        {grouped.size === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No auctions are scheduled to start yet. Check back soon, or{" "}
            <Link href="/sell" className="underline hover:text-foreground">
              list your own car
            </Link>
            .
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-6">
            {Array.from(grouped.entries()).map(([day, listings]) => (
              <div key={day}>
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {day}
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {listings.map((listing) => {
                    const auction = auctionOf(listing.auction);
                    if (!auction) return null;
                    return (
                      <EventRow
                        key={listing.id}
                        listing={listing}
                        when={`Starts ${new Date(auction.start_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
