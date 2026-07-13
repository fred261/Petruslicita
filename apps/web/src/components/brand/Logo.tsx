interface LogoProps {
  className?: string;
  withLabel?: boolean;
}

/** Símbolo em nó/infinito dourado — solidez (Petrus) + continuidade do ciclo licitatório. */
export function Logo({ className, withLabel = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9A6F09" />
            <stop offset="100%" stopColor="#E3C26A" />
          </linearGradient>
        </defs>
        <path
          d="M20 32c0-6.6 5.4-12 12-12s12 5.4 12 12-5.4 12-12 12-12-5.4-12-12z"
          fill="none"
          stroke="url(#logo-gradient)"
          strokeWidth="5"
        />
        <path
          d="M8 32c0-6.6 5.4-12 12-12s12 5.4 12 12-5.4 12-12 12S8 38.6 8 32z"
          fill="none"
          stroke="url(#logo-gradient)"
          strokeWidth="5"
        />
        <path
          d="M32 32c0-6.6 5.4-12 12-12s12 5.4 12 12-5.4 12-12 12-12-5.4-12-12z"
          fill="none"
          stroke="url(#logo-gradient)"
          strokeWidth="5"
        />
      </svg>
      {withLabel && (
        <span className="text-lg font-semibold tracking-tight text-ink-900">
          Petrus <span className="text-gold-600">Licitação</span>
        </span>
      )}
    </div>
  );
}
