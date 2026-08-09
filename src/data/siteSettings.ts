import type { SiteSettings } from "@/types";

/**
 * Singleton content block. In production this becomes a single-document
 * Firestore collection (`siteSettings`) editable from the admin panel.
 */
export const siteSettings: SiteSettings = {
  aboutPhotoUrl: "/media/team/ronald-portrait.webp",
  aboutStory: "",
  aboutMission: "",
  aboutVision: "",
  aboutDifferentials: [],
  aboutSpecialties: [
    "Direção de fotografia",
    "Edição e color grading",
    "Som direto e desenho de som",
  ],
  whatsapp:
    "https://api.whatsapp.com/send/?phone=38999441120&text&type=phone_number&app_absent=0&utm_source=ig",
  whatsappMessage:
    "Olá, Ronald! Vi o seu site e gostaria de conversar sobre um projeto.",
  instagram: "https://www.instagram.com/ronald_souza5/",
  youtube: "https://youtube.com/@ronaldfilmmaker",
  vimeo: "https://vimeo.com/ronaldfilmmaker",
  linkedin: "https://linkedin.com/in/ronaldfilmmaker",
  contactEmail: "contato@ronaldfilmmaker.com",
  seoTitle: "Ronald Filmmaker — Produção audiovisual cinematográfica",
  seoDescription:
    "Produção audiovisual para marcas, casais e empresas que querem ser lembrados, não apenas vistos.",
  seoImageUrl: "https://picsum.photos/seed/ronald-og/1200/630",
};
