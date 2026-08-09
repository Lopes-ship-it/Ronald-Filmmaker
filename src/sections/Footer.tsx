import { Link } from "react-router-dom";
import {
  WhatsappLogo,
  InstagramLogo,
  YoutubeLogo,
  LinkedinLogo,
  MonitorPlay,
  LockKey,
} from "@phosphor-icons/react";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { recordAnalyticsEvent } from "@/lib/content";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { SiteSettings } from "@/types";

const QUICK_LINKS = [
  { label: "Sobre", to: "/#sobre" },
  { label: "Serviços", to: "/#servicos" },
  { label: "Portfólio", to: "/portfolio" },
  { label: "Contato", to: "/#contato" },
];

interface FooterProps {
  settings: SiteSettings;
}

export function Footer({ settings }: FooterProps) {
  const year = new Date().getFullYear();
  const whatsappHref = buildWhatsAppLink(settings.whatsapp, settings.whatsappMessage);

  return (
    <footer className="border-t border-paper-100/10 bg-ink-950 py-14">
      <div className="container-page">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Link to="/" className="flex items-center gap-2.5 text-paper-50">
              <img src="/brand/ronald-icon.webp" alt="" className="h-6 w-auto" />
              <span className="font-display text-base">Ronald Filmmaker</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-paper-600">
              Produção audiovisual cinematográfica no Norte de Minas.
            </p>
          </div>

          <nav aria-label="Links rápidos">
            <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-paper-400">
              {QUICK_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="transition-colors hover:text-flare-400">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {settings.whatsapp || settings.instagram || settings.youtube || settings.vimeo || settings.linkedin ? (
            <div className="flex gap-3">
              {settings.whatsapp ? (
                <SocialIcon
                  href={whatsappHref}
                  label="WhatsApp"
                  icon={WhatsappLogo}
                  onClick={() => recordAnalyticsEvent("whatsapp_click", "rodapé")}
                />
              ) : null}
              {settings.instagram ? (
                <SocialIcon
                  href={settings.instagram}
                  label="Instagram"
                  icon={InstagramLogo}
                  onClick={() => recordAnalyticsEvent("instagram_click", "rodapé")}
                />
              ) : null}
              {settings.youtube ? <SocialIcon href={settings.youtube} label="YouTube" icon={YoutubeLogo} /> : null}
              {settings.vimeo ? <SocialIcon href={settings.vimeo} label="Vimeo" icon={MonitorPlay} /> : null}
              {settings.linkedin ? (
                <SocialIcon href={settings.linkedin} label="LinkedIn" icon={LinkedinLogo} />
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-paper-100/10 pt-6 text-xs text-paper-600">
          <p>&copy; {year} Ronald Filmmaker. Todos os direitos reservados.</p>
          <Link
            to="/admin/login"
            className="flex items-center gap-1.5 text-paper-700 transition-colors hover:text-flare-400"
          >
            <LockKey size={14} aria-hidden />
            Login administrativo
          </Link>
        </div>
      </div>
    </footer>
  );
}
