import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

interface RevealOnScrollProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}

/**
 * Motivated motion: content enters as it's discovered while scrolling,
 * matching how a viewer would naturally encounter each section — hierarchy
 * cue, not decoration. Collapses to an instant, static reveal under
 * prefers-reduced-motion.
 */
export function RevealOnScroll({
  children,
  delay = 0,
  className,
  y = 24,
}: RevealOnScrollProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
