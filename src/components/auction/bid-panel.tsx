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
import { formatCurrency, getMinNextBid, getBuyerPremium } from "@/lib/format";

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

type Invoice = {
  winning_bid: number;
  buyer_premium: number;
  total_due: number;
  status: string;
};

export function BidPanel({
  auction: initialAuction,
  initialBids,
  isSignedIn,
  initialIsWatching,
  invoice,
}: {
  auction: AuctionState;
  initialBids: Bid[];
  isSignedIn: boolean;
  initialIsWatching: boolean;
  invoice?: Invoice | null;
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
        async (payload) => {
          // Realtime INSERT payloads only carry the raw row — no joined
          // profile — so the bidder's username has to be fetched
          // separately, or every live-appended bid falls back to the
          // generic "bidder" label.
          const newBid = payload.new as Bid;
          const { data: bidder } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", newBid.bidder_id)
            .single();
          setBids((prev) => [
            { ...newBid, bidder_username: bidder?.username },
            ...prev,
          ]);
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
          <div className="text-sm text-muted-foreground">
            Current bid
            {bids.length > 0 && (
              <> · {bids.length} {bids.length === 1 ? "bid" : "bids"}</>
            )}
          </div>
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

      {invoice && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <p className="font-medium">You won this auction</p>
          <div className="mt-2 flex flex-col gap-1 text-muted-foreground">
            <div className="flex justify-between">
              <span>Winning bid</span>
              <span>{formatCurrency(invoice.winning_bid)}</span>
            </div>
            <div className="flex justify-between">
              <span>Buyer&apos;s premium (4.5%, max $500)</span>
              <span>{formatCurrency(invoice.buyer_premium)}</span>
            </div>
            <div className="flex justify-between font-medium text-foreground">
              <span>Total due</span>
              <span>{formatCurrency(invoice.total_due)}</span>
            </div>
          </div>
          <Badge
            variant={invoice.status === "paid" ? "default" : "outline"}
            className="mt-3"
          >
            {invoice.status === "paid" ? "Paid" : "Unpaid"}
          </Badge>
        </div>
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
              <p className="text-xs text-muted-foreground">
                Winning bidders pay a 4.5% buyer&apos;s premium (max $500) —
                estimated {formatCurrency(getBuyerPremium(minNextBid))} on the
                current minimum.
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
        <h3 className="mb-2 text-sm font-medium">
          Bid history{bids.length > 0 && ` (${bids.length})`}
        </h3>
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
