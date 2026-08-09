import { useEffect, useRef, useState } from "react";

interface UseCountUpOptions {
  end: number;
  duration?: number;
  reduceMotion?: boolean;
}

/**
 * Triggers a count-up from 0 to `end` once the returned ref scrolls into
 * view, driven by requestAnimationFrame (not a scroll listener — Section
 * 5.D). This is a discrete, IntersectionObserver-gated animation, not a
 * continuous pointer/scroll tracker, so plain useState is appropriate here.
 */
export function useCountUp<T extends HTMLElement>({
  end,
  duration = 1600,
  reduceMotion = false,
}: UseCountUpOptions) {
  const ref = useRef<T | null>(null);
  const [value, setValue] = useState(reduceMotion ? end : 0);
  const startedRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || startedRef.current) return undefined;

    if (reduceMotion) {
      setValue(end);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || startedRef.current) return;
        startedRef.current = true;

        const start = performance.now();
        let frameId = 0;

        const tick = (now: number) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setValue(Math.round(eased * end));
          if (progress < 1) {
            frameId = requestAnimationFrame(tick);
          }
        };

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [end, duration, reduceMotion]);

  return { ref, value };
}
