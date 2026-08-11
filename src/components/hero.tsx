import { PulseDot } from "@/components/ui/pulse-dot";

export function Hero() {
  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-primary">
        <PulseDot className="text-primary" />
        Live auctions updating in real time
      </div>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Bid on enthusiast cars
      </h1>
      <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
        Browse live auctions ending soonest first, place your bid, and
        follow the action as it happens.
      </p>
    </div>
  );
}
