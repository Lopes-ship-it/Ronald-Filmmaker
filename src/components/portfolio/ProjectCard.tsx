import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { PORTFOLIO_CATEGORY_LABELS, type PortfolioProject } from "@/types";

interface ProjectCardProps {
  project: PortfolioProject;
  /** Featured cards span two columns/rows in the grid they're placed in. */
  featuredSpan?: boolean;
  className?: string;
}

/**
 * The portfolio's "not generic" moment: hovering a card with real upload
 * footage swaps the still for a muted, looping preview of the actual video
 * instead of a static photo. Cards without upload footage (external-link
 * origins, or projects not shot yet) simply keep the still — the hover
 * affordance never gates navigation, it only enriches it.
 */
export function ProjectCard({ project, featuredSpan = false, className }: ProjectCardProps) {
  const [hovering, setHovering] = useState(false);
  const canPreview = project.video?.origin === "upload";

  return (
    <Link
      to={`/portfolio/${project.slug}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
      className={clsx(
        "group relative block h-full min-h-[260px] w-full overflow-hidden rounded-[var(--radius-frame)] border border-paper-100/10 lg:min-h-0",
        featuredSpan && "lg:col-span-2 lg:row-span-2",
        className,
      )}
    >
      {hovering && canPreview && project.video ? (
        <VideoPlayer
          video={project.video}
          posterUrl={project.thumbnailUrl}
          title={project.title}
          ambient
          className="h-full w-full object-cover"
        />
      ) : (
        <img
          src={project.thumbnailUrl}
          alt={`${project.title}, produzido para ${project.client}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-cinematic)] group-hover:scale-105"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/10 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-flare-400">
          {PORTFOLIO_CATEGORY_LABELS[project.category]} · {project.year}
        </p>
        <h3 className="mt-1.5 font-display text-xl text-paper-50">{project.title}</h3>
        <p className="mt-1 text-sm text-paper-400">{project.client}</p>
      </div>
    </Link>
  );
}
