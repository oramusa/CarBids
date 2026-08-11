export function CarIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label="No photo available"
      className={className}
    >
      <defs>
        <linearGradient id="car-illustration-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.22 0.03 258)" />
          <stop offset="100%" stopColor="oklch(0.16 0.03 258)" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#car-illustration-bg)" />
      <g transform="translate(60 150)" fill="none" stroke="oklch(0.55 0.03 258)" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round">
        <path d="M10 40 L40 0 L220 0 L260 40 L280 40 L280 70 L0 70 L0 40 Z" />
        <line x1="0" y1="55" x2="280" y2="55" />
        <circle cx="60" cy="70" r="22" fill="oklch(0.16 0.03 258)" />
        <circle cx="220" cy="70" r="22" fill="oklch(0.16 0.03 258)" />
      </g>
    </svg>
  );
}
