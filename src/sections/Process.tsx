import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { AutoCarousel } from "@/components/ui/AutoCarousel";
import type { ProcessStep } from "@/types";

interface ProcessProps {
  steps: ProcessStep[];
}

export function Process({ steps }: ProcessProps) {
  return (
    <section id="processo" className="bg-ink-950 py-24 md:py-32">
      <div className="container-page">
        <SectionHeading title="Como um projeto acontece aqui" className="max-w-xl" />

        <RevealOnScroll delay={0.1} className="mt-16">
          <AutoCarousel
            ariaLabel="Etapas do processo"
            itemClassName="w-[78%] sm:w-[46%] md:w-[36%] lg:w-[23%]"
            items={steps.map((step) => (
              <div
                key={step.id}
                className="h-full border-l border-paper-100/15 pl-5"
              >
                <span className="font-mono text-xs text-flare-400">
                  {String(step.order).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-display text-lg text-paper-50">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper-400">{step.description}</p>
              </div>
            ))}
          />
        </RevealOnScroll>
      </div>
    </section>
  );
}
