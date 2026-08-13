"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { Recall } from "@/lib/nhtsa-recalls";

export function VehicleHistory({
  accidentSeverity,
  accidentDetails,
  titleStatus,
  numberOfOwners,
  serviceHistory,
  recalls,
}: {
  accidentSeverity: string;
  accidentDetails: string | null;
  titleStatus: string;
  numberOfOwners: number | null;
  serviceHistory: string | null;
  recalls: Recall[];
}) {
  const accidentLabel = {
    none: "No accidents reported",
    minor: "Minor accident(s) reported",
    major: "Major accident / frame damage reported",
  }[accidentSeverity] ?? "No accidents reported";

  const titleLabel = {
    clean: "Clean title",
    salvage: "Salvage title",
    rebuilt: "Rebuilt title",
    lemon: "Lemon title",
    other: "Other title status",
  }[titleStatus] ?? "Clean title";

  const [showAllRecalls, setShowAllRecalls] = useState(false);
  const visibleRecalls = showAllRecalls ? recalls : recalls.slice(0, 5);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-medium">Vehicle history</h3>
      <p className="text-xs text-muted-foreground">
        Accident history, title status, owners, and service history below
        are seller-reported — not independently verified.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant={accidentSeverity === "none" ? "secondary" : "outline"}>
          {accidentLabel}
        </Badge>
        <Badge variant={titleStatus === "clean" ? "secondary" : "outline"}>
          {titleLabel}
        </Badge>
        {numberOfOwners != null && (
          <Badge variant="secondary">
            {numberOfOwners} owner{numberOfOwners === 1 ? "" : "s"}
          </Badge>
        )}
      </div>

      {accidentDetails && (
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Accident details: </span>
          {accidentDetails}
        </p>
      )}

      {serviceHistory && (
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Service history: </span>
          {serviceHistory}
        </p>
      )}

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
          <>
            <ul className="mt-2 flex flex-col gap-2">
              {visibleRecalls.map((recall) => (
                <li key={recall.campaignNumber} className="text-sm">
                  <span className="font-medium">{recall.component}</span>
                  <p className="text-xs text-muted-foreground">
                    {recall.summary}
                  </p>
                </li>
              ))}
            </ul>
            {recalls.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllRecalls((v) => !v)}
                className="mt-2 text-xs font-medium text-primary hover:underline"
              >
                {showAllRecalls
                  ? "Show fewer recalls"
                  : `Show ${recalls.length - 5} more recall(s)`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
