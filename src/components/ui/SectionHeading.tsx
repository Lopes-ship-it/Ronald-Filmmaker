import clsx from "clsx";

interface SectionHeadingProps {
  title: string;
  /** Eyebrow is rationed site-wide — max 1 per 3 sections (Section 4.7). Only pass this on sections explicitly chosen to carry one. */
  eyebrow?: string;
  align?: "left" | "center";
  className?: string;
  titleClassName?: string;
}

export function SectionHeading({
  title,
  eyebrow,
  align = "left",
  className,
  titleClassName,
}: SectionHeadingProps) {
  return (
    <div
      className={clsx(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-flare-400">
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={clsx(
          "text-balance text-3xl leading-[1.1] text-paper-50 md:text-4xl lg:text-5xl",
          titleClassName,
        )}
      >
        {title}
      </h2>
    </div>
  );
}
