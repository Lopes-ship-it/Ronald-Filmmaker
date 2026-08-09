import type { Service } from "@/types";

/**
 * Descriptions are intentionally blank until Ronald writes the real copy for
 * each format — src/sections/Services.tsx shows an explanatory placeholder
 * in place of an empty description, the same fallback a future admin panel
 * empty field would trigger.
 */
export const services: Service[] = [
  {
    id: "s1",
    title: "Filmes Institucionais",
    description: "",
    icon: "Buildings",
    order: 1,
  },
  {
    id: "s2",
    title: "Comerciais",
    description: "",
    icon: "Megaphone",
    order: 2,
  },
  {
    id: "s3",
    title: "Casamentos",
    description: "",
    icon: "HandHeart",
    order: 3,
  },
  {
    id: "s4",
    title: "Eventos",
    description: "",
    icon: "Cheers",
    order: 4,
  },
  {
    id: "s5",
    title: "Videoclipes",
    description: "",
    icon: "MusicNotes",
    order: 5,
  },
  {
    id: "s6",
    title: "Conteúdo para Redes Sociais",
    description: "",
    icon: "DeviceMobileCamera",
    order: 6,
  },
  {
    id: "s7",
    title: "Produções Corporativas",
    description: "",
    icon: "Handshake",
    order: 7,
  },
  {
    id: "s8",
    title: "Produção Cinematográfica",
    description: "",
    icon: "FilmSlate",
    order: 8,
  },
  {
    id: "s9",
    title: "Edição Profissional",
    description: "",
    icon: "Scissors",
    order: 9,
  },
];
