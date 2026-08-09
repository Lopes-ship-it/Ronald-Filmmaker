import { forwardRef } from "react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-frame)] px-7 py-3.5 text-sm font-semibold tracking-wide transition-transform duration-200 ease-[var(--ease-cinematic)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

const variants: Record<Variant, string> = {
  primary:
    "bg-flare-500 text-ink-950 hover:bg-flare-400 shadow-[0_0_0_1px_rgba(227,116,56,0.4)]",
  secondary:
    "bg-transparent text-paper-100 border border-paper-100/35 hover:border-paper-100/70 hover:bg-paper-100/5",
  ghost: "bg-transparent text-paper-200 hover:text-flare-400",
};

interface ButtonOwnProps {
  variant?: Variant;
}

type ButtonAsButton = ButtonOwnProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsAnchor = ButtonOwnProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; to?: undefined };

type ButtonAsRouterLink = ButtonOwnProps &
  LinkProps & { href?: undefined; to: string };

type ButtonProps = ButtonAsButton | ButtonAsAnchor | ButtonAsRouterLink;

/**
 * Shape system note: buttons share the page-wide near-sharp `--radius-frame`
 * (3px), matching cards and inputs. Full-round is reserved for a small,
 * documented set of circular-by-convention elements: avatars, the showreel
 * play trigger, carousel progress dots, and floating icon-only utility
 * controls (e.g. the portfolio modal's close button) — never for standard
 * buttons or cards (Section 4.4 exception).
 *
 * `to` renders a react-router `<Link>` for in-app navigation (no full page
 * reload); `href` renders a plain anchor for external links (WhatsApp,
 * Instagram, mailto). Internal CTAs across the site use `to`.
 */
export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ variant = "primary", className, ...props }, ref) => {
    const classes = clsx(base, variants[variant], className);

    if ("to" in props && props.to !== undefined) {
      const { to, ...linkProps } = props;
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          to={to}
          className={classes}
          {...linkProps}
        />
      );
    }

    if ("href" in props && props.href !== undefined) {
      const { href, ...anchorProps } = props;
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={classes}
          {...anchorProps}
        />
      );
    }

    const buttonProps = props as ButtonHTMLAttributes<HTMLButtonElement>;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={buttonProps.type ?? "button"}
        className={classes}
        {...buttonProps}
      />
    );
  },
);

Button.displayName = "Button";
