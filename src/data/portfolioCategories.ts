import type { PortfolioCategoryInfo } from "@/types";

/**
 * Stand-in for the future `portfolio_categories` table. The admin panel
 * (phase 2) lets Ronald create, edit, reorder, and delete categories here
 * without touching code — this mock list is exactly that table's shape.
 * Only categories that currently have at least one published project are
 * listed; creating an empty category ahead of content is a phase 2 feature.
 */
export const portfolioCategories: PortfolioCategoryInfo[] = [
  {
    slug: "institucional",
    description:
      "Vídeos que apresentam uma cidade, uma marca ou uma instituição para quem ainda não a conhece de perto.",
    bannerUrl: "/media/portfolio/campo-azul-poster.webp",
    order: 1,
  },
  {
    slug: "casamento",
    description:
      "Cerimônia, decoração e festa registradas com o cuidado de quem sabe que aquele dia não se repete.",
    bannerUrl: "/media/portfolio/decoracao-evento-poster.webp",
    order: 2,
  },
  {
    slug: "comercial",
    description:
      "Peças publicitárias e vídeos de divulgação para negócios que precisam ser vistos, não só encontrados.",
    bannerUrl: "/media/portfolio/braz-comercio-poster.webp",
    order: 3,
  },
  {
    slug: "corporativo",
    description:
      "Comunicação interna, recrutamento e institucional para empresas que falam com o próprio time.",
    bannerUrl: "https://picsum.photos/seed/ronald-cat-corporativo/1600/900",
    order: 4,
  },
  {
    slug: "evento",
    description: "Cobertura completa de congressos, festivais e lançamentos, do credenciamento ao encerramento.",
    bannerUrl: "https://picsum.photos/seed/ronald-cat-evento/1600/900",
    order: 5,
  },
  {
    slug: "videoclipe",
    description: "Direção de arte e captação para artistas independentes, do conceito à cor final.",
    bannerUrl: "https://picsum.photos/seed/ronald-cat-videoclipe/1600/900",
    order: 6,
  },
  {
    slug: "redes-sociais",
    description: "Séries verticais roteirizadas para Reels, TikTok e Shorts, feitas para reter atenção rápido.",
    bannerUrl: "https://picsum.photos/seed/ronald-cat-redes/1600/900",
    order: 7,
  },
];
