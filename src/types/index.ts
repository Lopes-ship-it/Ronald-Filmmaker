/**
 * Domain types for the Ronald Filmmaker site.
 *
 * These interfaces mirror the Firestore schema this project is designed to
 * sit on top of. In this phase (public landing page) all data is served
 * from `src/data/*` mock modules that satisfy these exact shapes, so
 * swapping the mock reads in `src/lib/content.ts` for real Firestore
 * queries later is a drop-in change with zero type churn.
 *
 * Suggested Firestore collection names are noted above each interface.
 */

export type PortfolioCategory =
  | "institucional"
  | "comercial"
  | "casamento"
  | "evento"
  | "videoclipe"
  | "redes-sociais"
  | "corporativo"
  | "documentario"
  | "ensaio"
  | "shows";

export const PORTFOLIO_CATEGORY_LABELS: Record<PortfolioCategory, string> = {
  institucional: "Institucional",
  comercial: "Comercial",
  casamento: "Casamento",
  evento: "Evento",
  videoclipe: "Videoclipe",
  "redes-sociais": "Redes Sociais",
  corporativo: "Corporativo",
  documentario: "Documentário",
  ensaio: "Ensaio",
  shows: "Cobertura de Shows",
};

/**
 * table: portfolio_categories
 * The admin panel (phase 2) will let new categories be created/edited/
 * reordered here without touching code — this mock list stands in for that
 * table today. A category not listed here simply falls back to a generated
 * banner + its label from PORTFOLIO_CATEGORY_LABELS.
 */
export interface PortfolioCategoryInfo {
  slug: PortfolioCategory;
  description: string;
  bannerUrl: string;
  order: number;
}

/**
 * Where a project's video actually lives. Mirrors the "origem do vídeo"
 * admin field: an editor either uploads a file (stored in Firebase Storage,
 * `upload`) or pastes a share link from YouTube, Vimeo, or Instagram. The
 * player component picks the right embed/native strategy from `origin`
 * alone — the public site never needs to know which one was chosen.
 */
export type VideoOrigin = "upload" | "youtube" | "vimeo" | "instagram";

export interface VideoSource {
  origin: VideoOrigin;
  /**
   * `upload`: direct URL to the media file (Firebase Storage, or /media
   * locally in this phase). `youtube` / `vimeo` / `instagram`: the original
   * share URL as pasted by the admin — parsed into an embeddable ID at
   * render time by `src/lib/video.ts`.
   */
  url: string;
}

/** Only populated for `origin: "upload"` — read from the compressed file, not the original. */
export interface VideoMetadata {
  durationSeconds?: number;
  width?: number;
  height?: number;
  sizeBytes?: number;
  uploadedAt?: string;
}

/**
 * Mirrors `videoProcessingJobs/{jobId}` in Firestore — written by the
 * server-side compression pipeline (functions/src/processVideo.ts), read
 * by the admin panel (src/lib/videoServerProcessing.ts) to drive
 * VideoDropzone's upload/processing UI. Keep in sync by hand with
 * functions/src/types.ts's `VideoProcessingJob` — the client bundle can't
 * import from functions/ (that's Node-only server code, firebase-admin
 * and all).
 */
export type VideoProcessingJobStatus = "processing" | "done" | "error";

export interface VideoThumbnailSet {
  large: string;
  medium: string;
  small: string;
}

export interface VideoProcessingJob {
  status: VideoProcessingJobStatus;
  progress?: number;
  originalPath: string;
  originalSizeBytes: number;
  optimizedPath?: string;
  optimizedUrl?: string;
  optimizedSizeBytes?: number;
  thumbnails?: VideoThumbnailSet;
  durationSeconds?: number;
  width?: number;
  height?: number;
  fps?: number;
  videoCodec?: string;
  videoBitrateKbps?: number;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

/** table: portfolio_projects */
export interface PortfolioProject {
  id: string;
  slug: string;
  title: string;
  client: string;
  category: PortfolioCategory;
  year: number;
  city?: string;
  description: string;
  thumbnailUrl: string;
  /** Absent while a project is published without footage attached yet — the grid/detail page fall back to a static thumbnail. */
  video?: VideoSource;
  /** Set only when video.origin === "upload"; read from the compressed file at upload time. */
  videoMetadata?: VideoMetadata;
  additionalVideos?: VideoSource[];
  gallery?: string[];
  behindTheScenes?: string[];
  tags?: string[];
  equipmentUsed?: string[];
  featured: boolean;
  /** Defaults to true for the Fase-1 mock catalogue (all "published"). Real admin-created rows always set this explicitly. */
  published?: boolean;
  order: number;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
  };
}

/** table: services */
export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
}

/** table: stats */
export interface Stat {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  order: number;
}

/** table: process_steps */
export interface ProcessStep {
  id: string;
  order: number;
  title: string;
  description: string;
}

/** table: equipment */
export interface EquipmentItem {
  id: string;
  category: EquipmentCategory;
  name: string;
  description: string;
  /** Absent until a real photo is uploaded — the card shows a placeholder slot instead. */
  imageUrl?: string;
  order: number;
}

export type EquipmentCategory =
  | "cameras"
  | "lentes"
  | "gimbal"
  | "microfones"
  | "iluminacao";

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  cameras: "Câmeras",
  lentes: "Lentes",
  gimbal: "Gimbal",
  microfones: "Microfones",
  iluminacao: "Iluminação",
};

/** table: site_settings (single row) */
export interface SiteSettings {
  aboutPhotoUrl: string;
  aboutStory: string;
  aboutMission: string;
  aboutVision: string;
  aboutDifferentials: string[];
  aboutSpecialties: string[];
  whatsapp: string;
  /** Pre-filled text for the "talk on WhatsApp" CTA (see src/lib/whatsapp.ts). */
  whatsappMessage: string;
  instagram: string;
  youtube: string;
  vimeo: string;
  linkedin: string;
  contactEmail: string;
  /** Global SEO — meta title/description/share image used on pages that don't set their own (see PortfolioProject.seo for per-project overrides). */
  seoTitle?: string;
  seoDescription?: string;
  seoImageUrl?: string;
}

/** table: contact_submissions (insert-only from the public form) */
export interface ContactSubmission {
  name: string;
  company?: string;
  phone: string;
  email: string;
  service: string;
  message: string;
}

/** collection: adminLogs — one entry per admin mutation, written by content.ts, read-only from the UI. */
export interface AdminLogEntry {
  id: string;
  action: string;
  actorEmail: string | null;
  details?: Record<string, string | number | boolean | null>;
  at: string;
}

/** collection: analyticsEvents — lightweight, anonymous usage signals (no PII) for the Relatórios screen. */
export type AnalyticsEventType = "project_view" | "whatsapp_click" | "instagram_click";

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  label?: string;
  at: string;
}
