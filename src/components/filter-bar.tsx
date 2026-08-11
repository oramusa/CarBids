const FILTERS = ["Year", "Transmission", "Body Style", "Price"] as const;

export function FilterBar() {
  return (
    <div className="flex flex-wrap gap-2 py-2">
      {FILTERS.map((label) => (
        <span key={label} title="Coming soon">
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground opacity-60"
          >
            {label}
          </button>
        </span>
      ))}
    </div>
  );
}
