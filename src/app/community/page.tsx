import Link from "next/link";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

async function getStats() {
  const supabase = await createClient();

  const [{ count: memberCount }, { count: commentCount }, { count: reviewCount }] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("comments").select("id", { count: "exact", head: true }),
      supabase.from("reviews").select("id", { count: "exact", head: true }),
    ]);

  return {
    memberCount: memberCount ?? 0,
    commentCount: commentCount ?? 0,
    reviewCount: reviewCount ?? 0,
  };
}

async function getRecentComments() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select(
      `id, body, created_at,
       author:profiles (username),
       listing:listings (id, year, make, model)`
    )
    .order("created_at", { ascending: false })
    .limit(8);
  return data ?? [];
}

async function getRecentReviews() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select(
      `id, rating, comment, created_at,
       buyer:profiles!reviews_buyer_id_fkey (username),
       seller:profiles!reviews_seller_id_fkey (username)`
    )
    .order("created_at", { ascending: false })
    .limit(8);
  return data ?? [];
}

type Named = { username?: string } | { username?: string }[] | null;
function nameOf(v: Named) {
  return (Array.isArray(v) ? v[0]?.username : v?.username) ?? "member";
}

type ListingRef =
  | { id: string; year: number; make: string; model: string }
  | { id: string; year: number; make: string; model: string }[]
  | null;
function listingOf(v: ListingRef) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function CommunityPage() {
  const [stats, comments, reviews] = await Promise.all([
    getStats(),
    getRecentComments(),
    getRecentReviews(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Community</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        What buyers and sellers are saying across Car Bids right now.
      </p>

      <dl className="mt-6 grid grid-cols-3 gap-4 rounded-lg border border-border bg-card p-4 sm:max-w-md">
        <div>
          <dt className="text-xl font-bold tracking-tight">{stats.memberCount}</dt>
          <dd className="text-xs text-muted-foreground">Members</dd>
        </div>
        <div>
          <dt className="text-xl font-bold tracking-tight">{stats.commentCount}</dt>
          <dd className="text-xs text-muted-foreground">Comments posted</dd>
        </div>
        <div>
          <dt className="text-xl font-bold tracking-tight">{stats.reviewCount}</dt>
          <dd className="text-xs text-muted-foreground">Seller reviews</dd>
        </div>
      </dl>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Recent discussion
          </h2>
          {comments.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No comments yet — be the first to ask a question on a listing.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-4">
              {comments.map((c) => {
                const listing = listingOf(c.listing as ListingRef);
                return (
                  <li
                    key={c.id}
                    className="rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {nameOf(c.author as Named)}
                      </span>
                      <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed">{c.body}</p>
                    {listing && (
                      <Link
                        href={`/listings/${listing.id}`}
                        className="mt-1.5 inline-block text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        on {listing.year} {listing.make} {listing.model}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Recent seller reviews
          </h2>
          {reviews.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No reviews yet — reviews appear here once winning bidders rate
              their sellers.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-4">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 text-primary">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} className="size-3 fill-primary" />
                      ))}
                    </span>
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.comment && (
                    <p className="mt-1.5 text-sm leading-relaxed">
                      &ldquo;{r.comment}&rdquo;
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {nameOf(r.buyer as Named)} reviewed{" "}
                    <Link
                      href={`/sellers/${nameOf(r.seller as Named)}`}
                      className="hover:text-foreground hover:underline"
                    >
                      {nameOf(r.seller as Named)}
                    </Link>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
