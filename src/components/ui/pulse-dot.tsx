import { cn } from "@/lib/utils";

export function PulseDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("relative inline-flex size-2", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-current" />
    </span>
  );
}
