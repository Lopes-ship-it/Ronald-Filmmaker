interface LogoMarkProps {
  initials: string;
  name: string;
}

/**
 * No real client logo assets exist yet. Rather than a plain text wordmark,
 * each client renders as a generated abstract monogram — consistent frame,
 * consistent stroke, swappable for a real SVG/PNG logo URL later without
 * touching the surrounding grid.
 */
export function LogoMark({ initials, name }: LogoMarkProps) {
  return (
    <div
      role="img"
      aria-label={name}
      title={name}
      className="flex h-14 w-full max-w-[9rem] items-center justify-center rounded-[var(--radius-frame)] border border-paper-100/15 bg-paper-100/[0.03] px-4 font-mono text-xs tracking-[0.15em] text-paper-400 transition-colors duration-200 hover:border-flare-500/40 hover:text-paper-100"
    >
      {initials}
    </div>
  );
}
