import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import clsx from "clsx";
import { ArrowLeft, WarningCircle, Image as ImageIcon, ArrowsClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { VideoDropzone, type VideoReadyResult } from "@/components/admin/VideoDropzone";
import {
  adminGetPortfolioProject,
  adminListPortfolioProjects,
  createPortfolioProject,
  updatePortfolioProject,
  uploadToMediaBucket,
  slugify,
} from "@/lib/content";
import { validateVideoUrlForOrigin, parseYouTubeId, normalizeShareUrl } from "@/lib/video";
import { extractVideoThumbnail } from "@/lib/videoThumbnail";
import { regenerateServerThumbnail } from "@/lib/videoServerProcessing";
import {
  PORTFOLIO_CATEGORY_LABELS,
  type PortfolioCategory,
  type PortfolioProject,
  type VideoOrigin,
} from "@/types";

const inputClass =
  "w-full rounded-[var(--radius-frame)] border border-paper-100/20 bg-ink-950/40 px-4 py-3 text-sm text-paper-50 placeholder:text-paper-600 transition-colors focus:border-flare-500 focus:outline-none";
const labelClass = "mb-2 block text-sm text-paper-400";

type OriginChoice = VideoOrigin | "none";

const ORIGIN_OPTIONS: { value: OriginChoice; label: string }[] = [
  { value: "none", label: "Sem vídeo ainda" },
  { value: "upload", label: "Upload de arquivo" },
  { value: "instagram", label: "Link do Instagram" },
  { value: "youtube", label: "Link do YouTube" },
  { value: "vimeo", label: "Link do Vimeo" },
];

interface FormState {
  title: string;
  slug: string;
  slugTouched: boolean;
  client: string;
  category: PortfolioCategory;
  year: string;
  city: string;
  description: string;
  tags: string;
  equipmentUsed: string;
  featured: boolean;
  published: boolean;
  origin: OriginChoice;
  videoUrl: string;
  thumbnailUrl: string;
  seoMetaTitle: string;
  seoMetaDescription: string;
}

const CATEGORY_OPTIONS = Object.entries(PORTFOLIO_CATEGORY_LABELS) as [PortfolioCategory, string][];

function emptyForm(): FormState {
  return {
    title: "",
    slug: "",
    slugTouched: false,
    client: "",
    category: "institucional",
    year: String(new Date().getFullYear()),
    city: "",
    description: "",
    tags: "",
    equipmentUsed: "",
    featured: false,
    published: true,
    origin: "none",
    videoUrl: "",
    thumbnailUrl: "",
    seoMetaTitle: "",
    seoMetaDescription: "",
  };
}

function projectToForm(project: PortfolioProject): FormState {
  return {
    title: project.title,
    slug: project.slug,
    slugTouched: true,
    client: project.client,
    category: project.category,
    year: String(project.year),
    city: project.city ?? "",
    description: project.description,
    tags: (project.tags ?? []).join(", "),
    equipmentUsed: (project.equipmentUsed ?? []).join(", "),
    featured: project.featured,
    published: project.published ?? true,
    origin: project.video?.origin ?? "none",
    videoUrl: project.video && project.video.origin !== "upload" ? project.video.url : "",
    thumbnailUrl: project.thumbnailUrl,
    seoMetaTitle: project.seo?.metaTitle ?? "",
    seoMetaDescription: project.seo?.metaDescription ?? "",
  };
}

export function AdminProjectForm() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(emptyForm());
  const [existingProject, setExistingProject] = useState<PortfolioProject | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "not-found">(
    isEditing ? "loading" : "ready",
  );

  const [videoReady, setVideoReady] = useState<VideoReadyResult | null>(null);
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [thumbnailBusy, setThumbnailBusy] = useState(false);

  const [urlError, setUrlError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStage, setUploadStage] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing || !id) return;
    let cancelled = false;
    adminGetPortfolioProject(id)
      .then((project) => {
        if (cancelled) return;
        if (!project) {
          setLoadState("not-found");
          return;
        }
        setExistingProject(project);
        setForm(projectToForm(project));
        setThumbnailPreview(project.thumbnailUrl);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("not-found");
      });
    return () => {
      cancelled = true;
    };
  }, [id, isEditing]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleTitleChange(value: string) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: prev.slugTouched ? prev.slug : slugify(value),
    }));
  }

  async function handleVideoReady(result: VideoReadyResult) {
    setVideoReady(result);

    if (result.source === "server") {
      // Already processed server-side — the Cloud Function generated
      // thumbnails itself, so just point the preview at the "large" one.
      // No blob to hold on to; the URL is uploaded/hosted already.
      setThumbnailBlob(null);
      setThumbnailPreview(result.thumbnails.large);
      update("thumbnailUrl", result.thumbnails.large);
      return;
    }

    setThumbnailBusy(true);
    try {
      const blob = await extractVideoThumbnail(result.compression.blob, 1);
      setThumbnailBlob(blob);
      setThumbnailPreview(URL.createObjectURL(blob));
    } catch {
      // Auto-thumbnail failing isn't fatal — the admin can still upload one manually below.
    } finally {
      setThumbnailBusy(false);
    }
  }

  async function handleRegenerateThumbnail(atSeconds: number) {
    if (!videoReady) return;

    if (videoReady.source === "server") {
      setThumbnailBusy(true);
      try {
        const thumbnails = await regenerateServerThumbnail(videoReady.jobId, atSeconds);
        setThumbnailBlob(null);
        setThumbnailPreview(thumbnails.large);
        update("thumbnailUrl", thumbnails.large);
        setVideoReady({ ...videoReady, thumbnails });
      } catch {
        setSubmitError("Não foi possível gerar a miniatura nesse ponto do vídeo.");
      } finally {
        setThumbnailBusy(false);
      }
      return;
    }

    setThumbnailBusy(true);
    try {
      const blob = await extractVideoThumbnail(videoReady.compression.blob, atSeconds);
      setThumbnailBlob(blob);
      setThumbnailPreview(URL.createObjectURL(blob));
    } catch {
      setSubmitError("Não foi possível gerar a miniatura nesse ponto do vídeo.");
    } finally {
      setThumbnailBusy(false);
    }
  }

  function handleCustomThumbnail(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSubmitError("Escolha um arquivo de imagem para a miniatura.");
      return;
    }
    setThumbnailBlob(file);
    setThumbnailPreview(URL.createObjectURL(file));
  }

  function handleOriginChange(origin: OriginChoice) {
    setForm((prev) => ({ ...prev, origin }));
    setUrlError(null);
    if (origin !== "upload") {
      setVideoReady(null);
    }
  }

  function handleVideoUrlBlur() {
    if (form.origin === "none" || form.origin === "upload" || !form.videoUrl.trim()) {
      setUrlError(null);
      return;
    }
    const result = validateVideoUrlForOrigin(form.origin, form.videoUrl);
    setUrlError(result.ok ? null : (result.error ?? "Link inválido."));

    if (result.ok && form.origin === "youtube" && !thumbnailBlob) {
      const videoId = parseYouTubeId(form.videoUrl);
      if (videoId) {
        // maxresdefault is the highest-resolution official YouTube cover
        // (1280x720), but it only exists for videos uploaded in HD — it
        // 404s otherwise. The <img onError> below falls back to hqdefault
        // (always available, lower resolution) if maxres isn't there.
        const url = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        setThumbnailPreview(url);
        update("thumbnailUrl", url);
      }
    }
  }

  function handleThumbnailImgError() {
    if (!form.thumbnailUrl.includes("/maxresdefault.jpg")) return;
    const fallback = form.thumbnailUrl.replace("/maxresdefault.jpg", "/hqdefault.jpg");
    setThumbnailPreview(fallback);
    update("thumbnailUrl", fallback);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!form.title.trim() || !form.client.trim() || !form.slug.trim()) {
      setSubmitError("Preencha pelo menos título, cliente e slug.");
      return;
    }
    const year = Number(form.year);
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      setSubmitError("Ano inválido.");
      return;
    }

    if (form.origin === "instagram" || form.origin === "youtube" || form.origin === "vimeo") {
      const result = validateVideoUrlForOrigin(form.origin, form.videoUrl);
      if (!result.ok) {
        setSubmitError(result.error ?? "Link de vídeo inválido.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const slug = form.slug.trim();
      let thumbnailUrl = form.thumbnailUrl;
      let videoUrl: string | undefined;
      let videoMetadata: PortfolioProject["videoMetadata"];

      if (thumbnailBlob) {
        setUploadStage("Enviando miniatura...");
        const ext = thumbnailBlob.type === "image/webp" ? "webp" : "jpg";
        thumbnailUrl = await uploadToMediaBucket(
          `portfolio/${slug}/thumb-${Date.now()}.${ext}`,
          thumbnailBlob,
          { contentType: thumbnailBlob.type || "image/webp" },
        );
      }

      if (form.origin === "upload" && videoReady?.source === "server") {
        // Already compressed, hosted, and its URL saved by the Cloud
        // Function — nothing left to upload here.
        videoUrl = videoReady.videoUrl;
        videoMetadata = {
          durationSeconds: videoReady.durationSeconds,
          width: videoReady.width,
          height: videoReady.height,
          sizeBytes: videoReady.sizeBytes,
          uploadedAt: new Date().toISOString(),
        };
      } else if (form.origin === "upload" && videoReady?.source === "client") {
        setUploadStage("Enviando vídeo compactado...");
        videoUrl = await uploadToMediaBucket(
          `portfolio/${slug}/video-${Date.now()}.mp4`,
          videoReady.compression.blob,
          { contentType: "video/mp4" },
        );
        videoMetadata = {
          durationSeconds: videoReady.compression.durationSeconds,
          width: videoReady.compression.width,
          height: videoReady.compression.height,
          sizeBytes: videoReady.compression.compressedSizeBytes,
          uploadedAt: new Date().toISOString(),
        };
      } else if (form.origin === "upload" && existingProject?.video?.origin === "upload") {
        videoUrl = existingProject.video.url;
        videoMetadata = existingProject.videoMetadata;
      } else if (form.origin !== "upload" && form.origin !== "none") {
        videoUrl = normalizeShareUrl(form.videoUrl);
      }

      setUploadStage("Salvando projeto...");
      const order = existingProject?.order ?? (await adminListPortfolioProjects()).length;

      const seoMetaTitle = form.seoMetaTitle.trim();
      const seoMetaDescription = form.seoMetaDescription.trim();
      const seo =
        seoMetaTitle || seoMetaDescription
          ? {
              metaTitle: seoMetaTitle || undefined,
              metaDescription: seoMetaDescription || undefined,
            }
          : undefined;

      const input = {
        slug,
        title: form.title.trim(),
        client: form.client.trim(),
        category: form.category,
        year,
        city: form.city.trim() || undefined,
        description: form.description.trim(),
        thumbnailUrl,
        video:
          form.origin === "none"
            ? undefined
            : { origin: form.origin as VideoOrigin, url: videoUrl ?? "" },
        videoMetadata,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        equipmentUsed: form.equipmentUsed
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        gallery: existingProject?.gallery,
        behindTheScenes: existingProject?.behindTheScenes,
        featured: form.featured,
        published: form.published,
        order,
        seo,
      };

      if (isEditing && id) {
        await updatePortfolioProject(id, input);
      } else {
        await createPortfolioProject(input);
      }

      navigate("/admin/projetos", { replace: true });
    } catch {
      setSubmitError("Falha ao salvar o projeto.");
    } finally {
      setSubmitting(false);
      setUploadStage(null);
    }
  }

  if (loadState === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" aria-hidden>
        <div className="h-8 w-8 animate-pulse rounded-full bg-flare-500/60" />
      </div>
    );
  }

  if (loadState === "not-found") {
    return (
      <div className="container-page py-20">
        <p className="text-sm text-paper-300">Projeto não encontrado.</p>
        <Link to="/admin/projetos" className="mt-4 inline-block text-sm text-flare-400">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-16 md:py-20">
      <Link
        to="/admin/projetos"
        className="inline-flex items-center gap-2 text-sm text-paper-400 transition-colors hover:text-flare-400"
      >
        <ArrowLeft size={15} aria-hidden />
        Voltar para projetos
      </Link>

      <h1 className="mt-4 font-display text-2xl text-paper-50 md:text-3xl">
        {isEditing ? "Editar projeto" : "Novo projeto"}
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="title" className={labelClass}>
                Título
              </label>
              <input
                id="title"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="slug" className={labelClass}>
                Slug (URL)
              </label>
              <input
                id="slug"
                value={form.slug}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, slug: e.target.value, slugTouched: true }));
                }}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="client" className={labelClass}>
                Cliente
              </label>
              <input
                id="client"
                value={form.client}
                onChange={(e) => update("client", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="category" className={labelClass}>
                Categoria
              </label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => update("category", e.target.value as PortfolioCategory)}
                className={inputClass}
              >
                {CATEGORY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="year" className={labelClass}>
                Ano
              </label>
              <input
                id="year"
                type="number"
                value={form.year}
                onChange={(e) => update("year", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="city" className={labelClass}>
                Cidade
              </label>
              <input
                id="city"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className={labelClass}>
              Descrição
            </label>
            <textarea
              id="description"
              rows={4}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="tags" className={labelClass}>
                Tags (separadas por vírgula)
              </label>
              <input
                id="tags"
                value={form.tags}
                onChange={(e) => update("tags", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="equipment" className={labelClass}>
                Equipamento usado (separado por vírgula)
              </label>
              <input
                id="equipment"
                value={form.equipmentUsed}
                onChange={(e) => update("equipmentUsed", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-paper-100/10 pt-5">
            <div>
              <p className="text-sm font-semibold text-paper-100">SEO deste projeto</p>
              <p className="mt-1 text-xs text-paper-500">
                Opcional — deixe em branco para usar automaticamente o título e a descrição do
                projeto acima. Quando preenchido, sempre tem prioridade sobre os campos globais de{" "}
                <Link to="/admin/seo" className="text-flare-400 hover:underline">
                  SEO
                </Link>
                .
              </p>
            </div>
            <div>
              <label htmlFor="seoMetaTitle" className={labelClass}>
                Meta título
              </label>
              <input
                id="seoMetaTitle"
                value={form.seoMetaTitle}
                onChange={(e) => update("seoMetaTitle", e.target.value)}
                placeholder={form.title || "Usa o título do projeto"}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="seoMetaDescription" className={labelClass}>
                Meta descrição
              </label>
              <textarea
                id="seoMetaDescription"
                rows={2}
                value={form.seoMetaDescription}
                onChange={(e) => update("seoMetaDescription", e.target.value)}
                placeholder={form.description || "Usa a descrição do projeto"}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-paper-200">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => update("featured", e.target.checked)}
                className="h-4 w-4 rounded border-paper-100/30 bg-ink-950 accent-flare-500"
              />
              Projeto em destaque
            </label>
            <label className="flex items-center gap-2 text-sm text-paper-200">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => update("published", e.target.checked)}
                className="h-4 w-4 rounded border-paper-100/30 bg-ink-950 accent-flare-500"
              />
              Publicado (visível no site)
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-5">
          <div>
            <span className={labelClass}>Origem do vídeo</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ORIGIN_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleOriginChange(option.value)}
                  className={clsx(
                    "rounded-[var(--radius-frame)] border px-3.5 py-2.5 text-left text-sm transition-colors",
                    form.origin === option.value
                      ? "border-flare-500 bg-flare-500/10 text-flare-300"
                      : "border-paper-100/15 text-paper-400 hover:border-paper-100/35 hover:text-paper-100",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {form.origin === "upload" ? (
            <VideoDropzone
              onReady={handleVideoReady}
              onClear={() => setVideoReady(null)}
              disabled={submitting}
            />
          ) : null}

          {form.origin === "upload" && existingProject?.video?.origin === "upload" && !videoReady ? (
            <p className="text-xs text-paper-500">
              Já existe um vídeo enviado para este projeto. Escolha um novo arquivo acima só se
              quiser substituí-lo.
            </p>
          ) : null}

          {form.origin === "instagram" || form.origin === "youtube" || form.origin === "vimeo" ? (
            <div>
              <label htmlFor="videoUrl" className={labelClass}>
                Link do{" "}
                {form.origin === "instagram" ? "Instagram" : form.origin === "youtube" ? "YouTube" : "Vimeo"}
              </label>
              <input
                id="videoUrl"
                value={form.videoUrl}
                onChange={(e) => update("videoUrl", e.target.value)}
                onBlur={handleVideoUrlBlur}
                placeholder={
                  form.origin === "instagram"
                    ? "https://www.instagram.com/reel/..."
                    : form.origin === "youtube"
                      ? "https://www.youtube.com/watch?v=..."
                      : "https://vimeo.com/..."
                }
                className={inputClass}
              />
              {urlError ? (
                <p role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-flare-400">
                  <WarningCircle size={14} aria-hidden />
                  {urlError}
                </p>
              ) : null}
              {form.origin === "instagram" ? (
                <p className="mt-2 text-xs text-paper-500">
                  O Instagram não permite gerar miniatura automaticamente — envie uma imagem de
                  capa abaixo.
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <span className={labelClass}>Miniatura (thumbnail)</span>
            <div className="overflow-hidden rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-950/40">
              {thumbnailPreview ? (
                <img
                  src={thumbnailPreview}
                  alt=""
                  onError={handleThumbnailImgError}
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-paper-600">
                  <ImageIcon size={24} aria-hidden />
                  <span className="text-xs italic">Nenhuma miniatura ainda</span>
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="cursor-pointer text-sm text-flare-400 hover:underline">
                Enviar imagem personalizada
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomThumbnail}
                  className="sr-only"
                />
              </label>
              {form.origin === "upload" && videoReady ? (
                <button
                  type="button"
                  disabled={thumbnailBusy}
                  onClick={() => {
                    const durationSeconds =
                      videoReady.source === "server"
                        ? videoReady.durationSeconds
                        : videoReady.compression.durationSeconds;
                    handleRegenerateThumbnail(Math.random() * durationSeconds);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-paper-400 transition-colors hover:text-flare-400 disabled:opacity-50"
                >
                  <ArrowsClockwise size={14} aria-hidden />
                  {thumbnailBusy ? "Gerando..." : "Tentar outro frame"}
                </button>
              ) : null}
            </div>
          </div>

          {submitError ? (
            <p role="alert" className="flex items-center gap-2 text-sm text-flare-400">
              <WarningCircle size={16} aria-hidden />
              {submitError}
            </p>
          ) : null}

          <Button type="submit" variant="primary" disabled={submitting} className="w-full">
            {submitting ? uploadStage ?? "Salvando..." : isEditing ? "Salvar alterações" : "Criar projeto"}
          </Button>
        </div>
      </form>
    </div>
  );
}
