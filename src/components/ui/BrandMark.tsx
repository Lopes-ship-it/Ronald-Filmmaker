import clsx from "clsx";

/**
 * The site's abstract brand mark — a camera-iris hexagon, echoing the
 * favicon. Generated geometry, not a hand-drawn illustration (Section 4.8
 * exception: single simple geometric mark).
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={clsx("h-6 w-6", className)}
      aria-hidden
    >
      <polygon
        points="32,14 46.5,23 46.5,41 32,50 17.5,41 17.5,23"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <polygon
        points="32,23 39,27.5 39,36.5 32,41 25,36.5 25,27.5"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}
