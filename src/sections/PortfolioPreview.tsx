import { ArrowRight } from "@phosphor-icons/react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { Button } from "@/components/ui/Button";
import { AutoCarousel } from "@/components/ui/AutoCarousel";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import type { PortfolioProject } from "@/types";

interface PortfolioPreviewProps {
  projects: PortfolioProject[];
}

/**
 * Home page teaser: only featured work, ordered, capped at five cards, in a
 * looping carousel (mirrors the Services/Process/Equipment treatment). On
 * mobile exactly one card fills the view at a time; swiping to the next one
 * gets the carousel's native scroll-snap glide as its "next video"
 * animation. The full catalogue with category filters lives at /portfolio
 * (see src/pages/PortfolioPage.tsx) — this section exists to earn the
 * click, not to replace that page.
 */
export function PortfolioPreview({ projects }: PortfolioPreviewProps) {
  const featured = projects
    .filter((project) => project.featured)
    .sort((a, b) => a.order - b.order)
    .slice(0, 5);

  return (
    <section id="trabalhos" className="bg-ink-950 py-24 md:py-32">
      <div className="container-page">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading title="Trabalhos em destaque" className="max-w-xl" />
          <Button to="/portfolio" variant="secondary" className="shrink-0">
            Ver portfólio completo
            <ArrowRight size={16} weight="bold" aria-hidden />
          </Button>
        </div>

        <RevealOnScroll delay={0.1} className="mt-12">
          <AutoCarousel
            ariaLabel="Trabalhos em destaque"
            itemClassName="w-full sm:w-[85%] md:w-[55%] lg:w-[38%]"
            items={featured.map((project) => (
              <div key={project.id} className="h-[420px] sm:h-[460px] lg:h-[500px]">
                <ProjectCard project={project} className="h-full" />
              </div>
            ))}
          />
        </RevealOnScroll>
      </div>
    </section>
  );
}
