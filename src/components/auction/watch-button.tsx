"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WatchButton({
  auctionId,
  isSignedIn,
  initialIsWatching,
}: {
  auctionId: string;
  isSignedIn: boolean;
  initialIsWatching: boolean;
}) {
  const [isWatching, setIsWatching] = useState(initialIsWatching);
  const [isPending, startTransition] = useTransition();

  if (!isSignedIn) return null;

  function toggle() {
    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (isWatching) {
        await supabase
          .from("watches")
          .delete()
          .eq("user_id", user.id)
          .eq("auction_id", auctionId);
        setIsWatching(false);
      } else {
        await supabase
          .from("watches")
          .insert({ user_id: user.id, auction_id: auctionId });
        setIsWatching(true);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={isPending}
      className="gap-1.5"
    >
      <Heart
        className={cn(
          "size-4",
          isWatching && "fill-primary text-primary"
        )}
      />
      {isWatching ? "Watching" : "Watch"}
    </Button>
  );
}
