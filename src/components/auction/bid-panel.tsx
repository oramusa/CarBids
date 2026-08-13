"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Countdown } from "@/components/auction/countdown";
import { PulseDot } from "@/components/ui/pulse-dot";
import { WatchButton } from "@/components/auction/watch-button";
import { formatCurrency, getMinNextBid } from "@/lib/format";

type Bid = {
  id: string;
  amount: number;
  bidder_id: string;
  created_at: string;
  bidder_username?: string;
};

type AuctionState = {
  id: string;
  end_time: string;
  current_high_bid: number | null;
  reserve_price: number | null;
  reserve_met: boolean;
  status: string;
};

export function BidPanel({
  auction: initialAuction,
  initialBids,
  isSignedIn,
  initialIsWatching,
}: {
  auction: AuctionState;
  initialBids: Bid[];
  isSignedIn: boolean;
  initialIsWatching: boolean;
}) {
  const [auction, setAuction] = useState(initialAuction);
  const [bids, setBids] = useState(initialBids);
  const [amount, setAmount] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const minNextBid = getMinNextBid(auction.current_high_bid);

  // Live updates: auction row (price/soft-close extensions) + new bids.
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`auction-${auction.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auctions",
          filter: `id=eq.${auction.id}`,
        },
        (payload) => {
          setAuction((prev) => ({ ...prev, ...(payload.new as AuctionState) }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bids",
          filter: `auction_id=eq.${auction.id}`,
        },
        (payload) => {
          setBids((prev) => [payload.new as Bid, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auction.id]);

  const placeBid = useMutation({
    mutationFn: async (bidAmount: number) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("place_bid", {
        p_auction_id: auction.id,
        p_amount: bidAmount,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setAmount("");
      setErrorMessage(null);
    },
    onError: (err: Error) => {
      setErrorMessage(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    if (Number.isNaN(parsed)) {
      setErrorMessage("Enter a valid amount");
      return;
    }
    placeBid.mutate(parsed);
  }

  const isEnded = auction.status !== "live" || new Date(auction.end_time) < new Date();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Current bid</div>
          <div className="text-3xl font-semibold">
            {formatCurrency(auction.current_high_bid)}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5 text-sm text-muted-foreground">
            {!isEnded && <PulseDot className="text-primary" />}
            {isEnded ? "Auction ended" : "Time left"}
          </div>
          {!isEnded && <Countdown endTime={auction.end_time} />}
        </div>
      </div>

      <WatchButton
        auctionId={auction.id}
        isSignedIn={isSignedIn}
        initialIsWatching={initialIsWatching}
      />

      {auction.reserve_price != null && (
        <Badge variant={auction.reserve_met ? "default" : "outline"} className="w-fit">
          {auction.reserve_met ? "Reserve met" : "Reserve not met"}
        </Badge>
      )}

      {!isEnded && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {isSignedIn ? (
            <>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="1"
                  min={minNextBid}
                  placeholder={`${minNextBid}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <Button type="submit" disabled={placeBid.isPending}>
                  {placeBid.isPending ? "Placing…" : "Place bid"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum next bid: {formatCurrency(minNextBid)}
              </p>
              {errorMessage && (
                <p className="text-sm text-destructive">{errorMessage}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              <a href="/login" className="underline">
                Sign in
              </a>{" "}
              to place a bid.
            </p>
          )}
        </form>
      )}

      <Separator />

      <div>
        <h3 className="mb-2 text-sm font-medium">Bid history</h3>
        {bids.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bids yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {bids.map((bid) => (
              <li
                key={bid.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {bid.bidder_username ?? "bidder"}
                </span>
                <span className="font-medium">
                  {formatCurrency(bid.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
