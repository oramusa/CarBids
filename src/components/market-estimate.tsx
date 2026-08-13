import { formatCurrency } from "@/lib/format";

export function MarketEstimate({
  low,
  high,
  currentBid,
  sampleSize,
}: {
  low: number;
  high: number;
  currentBid: number | null;
  sampleSize: number;
}) {
  let verdict: string | null = null;
  if (currentBid != null) {
    if (currentBid < low) verdict = "Below market";
    else if (currentBid > high) verdict = "Above market";
    else verdict = "At market";
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">
        Estimated market value{" "}
        <span className="italic">
          (based on {sampleSize} past sale{sampleSize === 1 ? "" : "s"} on
          Car Bids)
        </span>
      </div>
      <div className="mt-1 text-lg font-semibold">
        {formatCurrency(low)}–{formatCurrency(high)}
      </div>
      {verdict && (
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Current bid: {formatCurrency(currentBid)}
          </span>
          <span
            className={
              verdict === "Below market"
                ? "font-medium text-primary"
                : "font-medium text-muted-foreground"
            }
          >
            {verdict}
          </span>
        </div>
      )}
    </div>
  );
}
