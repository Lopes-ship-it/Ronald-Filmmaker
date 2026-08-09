import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin } from "@phosphor-icons/react";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { Button } from "@/components/ui/Button";
import { Carousel } from "@/components/ui/Carousel";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { getPortfolioProjectBySlug, getRelatedProjects, recordAnalyticsEvent } from "@/lib/content";
import { useSiteData } from "@/context/SiteDataContext";
import { useDocumentHead, SITE_NAME } from "@/hooks/useDocumentHead";
import { PORTFOLIO_CATEGORY_LABELS, type PortfolioProject } from "@/types";

type LoadState = "loading" | "found" | "not-found";

export function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const { settings } = useSiteData();
  const [project, setProject] = useState<PortfolioProject | null>(null);
  const [related, setRelated] = useState<PortfolioProject[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  // A project's own seo.metaTitle/metaDescription (set in /admin/projetos,
  // per project) always wins over the project's own title/description,
  // which in turn always wins over the site-wide default from
  // /admin/seo — same priority order the Seo admin screen documents.
  useDocumentHead({
    title:
      state === "not-found"
        ? `Projeto não encontrado — ${SITE_NAME}`
        : project
          ? (project.seo?.metaTitle || `${project.title} — ${SITE_NAME}`)
          : undefined,
    description:
      state === "not-found"
        ? "Esse trabalho não está (ou ainda não está) no portfólio."
        : project
          ? (project.seo?.metaDescription || project.description)
          : undefined,
    image: project?.thumbnailUrl || settings.seoImageUrl,
  });

  useEffect(() => {
    let cancelled = false;
    setState("loading");

    if (!slug) {
      setState("not-found");
      return undefined;
    }

    getPortfolioProjectBySlug(slug)
      .then((found) => {
        if (cancelled) return;
        if (!found) {
          setState("not-found");
          return;
        }
        setProject(found);
        setState("found");
        recordAnalyticsEvent("project_view", found.title);
        getRelatedProjects(found)
          .then((relatedProjects) => {
            if (!cancelled) setRelated(relatedProjects);
          })
          .catch(() => {
            // Related projects are a nice-to-have below the fold — a
            // failure here shouldn't affect the project page itself.
          });
      })
      .catch(() => {
        // getPortfolioProjectBySlug already falls back to mock data on its
        // own read failures, so this is a defensive backstop against an
        // unexpected rejection — without it the page would be stuck on its
        // loading spinner forever instead of showing "not found".
        if (!cancelled) setState("not-found");
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state === "loading") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center" aria-hidden>
        <div className="h-8 w-8 animate-pulse rounded-full bg-flare-500/60" />
      </div>
    );
  }

  if (state === "not-found" || !project) {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-start justify-center gap-4 py-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-flare-400">
          Projeto não encontrado
        </p>
        <h1 className="font-display text-3xl text-paper-50">
          Esse trabalho não está (ou ainda não está) no portfólio.
        </h1>
        <Button to="/portfolio" variant="primary" className="mt-2">
          <ArrowLeft size={16} weight="bold" aria-hidden />
          Voltar ao portfólio
        </Button>
      </div>
    );
  }

  const gallery = project.gallery ?? [];

  return (
    <article>
      {/*
        No forced 16:9/21:9 crop here: real footage is often a vertical
        phone/Reels shoot (checked via ffprobe — 640×1138, i.e. 9:16), and
        cropping that into a wide banner would throw away most of the frame
        and visibly upscale a fairly small source. The blurred backdrop
        fills the leftover space so a portrait video doesn't look like it's
        floating in a mostly-empty box.
      */}
      <section className="relative flex h-[68vh] min-h-[380px] w-full items-center justify-center overflow-hidden bg-ink-950">
        <img
          src={project.thumbnailUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl"
        />
        <div className="relative h-full w-full">
          {project.video ? (
            <VideoPlayer
              video={project.video}
              posterUrl={project.thumbnailUrl}
              title={project.title}
              fit="contain"
            />
          ) : (
            <img
              src={project.thumbnailUrl}
              alt={`${project.title}, produzido para ${project.client}`}
              className="h-full w-full object-contain"
            />
          )}
        </div>
      </section>

      <section className="bg-ink-950 py-14 md:py-20">
        <div className="container-page">
          <Link
            to="/portfolio"
            className="inline-flex items-center gap-2 text-sm text-paper-400 transition-colors hover:text-flare-400"
          >
            <ArrowLeft size={15} aria-hidden />
            Voltar ao portfólio
          </Link>

          <div className="mt-6 flex flex-col gap-10 lg:flex-row lg:justify-between">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-flare-400">
                {PORTFOLIO_CATEGORY_LABELS[project.category]} · {project.year}
              </p>
              <h1 className="mt-3 text-balance font-display text-3xl leading-[1.1] text-paper-50 md:text-5xl">
                {project.title}
              </h1>
              <p className="mt-4 text-[15px] leading-relaxed text-paper-200">
                {project.description}
              </p>

              {project.tags?.length ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-[var(--radius-frame)] border border-paper-100/15 px-3 py-1 text-xs text-paper-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <dl className="grid w-full max-w-xs shrink-0 grid-cols-1 gap-5 border-t border-paper-100/10 pt-6 lg:border-t-0 lg:border-l lg:pl-10 lg:pt-0">
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-[0.15em] text-paper-600">Cliente</dt>
                <dd className="mt-1 text-sm text-paper-100">{project.client}</dd>
              </div>
              {project.city ? (
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.15em] text-paper-600">Local</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm text-paper-100">
                    <MapPin size={14} className="text-flare-400" aria-hidden />
                    {project.city}
                  </dd>
                </div>
              ) : null}
              {project.equipmentUsed?.length ? (
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.15em] text-paper-600">Equipamento</dt>
                  <dd className="mt-1 text-sm text-paper-100">{project.equipmentUsed.join(", ")}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      </section>

      {gallery.length > 0 ? (
        <section className="bg-ink-900 py-14 md:py-20">
          <div className="container-page">
            <h2 className="font-display text-2xl text-paper-50">Bastidores e detalhes</h2>
            <div className="mt-8 max-w-3xl">
              <Carousel
                ariaLabel={`galeria de ${project.title}`}
                slides={gallery.map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt={`Detalhe de ${project.title}`}
                    loading="lazy"
                    className="aspect-video w-full rounded-[var(--radius-frame)] object-cover"
                  />
                ))}
              />
            </div>
          </div>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="bg-ink-950 py-14 md:py-20">
          <div className="container-page">
            <h2 className="font-display text-2xl text-paper-50">Outros trabalhos parecidos</h2>
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((relatedProject, i) => (
                <RevealOnScroll key={relatedProject.id} delay={i * 0.05}>
                  <ProjectCard project={relatedProject} className="aspect-[4/5]" />
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}
