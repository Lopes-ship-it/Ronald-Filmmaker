import { useEffect, useRef, useState } from "react";
import { Play, ArrowSquareOut } from "@phosphor-icons/react";
import clsx from "clsx";
import { resolveVideoSource } from "@/lib/video";
import type { VideoSource } from "@/types";

interface VideoPlayerProps {
  video: VideoSource;
  posterUrl: string;
  title: string;
  /** Autoplay muted, no controls, no click-to-play gate — for card hover previews. Upload origin only. */
  ambient?: boolean;
  className?: string;
  /**
   * `cover` (default) crops to fill the container — right for thumbnail/card
   * grids where every cell is the same fixed shape. `contain` never crops:
   * the media renders at its real upload aspect ratio (portrait phone
   * footage stays portrait) inside whatever box the parent caps it at, with
   * empty space left instead of cutting off the frame. Use `contain` for a
   * single showcased video, like the project page hero.
   */
  fit?: "cover" | "contain";
}

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

let instagramScriptPromise: Promise<void> | null = null;

function loadInstagramEmbedScript(): Promise<void> {
  if (window.instgrm) return Promise.resolve();
  if (!instagramScriptPromise) {
    instagramScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Falha ao carregar embed do Instagram"));
      document.body.appendChild(script);
    });
  }
  return instagramScriptPromise;
}

/**
 * Single entry point for playing a project's video regardless of where it
 * lives. `resolveVideoSource` (src/lib/video.ts) does the origin detection;
 * this component only decides how to render each resolved kind:
 *   - upload            → native HTML5 <video>
 *   - youtube-embed      → youtube-nocookie iframe, loaded only after a click
 *   - vimeo-embed         → player.vimeo.com iframe, same click-to-load gate
 *   - instagram-link      → official Instagram embed script, with a
 *                          link-out fallback if the embed never mounts
 * Iframes are never rendered until the user presses play — that's the
 * project's real lazy-loading strategy for third-party embeds, since an
 * eagerly mounted YouTube/Vimeo iframe costs far more than a poster image.
 */
export function VideoPlayer({
  video,
  posterUrl,
  title,
  ambient = false,
  className,
  fit = "cover",
}: VideoPlayerProps) {
  const contain = fit === "contain";
  const resolved = resolveVideoSource(video);
  const [activated, setActivated] = useState(ambient && resolved.kind === "upload");
  const [instagramFailed, setInstagramFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activated || resolved.kind !== "instagram-link") return;

    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout>;

    loadInstagramEmbedScript()
      .then(() => {
        if (cancelled) return;
        window.instgrm?.Embeds.process();
        fallbackTimer = setTimeout(() => {
          const iframeRendered = containerRef.current?.querySelector("iframe");
          if (!iframeRendered) setInstagramFailed(true);
        }, 4000);
      })
      .catch(() => {
        if (!cancelled) setInstagramFailed(true);
      });

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, [activated, resolved.kind]);

  if (ambient && resolved.kind === "upload") {
    return (
      <video
        className={className}
        src={resolved.playbackUrl}
        poster={posterUrl}
        muted
        loop
        playsInline
        autoPlay
        preload="none"
        aria-hidden
      />
    );
  }

  // Below this point, every branch fills whatever box the parent gives it
  // (h-full w-full) — the parent controls the actual size by giving that
  // box a real height (see ProjectPage's hero, the only non-ambient caller).
  // `fit` only decides object-fit: `cover` crops to that box, `contain`
  // letterboxes so the source's real aspect ratio is never cropped or
  // stretched. Deliberately NOT merging caller-supplied width/height/object-fit
  // classes here — two Tailwind utilities for the same CSS property in one
  // class list race on stylesheet order, not on which one "looks later" in
  // the string, and silently produced a stretched, cropped video before.
  if (!activated) {
    return (
      <button
        type="button"
        onClick={() => setActivated(true)}
        aria-label={`Reproduzir vídeo: ${title}`}
        className={clsx("group relative block h-full w-full overflow-hidden", className)}
      >
        <img
          src={posterUrl}
          alt=""
          loading="lazy"
          className={clsx(
            "h-full w-full transition-transform duration-700 ease-[var(--ease-cinematic)] group-hover:scale-105",
            contain ? "object-contain" : "object-cover",
          )}
        />
        <div className="absolute inset-0 bg-ink-950/35 transition-colors group-hover:bg-ink-950/50" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-paper-50/50 bg-ink-950/50 text-paper-50 backdrop-blur-sm transition-transform duration-300 group-hover:scale-105 group-hover:border-flare-400 group-hover:text-flare-400">
            <Play size={22} weight="fill" aria-hidden />
          </span>
        </span>
      </button>
    );
  }

  switch (resolved.kind) {
    case "upload":
      return (
        <video
          className={clsx("h-full w-full", contain ? "object-contain" : "object-cover", className)}
          src={resolved.playbackUrl}
          poster={posterUrl}
          controls
          autoPlay
          playsInline
        />
      );
    case "youtube-embed":
      return (
        <iframe
          className={clsx("h-full w-full", className)}
          src={`${resolved.playbackUrl}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    case "vimeo-embed":
      return (
        <iframe
          className={clsx("h-full w-full", className)}
          src={`${resolved.playbackUrl}?autoplay=1`}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      );
    case "instagram-link":
      if (instagramFailed) {
        return (
          <a
            href={video.url}
            target="_blank"
            rel="noreferrer"
            className={`group relative flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden bg-ink-900 text-paper-100 ${className ?? ""}`}
          >
            <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
            <span className="relative flex items-center gap-2 rounded-[var(--radius-frame)] border border-paper-50/40 bg-ink-950/70 px-4 py-2 text-sm backdrop-blur-sm">
              <ArrowSquareOut size={16} aria-hidden />
              Ver no Instagram
            </span>
          </a>
        );
      }
      return (
        <div ref={containerRef} className={`flex items-center justify-center overflow-hidden bg-ink-900 ${className ?? ""}`}>
          <blockquote
            className="instagram-media"
            data-instgrm-permalink={video.url}
            data-instgrm-version="14"
            style={{ margin: 0, width: "100%" }}
          />
        </div>
      );
    default:
      return (
        <div className={`flex items-center justify-center bg-ink-900 text-sm text-paper-600 ${className ?? ""}`}>
          Vídeo indisponível
        </div>
      );
  }
}
