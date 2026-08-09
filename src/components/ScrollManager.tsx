import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Anchors like `/#sobre` only work reliably within a single static page.
 * Once the site has real routes (`/`, `/portfolio`, `/portfolio/:slug`),
 * navigating from `/portfolio` to `/#sobre` first has to mount the home
 * route before an element with id="sobre" even exists in the DOM. This
 * component is the one place that owns "where does the viewport land after
 * a navigation" for the whole app: scroll to the hash target once the new
 * route has painted, or scroll to the top for a plain route change.
 */
export function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      const timer = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
      return () => window.clearTimeout(timer);
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    return undefined;
  }, [location.pathname, location.hash]);

  return null;
}
