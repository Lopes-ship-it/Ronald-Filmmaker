import { Check } from "@phosphor-icons/react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import type { SiteSettings } from "@/types";

interface AboutProps {
  settings: SiteSettings;
}

export function About({ settings }: AboutProps) {
  return (
    <section id="sobre" className="bg-ink-950 py-24 md:py-32">
      <div className="container-page">
        <SectionHeading title="Quem está atrás da câmera" />

        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <RevealOnScroll className="lg:col-span-5">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-frame)] border border-paper-100/10">
              <img
                src={settings.aboutPhotoUrl}
                alt="Retrato de Ronald, fundador da Ronald Filmmaker"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={0.1} className="lg:col-span-7">
            {settings.aboutStory ? (
              <p className="max-w-2xl text-[15px] leading-relaxed text-paper-200 md:text-base">
                {settings.aboutStory}
              </p>
            ) : (
              <EmptyNote>Espaço reservado para a história de quem está por trás da câmera.</EmptyNote>
            )}

            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-flare-400">
                  Missão
                </h3>
                {settings.aboutMission ? (
                  <p className="mt-3 text-[15px] leading-relaxed text-paper-200">
                    {settings.aboutMission}
                  </p>
                ) : (
                  <EmptyNote className="mt-3">Espaço reservado para a missão.</EmptyNote>
                )}
              </div>
              <div>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-flare-400">
                  Visão
                </h3>
                {settings.aboutVision ? (
                  <p className="mt-3 text-[15px] leading-relaxed text-paper-200">
                    {settings.aboutVision}
                  </p>
                ) : (
                  <EmptyNote className="mt-3">Espaço reservado para a visão.</EmptyNote>
                )}
              </div>
            </div>

            <div className="mt-10 border-t border-paper-100/10 pt-8">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-flare-400">
                Diferenciais
              </h3>
              {settings.aboutDifferentials.length > 0 ? (
                <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {settings.aboutDifferentials.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-paper-200">
                      <Check
                        size={16}
                        weight="bold"
                        className="mt-0.5 shrink-0 text-flare-400"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyNote className="mt-4">Espaço reservado para os diferenciais.</EmptyNote>
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {settings.aboutSpecialties.map((item) => (
                <span
                  key={item}
                  className="rounded-[var(--radius-frame)] border border-paper-100/15 px-3.5 py-1.5 text-xs text-paper-400"
                >
                  {item}
                </span>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}

function EmptyNote({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`rounded-[var(--radius-frame)] border border-dashed border-paper-100/15 px-4 py-3 text-sm italic leading-relaxed text-paper-600 ${className}`}
    >
      {children}
    </p>
  );
}
