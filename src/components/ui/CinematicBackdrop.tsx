import { motion, useReducedMotion } from "motion/react";
import clsx from "clsx";

interface CinematicBackdropProps {
  posterUrl: string;
  videoUrl?: string;
  alt: string;
  overlay?: "hero" | "panel";
  className?: string;
}

/**
 * No real footage has been shot/uploaded yet, so `videoUrl` is undefined
 * today and this renders a still frame with a slow Ken Burns drift instead
 * — motivated motion standing in for camera movement, not decoration.
 * TODO(phase 2): once real hero/showreel footage is uploaded to Firebase
 * Storage, pass `videoUrl` and this swaps to an actual <video> background.
 */
export function CinematicBackdrop({
  posterUrl,
  videoUrl,
  alt,
  overlay = "hero",
  className,
}: CinematicBackdropProps) {
  const reduce = useReducedMotion();

  return (
    <div className={clsx("absolute inset-0 overflow-hidden", className)}>
      {videoUrl ? (
        <video
          className="h-full w-full object-cover"
          poster={posterUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      ) : (
        <motion.img
          src={posterUrl}
          alt={alt}
          className="h-full w-full object-cover"
          initial={reduce ? false : { scale: 1 }}
          animate={reduce ? undefined : { scale: 1.08 }}
          transition={reduce ? undefined : { duration: 24, ease: "linear" }}
        />
      )}

      {overlay === "hero" ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/55 to-ink-950/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/70 via-transparent to-ink-950/30" />
        </>
      ) : (
        <div className="absolute inset-0 bg-ink-950/60" />
      )}
    </div>
  );
}
