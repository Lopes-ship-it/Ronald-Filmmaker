import {
  Buildings,
  Megaphone,
  HandHeart,
  Confetti,
  Cheers,
  MusicNotes,
  DeviceMobileCamera,
  Handshake,
  FilmSlate,
  Scissors,
  type Icon,
} from "@phosphor-icons/react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { IconBadge } from "@/components/ui/IconBadge";
import { AutoCarousel } from "@/components/ui/AutoCarousel";
import type { Service } from "@/types";

const ICONS: Record<string, Icon> = {
  Buildings,
  Megaphone,
  HandHeart,
  Confetti, // kept for backward compatibility with any service already saved with this icon
  Cheers,
  MusicNotes,
  DeviceMobileCamera,
  Handshake,
  FilmSlate,
  Scissors,
};

interface ServicesProps {
  services: Service[];
}

export function Services({ services }: ServicesProps) {
  return (
    <section id="servicos" className="bg-ink-900 py-24 md:py-32">
      <div className="container-page">
        <SectionHeading
          title="Um serviço para cada formato de história"
          className="max-w-xl"
        />

        <RevealOnScroll delay={0.1} className="mt-14">
          <AutoCarousel
            ariaLabel="Serviços"
            items={services.map((service) => {
              const IconComponent = ICONS[service.icon] ?? FilmSlate;
              return (
                <div
                  key={service.id}
                  className="h-full rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-900 p-6 transition-colors duration-300 hover:bg-ink-850"
                >
                  <IconBadge icon={IconComponent} />
                  <h3 className="mt-5 font-display text-lg text-paper-50">{service.title}</h3>
                  <p
                    className={
                      service.description
                        ? "mt-2 text-sm leading-relaxed text-paper-400"
                        : "mt-2 text-sm italic leading-relaxed text-paper-600"
                    }
                  >
                    {service.description || "Espaço reservado para a descrição deste serviço."}
                  </p>
                </div>
              );
            })}
          />
        </RevealOnScroll>
      </div>
    </section>
  );
}
