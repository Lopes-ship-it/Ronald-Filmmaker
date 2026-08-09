import { useState } from "react";
import clsx from "clsx";
import { Camera } from "@phosphor-icons/react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { AutoCarousel } from "@/components/ui/AutoCarousel";
import {
  EQUIPMENT_CATEGORY_LABELS,
  type EquipmentCategory,
  type EquipmentItem,
} from "@/types";

interface EquipmentProps {
  items: EquipmentItem[];
}

const CATEGORY_ORDER: EquipmentCategory[] = [
  "cameras",
  "lentes",
  "gimbal",
  "microfones",
  "iluminacao",
];

export function Equipment({ items }: EquipmentProps) {
  const [active, setActive] = useState<EquipmentCategory>("cameras");
  const filtered = items.filter((item) => item.category === active);

  return (
    <section className="bg-ink-900 py-24 md:py-32">
      <div className="container-page">
        <SectionHeading title="O equipamento por trás da imagem" className="max-w-xl" />

        <div
          role="tablist"
          aria-label="Categorias de equipamento"
          className="mt-10 flex flex-wrap gap-2"
        >
          {CATEGORY_ORDER.map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={active === category}
              onClick={() => setActive(category)}
              className={clsx(
                "rounded-[var(--radius-frame)] border px-4 py-2 text-sm transition-colors duration-200",
                active === category
                  ? "border-flare-500 bg-flare-500/10 text-flare-300"
                  : "border-paper-100/15 text-paper-400 hover:border-paper-100/35 hover:text-paper-100",
              )}
            >
              {EQUIPMENT_CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="mt-10">
          {filtered.length === 0 ? (
            <p className="text-sm italic text-paper-500">
              Nenhum equipamento cadastrado nessa categoria ainda.
            </p>
          ) : (
          <RevealOnScroll delay={0.1}>
            <AutoCarousel
              key={active}
              ariaLabel={`Equipamentos, categoria ${EQUIPMENT_CATEGORY_LABELS[active]}`}
              itemClassName="w-[82%] sm:w-[58%] md:w-[42%] lg:w-[31%]"
              items={filtered.map((item) => (
                <div
                  key={item.id}
                  className="h-full overflow-hidden rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-950/40"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="aspect-video w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 border-b border-dashed border-paper-100/15 bg-ink-900/40">
                      <Camera size={22} className="text-paper-700" aria-hidden />
                      <span className="text-xs italic text-paper-600">Foto em breve</span>
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="font-display text-lg text-paper-50">{item.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-paper-400">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            />
          </RevealOnScroll>
          )}
        </div>
      </div>
    </section>
  );
}
