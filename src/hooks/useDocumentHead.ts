import { useEffect } from "react";

/** Hardcoded because it's the site's own name, not admin-editable content — used to build per-page titles like "Portfólio — Ronald Filmmaker". */
export const SITE_NAME = "Ronald Filmmaker";

export interface DocumentHeadInput {
  /** Full `<title>` text (and og:title/twitter:title) — pass the whole string, e.g. `${SITE_NAME}` already included. Falsy values leave whatever is already there untouched. */
  title?: string;
  description?: string;
  /** Absolute URL to the share image — relative paths won't render correctly in link previews (Slack, WhatsApp, etc. don't resolve them against the page). */
  image?: string;
}

function setMetaContent(selector: string, content: string) {
  document.head.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content);
}

/**
 * Pushes route-specific title/description/share-image into the actual
 * document `<head>`, so the browser tab and any crawler that executes
 * JavaScript (Googlebot and Bingbot both do) see per-page SEO instead of
 * the one static set of tags baked into index.html at build time. Used by
 * every public page (Home, PortfolioPage, ProjectPage, NotFound) with that
 * page's own resolved title/description/image — see src/lib/content.ts's
 * `getSiteSettings` (site-wide defaults, editable at /admin/seo) and each
 * portfolio project's own `seo.metaTitle`/`seo.metaDescription` override
 * (editable per project in /admin/projetos, always wins when set).
 *
 * Real limitation, disclosed because it matters here specifically: this is
 * a purely client-rendered SPA with no server-side rendering or
 * prerendering step. A crawler or link-preview bot that does NOT execute
 * JavaScript — several social/chat unfurlers still don't — only ever sees
 * index.html's static tags, never these per-route ones. Fixing that fully
 * would mean adding SSR or a prerendering build step, which is a real
 * architecture change, not something this hook can paper over.
 *
 * A falsy value for any field (empty string, undefined) leaves whatever is
 * already in the head untouched rather than clearing it — so a project
 * with no SEO override keeps showing the site-wide default instead of
 * going blank, and a site-wide field left empty keeps whatever index.html
 * shipped with instead of erasing it.
 */
export function useDocumentHead({ title, description, image }: DocumentHeadInput) {
  useEffect(() => {
    if (title) {
      document.title = title;
      setMetaContent('meta[property="og:title"]', title);
      setMetaContent('meta[name="twitter:title"]', title);
    }
    if (description) {
      setMetaContent('meta[name="description"]', description);
      setMetaContent('meta[property="og:description"]', description);
      setMetaContent('meta[name="twitter:description"]', description);
    }
    if (image) {
      setMetaContent('meta[property="og:image"]', image);
      setMetaContent('meta[name="twitter:image"]', image);
    }

    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
    setMetaContent('meta[property="og:url"]', canonicalUrl);
    document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", canonicalUrl);
  }, [title, description, image]);
}
