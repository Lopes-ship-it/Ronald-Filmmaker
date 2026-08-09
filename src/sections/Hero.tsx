import { motion, useReducedMotion } from "motion/react";

/**
 * Clean, minimal splash: the logo alone, centered, on a solid backdrop
 * (the site-wide grain overlay in App.tsx still gives it texture). No
 * headline, subtitle, or CTA competing for attention here — the header's
 * own "Solicitar Orçamento" button and the rest of the page carry that job.
 * An sr-only <h1> keeps the page's real heading and SEO copy intact even
 * though nothing but the wordmark is visible.
 */
export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section
      id="topo"
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-ink-950"
    >
      <h1 className="sr-only">
        Ronald Filmmaker, produção audiovisual cinematográfica no Norte de Minas.
      </h1>

      <motion.img
        src="/brand/ronald-filmmaker-logo.webp"
        alt="Ronald Filmmaker"
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="w-[240px] sm:w-[340px] md:w-[440px] lg:w-[520px]"
      />
    </section>
  );
}
