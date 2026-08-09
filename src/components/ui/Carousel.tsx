import { useState, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import clsx from "clsx";

interface CarouselProps {
  slides: ReactNode[];
  ariaLabel: string;
}

export function Carousel({ slides, ariaLabel }: CarouselProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const reduce = useReducedMotion();

  function go(next: number) {
    if (slides.length === 0) return;
    setDirection(next > index ? 1 : -1);
    setIndex((next + slides.length) % slides.length);
  }

  // Every current caller already guards on `gallery.length > 0` before
  // rendering this component, but the component shouldn't assume that —
  // an empty array would otherwise divide by zero in `go()` above.
  if (slides.length === 0) return null;

  return (
    <div role="group" aria-label={ariaLabel} className="relative">
      <div className="overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={index}
            custom={direction}
            initial={reduce ? false : { opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            drag={reduce ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_event, info) => {
              if (info.offset.x < -80) go(index + 1);
              else if (info.offset.x > 80) go(index - 1);
            }}
          >
            {slides[index]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={`dot-${
                // eslint-disable-next-line react/no-array-index-key
                i
              }`}
              type="button"
              aria-label={`Ir para item ${i + 1} de ${ariaLabel}`}
              aria-current={i === index}
              onClick={() => go(i)}
              className={clsx(
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-6 bg-flare-500" : "w-1.5 bg-paper-100/25",
              )}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            aria-label={`Item anterior, ${ariaLabel}`}
            onClick={() => go(index - 1)}
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-frame)] border border-paper-100/20 text-paper-100 transition-colors hover:border-flare-500/50 hover:text-flare-400"
          >
            <ArrowLeft size={16} aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Próximo item, ${ariaLabel}`}
            onClick={() => go(index + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-frame)] border border-paper-100/20 text-paper-100 transition-colors hover:border-flare-500/50 hover:text-flare-400"
          >
            <ArrowRight size={16} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
