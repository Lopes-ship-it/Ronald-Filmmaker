import type { Icon } from "@phosphor-icons/react";

interface IconBadgeProps {
  icon: Icon;
  size?: number;
}

export function IconBadge({ icon: IconComponent, size = 22 }: IconBadgeProps) {
  return (
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-frame)] border border-paper-100/15 bg-paper-100/[0.03] text-flare-400">
      <IconComponent size={size} weight="light" aria-hidden />
    </span>
  );
}
