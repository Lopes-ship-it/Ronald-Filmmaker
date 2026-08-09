import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";

interface AutoCarouselProps {
  items: ReactNode[];
  ariaLabel: string;
  /** Width of a single slide, responsive — controls how many peek into view at each breakpoint. */
  itemClassName?: string;
  /** Milliseconds between automatic advances. */
  intervalMs?: number;
}

const DEFAULT_ITEM_CLASS = "w-[82%] sm:w-[62%] md:w-[44%] lg:w-[31%]";

/**
 * Horizontally-swipeable card carousel: native scroll-snap gives real touch
 * drag on mobile and click-drag/trackpad scroll on desktop for free, a
 * timer nudges it forward automatically (looping back to the start once it
 * reaches the end), and it pauses on hover/touch/focus so a reader isn't
 * fighting the motion while they're actually looking at a card. Prev/next
 * buttons cover pointer users who don't want to drag.
 */
export function AutoCarousel({
  items,
  ariaLabel,
  itemClassName = DEFAULT_ITEM_CLASS,
  intervalMs = 3200,
}: AutoCarouselProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || paused || items.length <= 1) return undefined;

    const id = window.setInterval(() => {
      const track = trackRef.current;
      if (!track) return;

      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      if (atEnd) {
        track.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }

      const firstItem = track.firstElementChild as HTMLElement | null;
      const gap = 16;
      const step = firstItem ? firstItem.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
      track.scrollBy({ left: step, behavior: "smooth" });
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [paused, reduce, intervalMs, items.length]);

  function scrollByStep(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const firstItem = track.firstElementChild as HTMLElement | null;
    const gap = 16;
    const step = firstItem ? firstItem.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
    track.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  function resumeSoon() {
    window.setTimeout(() => setPaused(false), 2200);
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={resumeSoon}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth"
      >
        {items.map((item, i) => (
          <div
            key={
              // eslint-disable-next-line react/no-array-index-key
              i
            }
            className={`shrink-0 snap-start ${itemClassName}`}
          >
            {item}
          </div>
        ))}
      </div>

      <div className="mt-7 flex justify-end gap-2">
        <button
          type="button"
          aria-label={`Item anterior, ${ariaLabel}`}
          onClick={() => scrollByStep(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-frame)] border border-paper-100/20 text-paper-100 transition-colors hover:border-flare-500/50 hover:text-flare-400"
        >
          <ArrowLeft size={16} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={`Próximo item, ${ariaLabel}`}
          onClick={() => scrollByStep(1)}
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-frame)] border border-paper-100/20 text-paper-100 transition-colors hover:border-flare-500/50 hover:text-flare-400"
        >
          <ArrowRight size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
