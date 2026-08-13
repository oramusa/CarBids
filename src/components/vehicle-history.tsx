import { Badge } from "@/components/ui/badge";
import type { Recall } from "@/lib/nhtsa-recalls";

export function VehicleHistory({
  accidentSeverity,
  accidentDetails,
  recalls,
}: {
  accidentSeverity: string;
  accidentDetails: string | null;
  recalls: Recall[];
}) {
  const accidentLabel = {
    none: "No accidents reported",
    minor: "Minor accident(s) reported",
    major: "Major accident / frame damage reported",
  }[accidentSeverity] ?? "No accidents reported";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-medium">Vehicle history</h3>

      <div className="mt-3">
        <div className="flex items-center gap-2">
          <Badge variant={accidentSeverity === "none" ? "secondary" : "outline"}>
            {accidentLabel}
          </Badge>
          <span className="text-xs text-muted-foreground">
            (seller-reported, not independently verified)
          </span>
        </div>
        {accidentDetails && (
          <p className="mt-2 text-sm text-muted-foreground">{accidentDetails}</p>
        )}
      </div>

      <div className="mt-4">
        <div className="text-xs font-medium text-muted-foreground">
          NHTSA safety recalls{" "}
          <span className="italic">(free public data, by make/model/year)</span>
        </div>
        {recalls.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            No open recalls found for this make/model/year.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {recalls.slice(0, 5).map((recall) => (
              <li key={recall.campaignNumber} className="text-sm">
                <span className="font-medium">{recall.component}</span>
                <p className="text-xs text-muted-foreground">
                  {recall.summary.slice(0, 160)}
                  {recall.summary.length > 160 ? "…" : ""}
                </p>
              </li>
            ))}
            {recalls.length > 5 && (
              <li className="text-xs text-muted-foreground">
                +{recalls.length - 5} more recall(s) on file.
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
