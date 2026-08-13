import { formatCurrency } from "@/lib/format";

type Comp = { model: string; year: number; price: number; endTime: string };

export function MarketEstimate({
  low,
  high,
  currentTotalCost,
  sampleSize,
  comps,
  make,
}: {
  low: number;
  high: number;
  currentTotalCost: number | null;
  sampleSize: number;
  comps: Comp[];
  make: string;
}) {
  let verdict: string | null = null;
  if (currentTotalCost != null) {
    if (currentTotalCost < low) verdict = "Below market";
    else if (currentTotalCost > high) verdict = "Above market";
    else verdict = "At market";
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">
        Estimated auction value{" "}
        <span className="italic">
          (based on {sampleSize} past sale{sampleSize === 1 ? "" : "s"} on Car
          Bids, including buyer&apos;s premium)
        </span>
      </div>
      <div className="mt-1 text-lg font-semibold">
        {formatCurrency(low)}–{formatCurrency(high)}
      </div>
      {verdict && (
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Current total cost: {formatCurrency(currentTotalCost)}
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

      {comps.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="text-xs text-muted-foreground">
            Comparable {make} sales on Car Bids{" "}
            <span className="italic">(total paid, incl. premium)</span>
          </div>
          <ul className="mt-1.5 flex flex-col gap-1">
            {comps.slice(0, 5).map((comp, i) => (
              <li
                key={i}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-muted-foreground">
                  {comp.year} {comp.model} ·{" "}
                  {new Date(comp.endTime).toLocaleDateString()}
                </span>
                <span className="font-medium">
                  {formatCurrency(comp.price)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
