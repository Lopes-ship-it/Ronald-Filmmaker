import type { Icon } from "@phosphor-icons/react";

interface SocialIconProps {
  href: string;
  label: string;
  icon: Icon;
  size?: number;
  onClick?: () => void;
}

/**
 * A single round icon-button linking out to a social/contact channel.
 * Shared by the Contact section and the Footer — both used to carry their
 * own near-identical copy of this component.
 */
export function SocialIcon({ href, label, icon: IconComponent, size = 17, onClick }: SocialIconProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-frame)] border border-paper-100/15 text-paper-400 transition-colors hover:border-flare-500/50 hover:text-flare-400"
    >
      <IconComponent size={size} aria-hidden />
    </a>
  );
}
