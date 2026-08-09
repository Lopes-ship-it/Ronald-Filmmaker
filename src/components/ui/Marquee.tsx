import type { ReactNode } from "react";

interface MarqueeProps {
  children: ReactNode[];
  /** seconds for one full loop */
  duration?: number;
  reverse?: boolean;
}

/**
 * CSS-driven infinite marquee (transform-only, GPU friendly). Content is
 * duplicated once so the loop is seamless. Pauses on hover/focus for manual
 * inspection, and collapses to a static row under prefers-reduced-motion via
 * the global rule in index.css.
 */
export function Marquee({ children, duration = 32, reverse = false }: MarqueeProps) {
  return (
    <div className="group relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div
        className="animate-marquee flex w-max items-center gap-10 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"
        style={{
          animationDuration: `${duration}s`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {[...children, ...children].map((child, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className="shrink-0">
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
