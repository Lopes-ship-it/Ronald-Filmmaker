import type { VideoOrigin, VideoSource } from "@/types";

/**
 * Multi-origin video resolution. Mirrors the admin's "origem do vídeo"
 * picker: whatever the editor pasted (a YouTube/Vimeo/Instagram share link,
 * long or short form) gets parsed here into whatever the player actually
 * needs — an embeddable ID, or the raw file URL for uploads. The public
 * site never has to know which origin a project used.
 */

export function parseYouTubeId(url: string): string | null {
  // youtu.be/<id>, /embed/<id>, /shorts/<id> — the ID always immediately
  // follows the path segment, regardless of any query string.
  const pathMatch = url.match(/(?:youtube\.com\/(?:embed|shorts)\/|youtu\.be\/)([\w-]{11})/);
  if (pathMatch) return pathMatch[1];
  // youtube.com/watch?v=<id> — `v` is not always the first query param (a
  // link copied from a playlist looks like `watch?list=PL...&v=<id>`), so
  // match `v=` anywhere in the query string instead of requiring it right
  // after `watch?`.
  const queryMatch = url.match(/[?&]v=([\w-]{11})/);
  if (queryMatch) return queryMatch[1];
  return null;
}

export function parseVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
  return match ? match[1] : null;
}

export function isInstagramUrl(url: string): boolean {
  return /instagram\.com\/(reel|p|tv)\//.test(url);
}

/**
 * Prepends `https://` to a pasted share link that's missing its scheme
 * (e.g. an admin pasting `instagram.com/reel/xyz` instead of
 * `https://instagram.com/reel/xyz`). YouTube/Vimeo links are always
 * re-resolved into a canonical embed URL by ID, so a missing scheme never
 * breaks their playback — but Instagram links are stored and used as-is
 * (as the `href`/`data-instgrm-permalink` value), so a scheme-less one
 * would otherwise render as a broken link relative to the site's own
 * domain instead of an external one. Safe to apply to every origin.
 */
export function normalizeShareUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

interface ResolvedVideo {
  kind: "upload" | "youtube-embed" | "vimeo-embed" | "instagram-link" | "unknown";
  /** Playable/embeddable URL for `upload`, `youtube-embed`, `vimeo-embed`. Original share URL for `instagram-link`. */
  playbackUrl: string;
}

/**
 * Admin-form validation for a pasted share link, keyed by the "origem do
 * vídeo" the editor picked. Reuses the same parsers the public player uses
 * to resolve playback — a link that fails here would also fail to embed.
 */
export function validateVideoUrlForOrigin(
  origin: Exclude<VideoOrigin, "upload">,
  url: string,
): { ok: boolean; error?: string } {
  const trimmed = url.trim();
  if (!trimmed) return { ok: false, error: "Cole um link." };

  switch (origin) {
    case "youtube":
      return parseYouTubeId(trimmed)
        ? { ok: true }
        : { ok: false, error: "Link do YouTube não reconhecido. Use o link normal ou o formato youtu.be." };
    case "vimeo":
      return parseVimeoId(trimmed)
        ? { ok: true }
        : { ok: false, error: "Link do Vimeo não reconhecido." };
    case "instagram":
      return isInstagramUrl(trimmed)
        ? { ok: true }
        : { ok: false, error: "Cole o link de um Reel, post ou vídeo do Instagram (instagram.com/reel/..., /p/... ou /tv/...)." };
    default:
      return { ok: false, error: "Origem de vídeo desconhecida." };
  }
}

export function resolveVideoSource(video: VideoSource): ResolvedVideo {
  switch (video.origin) {
    case "upload":
      return { kind: "upload", playbackUrl: video.url };
    case "youtube": {
      const id = parseYouTubeId(video.url);
      return id
        ? { kind: "youtube-embed", playbackUrl: `https://www.youtube-nocookie.com/embed/${id}` }
        : { kind: "unknown", playbackUrl: video.url };
    }
    case "vimeo": {
      const id = parseVimeoId(video.url);
      return id
        ? { kind: "vimeo-embed", playbackUrl: `https://player.vimeo.com/video/${id}` }
        : { kind: "unknown", playbackUrl: video.url };
    }
    case "instagram":
      return isInstagramUrl(video.url)
        ? { kind: "instagram-link", playbackUrl: video.url }
        : { kind: "unknown", playbackUrl: video.url };
    default:
      return { kind: "unknown", playbackUrl: video.url };
  }
}
