"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function formatRemaining(ms: number) {
  if (ms <= 0) return "Ended";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/** Live-ticking countdown. Re-syncs automatically whenever `endTime` changes
 * (e.g. after a soft-close extension pushed by Supabase Realtime). */
export function Countdown({ endTime }: { endTime: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = new Date(endTime).getTime() - now;
  const isEndingSoon = remainingMs > 0 && remainingMs < 2 * 60 * 1000;
  const isEnded = remainingMs <= 0;

  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        isEnded && "text-muted-foreground",
        isEndingSoon && "text-destructive animate-pulse"
      )}
    >
      {formatRemaining(remainingMs)}
    </span>
  );
}
