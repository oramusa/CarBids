"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { submitReview } from "@/app/listings/actions";
import { cn } from "@/lib/utils";

export function ReviewForm({
  listingId,
  auctionId,
  sellerId,
}: {
  listingId: string;
  auctionId: string;
  sellerId: string;
}) {
  const [rating, setRating] = useState(5);

  return (
    <form
      action={submitReview.bind(null, listingId, auctionId, sellerId)}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <p className="text-sm font-medium">You won this auction — rate the seller</p>

      <input type="hidden" name="rating" value={rating} />
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            className={cn(
              "text-2xl leading-none",
              value <= rating ? "text-primary" : "text-muted-foreground"
            )}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        name="comment"
        rows={3}
        placeholder="Optional comment about the seller…"
        className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      />

      <Button type="submit" size="sm" className="w-fit">
        Submit review
      </Button>
    </form>
  );
}
