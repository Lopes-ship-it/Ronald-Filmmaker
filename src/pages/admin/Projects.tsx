import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  Plus,
  MagnifyingGlass,
  PencilSimple,
  Copy,
  Trash,
  ArrowUp,
  ArrowDown,
  Star,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import {
  adminListPortfolioProjects,
  createPortfolioProject,
  deletePortfolioProject,
  reorderPortfolioProjects,
  setPortfolioProjectFlags,
  slugify,
} from "@/lib/content";
import { isFirebaseConfigured } from "@/lib/firebase";
import { PORTFOLIO_CATEGORY_LABELS, type PortfolioCategory, type PortfolioProject } from "@/types";

const CATEGORY_OPTIONS = Object.entries(PORTFOLIO_CATEGORY_LABELS) as [PortfolioCategory, string][];

export function AdminProjects() {
  const [projects, setProjects] = useState<PortfolioProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<PortfolioCategory | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function load() {
    if (!isFirebaseConfigured) return;
    adminListPortfolioProjects()
      .then(setProjects)
      .catch(() => setError("Falha ao carregar."));
  }

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!projects) return [];
    const term = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesSearch =
        !term ||
        project.title.toLowerCase().includes(term) ||
        project.client.toLowerCase().includes(term);
      const matchesCategory = categoryFilter === "all" || project.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [projects, search, categoryFilter]);

  async function toggleFlag(project: PortfolioProject, flag: "featured" | "published") {
    setBusyId(project.id);
    try {
      await setPortfolioProjectFlags(project.id, { [flag]: !project[flag] });
      load();
    } catch {
      setError("Falha ao atualizar.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDuplicate(project: PortfolioProject) {
    if (!projects) return;
    setBusyId(project.id);
    try {
      const baseSlug = slugify(`${project.title}-copia`);
      let slug = baseSlug;
      let attempt = 1;
      while (projects.some((p) => p.slug === slug)) {
        attempt += 1;
        slug = `${baseSlug}-${attempt}`;
      }
      await createPortfolioProject({
        slug,
        title: `${project.title} (cópia)`,
        client: project.client,
        category: project.category,
        year: project.year,
        city: project.city,
        description: project.description,
        thumbnailUrl: project.thumbnailUrl,
        video: project.video,
        videoMetadata: project.videoMetadata,
        gallery: project.gallery,
        behindTheScenes: project.behindTheScenes,
        tags: project.tags,
        equipmentUsed: project.equipmentUsed,
        featured: false,
        published: false,
        order: projects.length,
        seo: project.seo,
      });
      load();
    } catch {
      setError("Falha ao duplicar.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      await deletePortfolioProject(id);
      setConfirmDeleteId(null);
      load();
    } catch {
      setError("Falha ao excluir.");
    } finally {
      setBusyId(null);
    }
  }

  async function move(project: PortfolioProject, direction: -1 | 1) {
    if (!projects) return;
    const ordered = [...projects].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((p) => p.id === project.id);
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= ordered.length) return;
    [ordered[index], ordered[swapWith]] = [ordered[swapWith], ordered[index]];
    setBusyId(project.id);
    try {
      await reorderPortfolioProjects(ordered.map((p) => p.id));
      load();
    } catch {
      setError("Falha ao reordenar.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-paper-50 md:text-3xl">Portfólio</h1>
          <p className="mt-1 text-sm text-paper-400">
            {projects ? `${projects.length} projeto${projects.length === 1 ? "" : "s"}` : "Carregando..."}
          </p>
        </div>
        <Button to="/admin/projetos/novo" variant="primary" className="inline-flex items-center gap-2">
          <Plus size={16} weight="bold" aria-hidden />
          Novo projeto
        </Button>
      </div>

      {!isFirebaseConfigured ? (
        <div className="mt-8 flex items-start gap-3 rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-900/50 p-6">
          <WarningCircle size={20} className="mt-0.5 shrink-0 text-flare-400" aria-hidden />
          <p className="text-sm leading-relaxed text-paper-200">
            O Firebase não está configurado neste projeto — preencha{" "}
            <code>firebaseConfig</code> em <code>src/lib/firebase.ts</code> para gerenciar
            projetos de verdade.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <MagnifyingGlass
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-500"
                aria-hidden
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título ou cliente..."
                className="w-full rounded-[var(--radius-frame)] border border-paper-100/20 bg-ink-950/40 py-2.5 pl-10 pr-4 text-sm text-paper-50 placeholder:text-paper-600 focus:border-flare-500 focus:outline-none"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as PortfolioCategory | "all")}
              className="rounded-[var(--radius-frame)] border border-paper-100/20 bg-ink-950/40 px-4 py-2.5 text-sm text-paper-50 focus:border-flare-500 focus:outline-none"
            >
              <option value="all">Todas as categorias</option>
              {CATEGORY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {error ? (
            <p role="alert" className="mt-4 text-sm text-flare-400">
              {error}
            </p>
          ) : null}

          {!projects ? (
            <div className="mt-10 flex justify-center" aria-hidden>
              <div className="h-8 w-8 animate-pulse rounded-full bg-flare-500/60" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="mt-10 text-sm italic text-paper-500">Nenhum projeto encontrado.</p>
          ) : (
            <div className="mt-6 flex flex-col divide-y divide-paper-100/10 overflow-hidden rounded-[var(--radius-frame)] border border-paper-100/10">
              {filtered
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((project) => (
                  <div
                    key={project.id}
                    className={clsx(
                      "flex flex-wrap items-center gap-4 bg-ink-900/40 p-4 transition-opacity",
                      busyId === project.id && "opacity-50",
                    )}
                  >
                    <img
                      src={project.thumbnailUrl}
                      alt=""
                      className="h-14 w-24 shrink-0 rounded-[var(--radius-frame)] object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-paper-100">{project.title}</p>
                      <p className="truncate text-xs text-paper-500">
                        {project.client} · {PORTFOLIO_CATEGORY_LABELS[project.category]} · {project.year}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => move(project, -1)}
                        aria-label="Mover para cima"
                        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-frame)] border border-paper-100/15 text-paper-400 hover:border-paper-100/35 hover:text-paper-100"
                      >
                        <ArrowUp size={13} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(project, 1)}
                        aria-label="Mover para baixo"
                        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-frame)] border border-paper-100/15 text-paper-400 hover:border-paper-100/35 hover:text-paper-100"
                      >
                        <ArrowDown size={13} aria-hidden />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFlag(project, "featured")}
                      aria-pressed={project.featured}
                      className={clsx(
                        "flex h-9 w-9 items-center justify-center rounded-[var(--radius-frame)] border transition-colors",
                        project.featured
                          ? "border-flare-500/50 bg-flare-500/10 text-flare-400"
                          : "border-paper-100/15 text-paper-500 hover:text-paper-200",
                      )}
                      title="Em destaque"
                    >
                      <Star size={14} weight={project.featured ? "fill" : "regular"} aria-hidden />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleFlag(project, "published")}
                      aria-pressed={project.published !== false}
                      className={clsx(
                        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        project.published !== false
                          ? "bg-flare-500/10 text-flare-300"
                          : "bg-paper-100/10 text-paper-500",
                      )}
                    >
                      {project.published !== false ? "Publicado" : "Rascunho"}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/admin/projetos/${project.id}`}
                        aria-label="Editar"
                        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-frame)] border border-paper-100/15 text-paper-400 hover:border-paper-100/35 hover:text-paper-100"
                      >
                        <PencilSimple size={14} aria-hidden />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(project)}
                        aria-label="Duplicar"
                        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-frame)] border border-paper-100/15 text-paper-400 hover:border-paper-100/35 hover:text-paper-100"
                      >
                        <Copy size={14} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(project.id)}
                        aria-label="Excluir"
                        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-frame)] border border-paper-100/15 text-paper-400 hover:border-flare-500/50 hover:text-flare-400"
                      >
                        <Trash size={14} aria-hidden />
                      </button>
                    </div>

                    {confirmDeleteId === project.id ? (
                      <div className="flex w-full items-center gap-3 rounded-[var(--radius-frame)] border border-flare-500/30 bg-flare-500/5 p-3">
                        <WarningCircle size={16} className="shrink-0 text-flare-400" aria-hidden />
                        <p className="flex-1 text-xs text-paper-200">
                          Excluir "{project.title}" permanentemente? Essa ação não pode ser desfeita.
                        </p>
                        <button
                          type="button"
                          disabled={busyId === project.id}
                          onClick={() => handleDelete(project.id)}
                          className="rounded-[var(--radius-frame)] bg-flare-500 px-3 py-1.5 text-xs font-semibold text-ink-950 hover:bg-flare-400 disabled:opacity-50"
                        >
                          Excluir
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-paper-400 hover:text-paper-100"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
