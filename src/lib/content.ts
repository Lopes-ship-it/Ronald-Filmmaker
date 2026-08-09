import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  limit,
  type DocumentData,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  type StorageReference,
} from "firebase/storage";
import { portfolioProjects } from "@/data/portfolio";
import { portfolioCategories } from "@/data/portfolioCategories";
import { services } from "@/data/services";
import { stats } from "@/data/stats";
import { processSteps } from "@/data/process";
import { equipment } from "@/data/equipment";
import { siteSettings } from "@/data/siteSettings";
import { firebaseAuth, firebaseFirestore, firebaseStorage, isFirebaseConfigured } from "@/lib/firebase";
import type {
  PortfolioProject,
  Service,
  Stat,
  ProcessStep,
  EquipmentItem,
  SiteSettings,
  ContactSubmission,
  PortfolioCategory,
  PortfolioCategoryInfo,
  AdminLogEntry,
  AnalyticsEvent,
  AnalyticsEventType,
} from "@/types";

/**
 * Single data-access layer for the whole site. Every section component
 * reads through these functions instead of importing `src/data/*` directly.
 *
 * The backend is Firebase exclusively (Cloud Firestore for data, Firebase
 * Storage for uploaded media) — see `src/lib/firebase.ts`. With no Firebase
 * project configured, every read below falls back to the local mock module
 * so the site still runs fully styled and functional.
 */

/** Strips `undefined` values (Firestore rejects them) — `null`/`0`/`false` all pass through untouched. */
function sanitizeForFirestore<T extends Record<string, unknown>>(input: T): Partial<T> {
  const output: Partial<T> = {};
  for (const key of Object.keys(input) as (keyof T)[]) {
    if (input[key] !== undefined) output[key] = input[key];
  }
  return output;
}

const NOT_CONFIGURED_ERROR =
  "Firebase não está configurado neste projeto. Veja o objeto firebaseConfig em src/lib/firebase.ts.";

function requireFirestore() {
  if (!isFirebaseConfigured || !firebaseFirestore) {
    throw new Error(NOT_CONFIGURED_ERROR);
  }
  return firebaseFirestore;
}

function requireStorage() {
  if (!isFirebaseConfigured || !firebaseStorage) {
    throw new Error(NOT_CONFIGURED_ERROR);
  }
  return firebaseStorage;
}

/**
 * One entry per admin mutation (create/update/delete/reorder/login),
 * written best-effort — a logging failure never blocks the action itself.
 * Read back by src/pages/admin/Logs.tsx. This is the audit trail the spec
 * asks for: who did what, when.
 */
export async function logAdminAction(
  action: string,
  details?: Record<string, string | number | boolean | null>,
): Promise<void> {
  if (!isFirebaseConfigured || !firebaseFirestore) return;
  try {
    await addDoc(
      collection(firebaseFirestore, "adminLogs"),
      sanitizeForFirestore({
        action,
        actorEmail: firebaseAuth?.currentUser?.email ?? null,
        details: details ?? null,
        at: new Date().toISOString(),
      }),
    );
  } catch {
    // Best-effort — see doc comment above.
  }
}

export async function adminListLogs(limitCount = 100): Promise<AdminLogEntry[]> {
  const db = requireFirestore();
  const snapshot = await getDocs(
    query(collection(db, "adminLogs"), orderBy("at", "desc"), limit(limitCount)),
  );
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      action: data.action as string,
      actorEmail: (data.actorEmail as string | null) ?? null,
      details: (data.details as AdminLogEntry["details"]) ?? undefined,
      at: data.at as string,
    };
  });
}

/**
 * ---------------------------------------------------------------------
 * Portfolio projects
 * ---------------------------------------------------------------------
 */

const PROJECTS_COLLECTION = "portfolioProjects";

function docToProject(id: string, data: DocumentData): PortfolioProject {
  return {
    id,
    slug: data.slug,
    title: data.title,
    client: data.client,
    category: data.category,
    year: data.year,
    city: data.city ?? undefined,
    description: data.description,
    thumbnailUrl: data.thumbnailUrl,
    video: data.video ?? undefined,
    videoMetadata: data.videoMetadata ?? undefined,
    additionalVideos: data.additionalVideos ?? undefined,
    gallery: data.gallery ?? undefined,
    behindTheScenes: data.behindTheScenes ?? undefined,
    tags: data.tags ?? undefined,
    equipmentUsed: data.equipmentUsed ?? undefined,
    featured: Boolean(data.featured),
    published: data.published ?? true,
    order: data.order ?? 0,
    seo: data.seo ?? undefined,
  };
}

/**
 * Reads the live `portfolioProjects` collection. Returns `null` (rather
 * than throwing) on any failure — offline, no permission, project not
 * fully set up yet — so every public read below can fall back to the local
 * mock catalogue instead of taking the whole page down or showing an empty
 * portfolio before an admin has created any real projects.
 */
async function tryReadFirestoreProjects(): Promise<PortfolioProject[] | null> {
  if (!isFirebaseConfigured || !firebaseFirestore) return null;
  try {
    const snapshot = await getDocs(collection(firebaseFirestore, PROJECTS_COLLECTION));
    return snapshot.docs.map((d) => docToProject(d.id, d.data()));
  } catch (err) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[Ronald Filmmaker] Firestore indisponível, usando conteúdo mock:", err);
    }
    return null;
  }
}

export async function getPortfolioProjects(): Promise<PortfolioProject[]> {
  const live = await tryReadFirestoreProjects();
  if (live && live.length > 0) {
    return live.filter((project) => project.published !== false).sort((a, b) => a.order - b.order);
  }
  return portfolioProjects;
}

export async function getPortfolioProjectBySlug(
  slug: string,
): Promise<PortfolioProject | null> {
  const live = await tryReadFirestoreProjects();
  if (live && live.length > 0) {
    return live.find((project) => project.slug === slug && project.published !== false) ?? null;
  }
  return portfolioProjects.find((project) => project.slug === slug) ?? null;
}

export async function getRelatedProjects(
  project: PortfolioProject,
  limitCount = 3,
): Promise<PortfolioProject[]> {
  const live = await tryReadFirestoreProjects();
  if (live && live.length > 0) {
    return live
      .filter(
        (candidate) =>
          candidate.id !== project.id &&
          candidate.category === project.category &&
          candidate.published !== false,
      )
      .sort((a, b) => a.order - b.order)
      .slice(0, limitCount);
  }
  return portfolioProjects
    .filter((candidate) => candidate.id !== project.id && candidate.category === project.category)
    .slice(0, limitCount);
}

/** Every project regardless of published state — firestore.rules only allows this for a signed-in admin. */
export async function adminListPortfolioProjects(): Promise<PortfolioProject[]> {
  const db = requireFirestore();
  const snapshot = await getDocs(
    query(collection(db, PROJECTS_COLLECTION), orderBy("order", "asc")),
  );
  return snapshot.docs.map((d) => docToProject(d.id, d.data()));
}

export async function adminGetPortfolioProject(id: string): Promise<PortfolioProject | null> {
  const db = requireFirestore();
  const snapshot = await getDoc(doc(db, PROJECTS_COLLECTION, id));
  return snapshot.exists() ? docToProject(snapshot.id, snapshot.data()) : null;
}

export interface PortfolioProjectInput {
  slug: string;
  title: string;
  client: string;
  category: PortfolioProject["category"];
  year: number;
  city?: string;
  description: string;
  thumbnailUrl: string;
  video?: PortfolioProject["video"];
  videoMetadata?: PortfolioProject["videoMetadata"];
  gallery?: string[];
  behindTheScenes?: string[];
  tags?: string[];
  equipmentUsed?: string[];
  featured: boolean;
  published: boolean;
  order: number;
  seo?: PortfolioProject["seo"];
}

export async function createPortfolioProject(
  input: PortfolioProjectInput,
): Promise<PortfolioProject> {
  const db = requireFirestore();
  const docRef = await addDoc(
    collection(db, PROJECTS_COLLECTION),
    sanitizeForFirestore({ ...input }),
  );
  const created = await getDoc(docRef);
  await logAdminAction("Criou projeto de portfólio", { title: input.title, id: docRef.id });
  return docToProject(created.id, created.data()!);
}

export async function updatePortfolioProject(
  id: string,
  input: PortfolioProjectInput,
): Promise<PortfolioProject> {
  const db = requireFirestore();
  const projectRef = doc(db, PROJECTS_COLLECTION, id);
  await updateDoc(projectRef, sanitizeForFirestore({ ...input }));
  const updated = await getDoc(projectRef);
  await logAdminAction("Editou projeto de portfólio", { title: input.title, id });
  return docToProject(updated.id, updated.data()!);
}

/**
 * Recursively deletes every file under a Storage folder — used below to
 * free the video/thumbnail files (and any leftovers from repeated
 * re-uploads during earlier edits, since each upload gets its own
 * timestamped filename) that belonged to a deleted portfolio project.
 * Best-effort per file: one failed delete (already gone, transient
 * permission hiccup) never stops the rest from being cleaned up.
 */
async function deleteStorageFolder(prefix: string): Promise<void> {
  const storage = requireStorage();
  const res = await listAll(ref(storage, prefix));
  await Promise.all([
    ...res.items.map((item) => deleteObject(item).catch(() => {})),
    ...res.prefixes.map((sub) => deleteStorageFolder(sub.fullPath)),
  ]);
}

export async function deletePortfolioProject(id: string): Promise<void> {
  const db = requireFirestore();
  const projectRef = doc(db, PROJECTS_COLLECTION, id);

  // Read the slug first — that's the Storage folder (`portfolio/{slug}/`)
  // every upload for this project lives under — then remove the Firestore
  // record and, best-effort, everything in Storage that belonged to it, so
  // deleting a project actually frees the space it used instead of just
  // hiding the entry.
  const snapshot = await getDoc(projectRef);
  const slug = snapshot.exists() ? (snapshot.data().slug as string | undefined) : undefined;

  await deleteDoc(projectRef);

  if (slug) {
    try {
      await deleteStorageFolder(`portfolio/${slug}`);
    } catch {
      // Best-effort — see deleteStorageFolder's doc comment above. The
      // project record is already gone either way; a stray leftover file
      // costs storage space, not correctness.
    }
  }

  await logAdminAction("Excluiu projeto de portfólio", { id, slug: slug ?? null });
}

/** Toggle-only patches (featured/published) — the list screen's quick-action switches. */
export async function setPortfolioProjectFlags(
  id: string,
  flags: Partial<{ featured: boolean; published: boolean }>,
): Promise<void> {
  const db = requireFirestore();
  await updateDoc(doc(db, PROJECTS_COLLECTION, id), flags);
  await logAdminAction("Alterou destaque/publicação de projeto", { id, ...flags });
}

/** Persists a full reorder — `orderedIds` is the new top-to-bottom order. */
export async function reorderPortfolioProjects(orderedIds: string[]): Promise<void> {
  const db = requireFirestore();
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, PROJECTS_COLLECTION, id), { order: index });
  });
  await batch.commit();
  await logAdminAction("Reordenou projetos de portfólio");
}

/**
 * Uploads a file to Firebase Storage under `path` and returns its public
 * download URL. Used for both compressed video files and generated/custom
 * thumbnails.
 */
export async function uploadToMediaBucket(
  path: string,
  file: Blob,
  options?: { contentType?: string; onProgress?: (ratio: number) => void },
): Promise<string> {
  const storage = requireStorage();
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: options?.contentType });
  options?.onProgress?.(1);
  return getDownloadURL(fileRef);
}

export async function deleteFromMediaBucket(path: string): Promise<void> {
  const storage = requireStorage();
  await deleteObject(ref(storage, path));
}

export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents (a -> a, c -> c, ...)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * ---------------------------------------------------------------------
 * Generic CRUD for the small flat collections (services, equipment) —
 * same shape as the portfolio CRUD above (Firestore-backed, mock
 * fallback, best-effort audit logging), factored out once instead of
 * twice since these are both `{ id, order, ...fields }` collections
 * with no bespoke logic.
 * ---------------------------------------------------------------------
 */

interface SimpleEntity {
  id: string;
  order: number;
}

function createCollectionApi<T extends SimpleEntity>(
  collectionName: string,
  mockData: T[],
  toEntity: (id: string, data: DocumentData) => T,
) {
  async function tryRead(): Promise<T[] | null> {
    if (!isFirebaseConfigured || !firebaseFirestore) return null;
    try {
      const snapshot = await getDocs(collection(firebaseFirestore, collectionName));
      return snapshot.docs.map((d) => toEntity(d.id, d.data()));
    } catch (err) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn(
          `[Ronald Filmmaker] Firestore indisponível (${collectionName}), usando conteúdo mock:`,
          err,
        );
      }
      return null;
    }
  }

  return {
    async getAll(): Promise<T[]> {
      const live = await tryRead();
      if (live && live.length > 0) return live.sort((a, b) => a.order - b.order);
      return mockData;
    },
    async adminList(): Promise<T[]> {
      const db = requireFirestore();
      const snapshot = await getDocs(
        query(collection(db, collectionName), orderBy("order", "asc")),
      );
      return snapshot.docs.map((d) => toEntity(d.id, d.data()));
    },
    async create(input: Omit<T, "id">): Promise<T> {
      const db = requireFirestore();
      const docRef = await addDoc(collection(db, collectionName), sanitizeForFirestore({ ...input }));
      const created = await getDoc(docRef);
      await logAdminAction(`Criou item em ${collectionName}`, { id: docRef.id });
      return toEntity(created.id, created.data()!);
    },
    async update(id: string, input: Omit<T, "id">): Promise<T> {
      const db = requireFirestore();
      const entityRef = doc(db, collectionName, id);
      await updateDoc(entityRef, sanitizeForFirestore({ ...input }));
      const updated = await getDoc(entityRef);
      await logAdminAction(`Editou item em ${collectionName}`, { id });
      return toEntity(updated.id, updated.data()!);
    },
    async remove(id: string): Promise<void> {
      const db = requireFirestore();
      await deleteDoc(doc(db, collectionName, id));
      await logAdminAction(`Excluiu item em ${collectionName}`, { id });
    },
    async reorder(orderedIds: string[]): Promise<void> {
      const db = requireFirestore();
      const batch = writeBatch(db);
      orderedIds.forEach((id, index) => {
        batch.update(doc(db, collectionName, id), { order: index });
      });
      await batch.commit();
      await logAdminAction(`Reordenou ${collectionName}`);
    },
  };
}

function docToService(id: string, data: DocumentData): Service {
  return {
    id,
    title: data.title ?? "",
    description: data.description ?? "",
    icon: data.icon ?? "FilmSlate",
    order: data.order ?? 0,
  };
}

function docToEquipment(id: string, data: DocumentData): EquipmentItem {
  return {
    id,
    category: data.category,
    name: data.name ?? "",
    description: data.description ?? "",
    imageUrl: data.imageUrl ?? undefined,
    order: data.order ?? 0,
  };
}

const servicesApi = createCollectionApi<Service>("services", services, docToService);
const equipmentApi = createCollectionApi<EquipmentItem>("equipment", equipment, docToEquipment);

export async function getServices(): Promise<Service[]> {
  return servicesApi.getAll();
}
export const adminListServices = servicesApi.adminList;
export const createService = servicesApi.create;
export const updateService = servicesApi.update;
export const deleteService = servicesApi.remove;
export const reorderServices = servicesApi.reorder;

export async function getEquipment(): Promise<EquipmentItem[]> {
  return equipmentApi.getAll();
}
export const adminListEquipment = equipmentApi.adminList;
export const createEquipmentItem = equipmentApi.create;
export const updateEquipmentItem = equipmentApi.update;
export const deleteEquipmentItem = equipmentApi.remove;
export const reorderEquipment = equipmentApi.reorder;

export async function getStats(): Promise<Stat[]> {
  return stats;
}

export async function getProcessSteps(): Promise<ProcessStep[]> {
  return processSteps;
}

/**
 * ---------------------------------------------------------------------
 * Portfolio categories — a bounded, code-defined set (PortfolioCategory is
 * a fixed TypeScript union, referenced throughout filtering/labelling
 * logic), so the admin screen edits each category's description/banner/
 * order rather than creating or deleting arbitrary ones. The Firestore doc
 * ID is the category slug itself, so a category that was never edited
 * simply has no doc yet — reads merge live overrides on top of the full
 * mock list so all ten always show up, edited or not.
 * ---------------------------------------------------------------------
 */

const CATEGORIES_COLLECTION = "portfolioCategories";

function docToCategoryInfo(slug: string, data: DocumentData): PortfolioCategoryInfo {
  return {
    slug: slug as PortfolioCategory,
    description: data.description ?? "",
    bannerUrl: data.bannerUrl ?? "",
    order: data.order ?? 0,
  };
}

async function tryReadCategories(): Promise<PortfolioCategoryInfo[] | null> {
  if (!isFirebaseConfigured || !firebaseFirestore) return null;
  try {
    const snapshot = await getDocs(collection(firebaseFirestore, CATEGORIES_COLLECTION));
    return snapshot.docs.map((d) => docToCategoryInfo(d.id, d.data()));
  } catch (err) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[Ronald Filmmaker] Firestore indisponível (categorias), usando conteúdo mock:", err);
    }
    return null;
  }
}

export async function getPortfolioCategories(): Promise<PortfolioCategoryInfo[]> {
  const live = await tryReadCategories();
  if (!live) return portfolioCategories;
  const bySlug = new Map(live.map((category) => [category.slug, category]));
  return portfolioCategories
    .map((base) => bySlug.get(base.slug) ?? base)
    .sort((a, b) => a.order - b.order);
}

export async function updateCategory(
  slug: PortfolioCategory,
  input: { description: string; bannerUrl: string; order: number },
): Promise<void> {
  const db = requireFirestore();
  await setDoc(doc(db, CATEGORIES_COLLECTION, slug), sanitizeForFirestore({ ...input }), {
    merge: true,
  });
  await logAdminAction("Editou categoria de portfólio", { slug });
}

export async function reorderCategories(orderedSlugs: PortfolioCategory[]): Promise<void> {
  const db = requireFirestore();
  const batch = writeBatch(db);
  orderedSlugs.forEach((slug, index) => {
    batch.set(doc(db, CATEGORIES_COLLECTION, slug), { order: index }, { merge: true });
  });
  await batch.commit();
  await logAdminAction("Reordenou categorias de portfólio");
}

/**
 * ---------------------------------------------------------------------
 * Site settings — a Firestore singleton (`siteSettings/main`) rather than
 * a collection, since there is only ever one. Reads merge Firestore's
 * partial data on top of the mock defaults so an admin can fill in fields
 * gradually without the rest of the site regressing to blank text.
 * ---------------------------------------------------------------------
 */

const SITE_SETTINGS_DOC_ID = "main";

async function tryReadSiteSettings(): Promise<SiteSettings | null> {
  if (!isFirebaseConfigured || !firebaseFirestore) return null;
  try {
    const snapshot = await getDoc(doc(firebaseFirestore, "siteSettings", SITE_SETTINGS_DOC_ID));
    if (!snapshot.exists()) return null;
    return { ...siteSettings, ...(snapshot.data() as Partial<SiteSettings>) };
  } catch (err) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        "[Ronald Filmmaker] Firestore indisponível (configurações do site), usando conteúdo mock:",
        err,
      );
    }
    return null;
  }
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const live = await tryReadSiteSettings();
  return live ?? siteSettings;
}

/** Same as getSiteSettings — named separately so admin screens read intent clearly (this one requires Firebase to be worth calling). */
export async function adminGetSiteSettings(): Promise<SiteSettings> {
  return getSiteSettings();
}

export async function updateSiteSettings(input: Partial<SiteSettings>): Promise<SiteSettings> {
  const db = requireFirestore();
  await setDoc(doc(db, "siteSettings", SITE_SETTINGS_DOC_ID), sanitizeForFirestore({ ...input }), {
    merge: true,
  });
  await logAdminAction("Editou configurações do site");
  return getSiteSettings();
}

/**
 * Insert-only write for the public contact form. Firestore rules for this
 * collection allow `create` to anyone but `read` only to a signed-in
 * admin, keeping this endpoint public without exposing submitted leads.
 */
export async function submitContactForm(
  payload: ContactSubmission,
): Promise<{ ok: boolean; error?: string }> {
  if (isFirebaseConfigured && firebaseFirestore) {
    try {
      await addDoc(collection(firebaseFirestore, "contactSubmissions"), {
        ...payload,
        submittedAt: new Date().toISOString(),
      });
      return { ok: true };
    } catch {
      return { ok: false, error: "Falha ao enviar." };
    }
  }
  // Mock latency so the UI's loading state is genuinely exercised even
  // without a connected project.
  await new Promise((resolve) => setTimeout(resolve, 900));
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info("[Ronald Filmmaker] Contato recebido (mock, não persistido):", payload);
  }
  return { ok: true };
}

/**
 * ---------------------------------------------------------------------
 * Analytics — lightweight, anonymous, fire-and-forget event logging (no
 * PII, no cookies) that feeds the Relatórios admin screen: project views
 * and WhatsApp/Instagram click-throughs. A failed write here must never
 * affect the visitor, so every error is swallowed silently.
 * ---------------------------------------------------------------------
 */

export function recordAnalyticsEvent(type: AnalyticsEventType, label?: string): void {
  if (!isFirebaseConfigured || !firebaseFirestore) return;
  addDoc(
    collection(firebaseFirestore, "analyticsEvents"),
    sanitizeForFirestore({ type, label, at: new Date().toISOString() }),
  ).catch(() => {
    // Best-effort — see doc comment above.
  });
}

export interface AnalyticsSummary {
  totalEvents: number;
  byType: Record<AnalyticsEventType, number>;
  topProjectViews: { label: string; count: number }[];
}

export async function adminGetAnalyticsSummary(): Promise<AnalyticsSummary> {
  const db = requireFirestore();
  const snapshot = await getDocs(collection(db, "analyticsEvents"));
  const events = snapshot.docs.map((d) => d.data() as AnalyticsEvent);
  const byType: Record<AnalyticsEventType, number> = {
    project_view: 0,
    whatsapp_click: 0,
    instagram_click: 0,
  };
  const viewCounts = new Map<string, number>();
  for (const event of events) {
    if (event.type in byType) byType[event.type] += 1;
    if (event.type === "project_view" && event.label) {
      viewCounts.set(event.label, (viewCounts.get(event.label) ?? 0) + 1);
    }
  }
  const topProjectViews = Array.from(viewCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return { totalEvents: events.length, byType, topProjectViews };
}

/**
 * ---------------------------------------------------------------------
 * Media library — every file under Storage's portfolio/ prefix, browsed
 * independently of which project it belongs to (src/pages/admin/Media.tsx).
 * ---------------------------------------------------------------------
 */

export interface MediaFile {
  path: string;
  name: string;
  url: string;
}

export async function listMediaFiles(): Promise<MediaFile[]> {
  const storage = requireStorage();
  const files: MediaFile[] = [];

  async function walk(folderRef: StorageReference) {
    const res = await listAll(folderRef);
    for (const item of res.items) {
      const url = await getDownloadURL(item);
      files.push({ path: item.fullPath, name: item.name, url });
    }
    for (const prefix of res.prefixes) {
      await walk(prefix);
    }
  }

  await walk(ref(storage, "portfolio"));
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
