import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import clsx from "clsx";
import { useSiteData } from "@/context/SiteDataContext";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { useDocumentHead, SITE_NAME } from "@/hooks/useDocumentHead";
import {
  PORTFOLIO_CATEGORY_LABELS,
  type PortfolioCategory,
  type PortfolioProject,
} from "@/types";

interface PortfolioPageProps {
  portfolio: PortfolioProject[];
}

type FilterValue = PortfolioCategory | "todos";

/**
 * The dedicated portfolio page from the spec: a banner that changes with
 * the active category, filter chips, and the full grid. Filtering is local
 * state, not a route change, so switching categories never reloads the
 * page or refetches anything (Section "Não utilizar recarregamento
 * completo da página").
 */
export function PortfolioPage({ portfolio }: PortfolioPageProps) {
  const { portfolioCategories, settings } = useSiteData();
  const [filter, setFilter] = useState<FilterValue>("todos");
  const reduce = useReducedMotion();

  // Title/description are deliberately stable across the category filter
  // chips below — filtering is local UI state, not a route change (see the
  // component doc comment), so there's still only one canonical /portfolio
  // page for crawlers regardless of which chip happens to be selected.
  useDocumentHead({
    title: `Portfólio — ${SITE_NAME}`,
    description: settings.seoDescription,
    image: settings.seoImageUrl,
  });

  const categoriesPresent = useMemo(() => {
    const set = new Set(portfolio.map((project) => project.category));
    return portfolioCategories
      .filter((category) => set.has(category.slug))
      .sort((a, b) => a.order - b.order);
  }, [portfolio, portfolioCategories]);

  const activeCategory = useMemo(
    () => (filter === "todos" ? null : (categoriesPresent.find((c) => c.slug === filter) ?? null)),
    [filter, categoriesPresent],
  );

  const filtered = useMemo(
    () =>
      (filter === "todos" ? portfolio : portfolio.filter((project) => project.category === filter))
        .slice()
        .sort((a, b) => a.order - b.order),
    [filter, portfolio],
  );

  const bannerUrl = activeCategory?.bannerUrl ?? portfolioCategories[0]?.bannerUrl;

  return (
    <>
      <section className="relative flex min-h-[46vh] items-end overflow-hidden bg-ink-950 md:min-h-[52vh]">
        {bannerUrl ? (
          <motion.img
            key={bannerUrl}
            src={bannerUrl}
            alt=""
            initial={reduce ? false : { opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/55 to-ink-950/20" />

        <div className="container-page relative z-10 w-full pb-14 pt-28">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-flare-400">
            Portfólio · {filtered.length} {filtered.length === 1 ? "projeto" : "projetos"}
          </p>
          <h1 className="mt-3 max-w-2xl text-balance font-display text-4xl leading-[1.05] text-paper-50 md:text-5xl">
            {activeCategory ? PORTFOLIO_CATEGORY_LABELS[activeCategory.slug] : "Todos os trabalhos"}
          </h1>
          <p className="mt-4 max-w-xl text-balance text-[15px] leading-relaxed text-paper-200">
            {activeCategory
              ? activeCategory.description
              : "Cada projeto aqui foi filmado para uma pessoa, marca ou momento específico. Filtre por categoria para ver o que mais se aproxima do que você tem em mente."}
          </p>
        </div>
      </section>

      <section className="bg-ink-950 py-14 md:py-20">
        <div className="container-page">
          <div className="flex flex-wrap gap-2">
            <FilterChip label="Todos" active={filter === "todos"} onClick={() => setFilter("todos")} />
            {categoriesPresent.map((category) => (
              <FilterChip
                key={category.slug}
                label={PORTFOLIO_CATEGORY_LABELS[category.slug]}
                active={filter === category.slug}
                onClick={() => setFilter(category.slug)}
              />
            ))}
          </div>

          {filtered.length > 0 ? (
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[240px] lg:grid-flow-dense">
              {filtered.map((project, i) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  featuredSpan={project.featured && i % 5 === 0}
                  className="h-full"
                />
              ))}
            </div>
          ) : (
            <p className="mt-10 text-sm text-paper-600">Nenhum projeto nessa categoria ainda.</p>
          )}
        </div>
      </section>
    </>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        "rounded-[var(--radius-frame)] border px-3.5 py-1.5 text-xs transition-colors duration-200",
        active
          ? "border-flare-500 bg-flare-500/10 text-flare-300"
          : "border-paper-100/15 text-paper-400 hover:border-paper-100/35 hover:text-paper-100",
      )}
    >
      {label}
    </button>
  );
}
