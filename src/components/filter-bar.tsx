"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const YEAR_OPTIONS = [
  { value: "", label: "Any year" },
  { value: "2020s", label: "2020 - present" },
  { value: "2010s", label: "2010 - 2019" },
  { value: "2000s", label: "2000 - 2009" },
  { value: "pre2000", label: "Before 2000" },
];

const PRICE_OPTIONS = [
  { value: "", label: "Any price" },
  { value: "under10k", label: "Under $10k" },
  { value: "10k-25k", label: "$10k - $25k" },
  { value: "25k-50k", label: "$25k - $50k" },
  { value: "50k-100k", label: "$50k - $100k" },
  { value: "100kplus", label: "$100k+" },
];

const TRANSMISSION_OPTIONS = [
  { value: "", label: "Any transmission" },
  { value: "automatic", label: "Automatic" },
  { value: "manual", label: "Manual" },
  { value: "cvt", label: "CVT" },
  { value: "other", label: "Other" },
];

const BODY_STYLE_OPTIONS = [
  { value: "", label: "Any body style" },
  { value: "coupe", label: "Coupe" },
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "truck", label: "Truck" },
  { value: "convertible", label: "Convertible" },
  { value: "wagon", label: "Wagon" },
  { value: "hatchback", label: "Hatchback" },
  { value: "van", label: "Van" },
  { value: "other", label: "Other" },
];

const FILTERS = [
  { param: "year", options: YEAR_OPTIONS, defaultLabel: "Year" },
  {
    param: "transmission",
    options: TRANSMISSION_OPTIONS,
    defaultLabel: "Transmission",
  },
  { param: "body", options: BODY_STYLE_OPTIONS, defaultLabel: "Body Style" },
  { param: "price", options: PRICE_OPTIONS, defaultLabel: "Price" },
] as const;

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hasActiveFilters = FILTERS.some(({ param }) =>
    searchParams.get(param)
  );

  function setFilter(param: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(param, value);
    } else {
      params.delete(param);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    for (const { param } of FILTERS) params.delete(param);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      {FILTERS.map(({ param, options, defaultLabel }) => {
        const active = searchParams.get(param) ?? "";
        return (
          <select
            key={param}
            value={active}
            onChange={(e) => setFilter(param, e.target.value)}
            aria-label={defaultLabel}
            className={`rounded-full border border-border bg-card px-4 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
              active ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.value === "" ? defaultLabel : opt.label}
              </option>
            ))}
          </select>
        );
      })}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
