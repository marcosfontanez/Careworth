export function EkgRule({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-8 w-full text-primary/25 ${className}`}
      preserveAspectRatio="none"
      viewBox="0 0 800 32"
      aria-hidden
    >
      <path
        d="M0 16 H160 L172 4 L184 28 L196 8 L208 24 L220 16 H800"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
