export function formatCurrency(amount: number | null | undefined) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Mirrors get_min_increment() in supabase/migrations/0001_init.sql.
// This is only used for client-side input hints/validation — the database
// function is the actual source of truth and re-checks this on every bid.
export function getMinIncrement(currentPrice: number | null | undefined) {
  const price = currentPrice ?? 0;
  if (currentPrice == null || price < 1000) return 50;
  if (price < 10000) return 100;
  if (price < 25000) return 250;
  if (price < 50000) return 500;
  if (price < 100000) return 1000;
  return 2500;
}

export function getMinNextBid(currentPrice: number | null | undefined) {
  if (currentPrice == null) return getMinIncrement(null);
  return currentPrice + getMinIncrement(currentPrice);
}

export function getUrgencyLevel(
  endTime: string,
  now: number = Date.now()
): "plenty" | "soon" | "urgent" | "ended" {
  const remainingMs = new Date(endTime).getTime() - now;
  if (remainingMs <= 0) return "ended";
  if (remainingMs < 60 * 60 * 1000) return "urgent";
  if (remainingMs < 24 * 60 * 60 * 1000) return "soon";
  return "plenty";
}
