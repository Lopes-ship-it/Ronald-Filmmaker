import {
  WhatsappLogo,
  InstagramLogo,
  YoutubeLogo,
  LinkedinLogo,
  MonitorPlay,
  Envelope,
  ArrowUpRight,
} from "@phosphor-icons/react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { Button } from "@/components/ui/Button";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { recordAnalyticsEvent } from "@/lib/content";
import type { SiteSettings } from "@/types";

interface ContactProps {
  settings: SiteSettings;
}

export function Contact({ settings }: ContactProps) {
  const whatsappHref = buildWhatsAppLink(settings.whatsapp, settings.whatsappMessage);

  return (
    <section id="contato" className="bg-ink-900 py-24 md:py-32">
      <div className="container-page">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SectionHeading title="Vamos conversar sobre o seu projeto" />

            <RevealOnScroll delay={0.1} className="mt-10">
              <div className="rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-950/40 p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-flare-500/10">
                  <WhatsappLogo size={26} weight="fill" className="text-flare-400" aria-hidden />
                </div>
                <p className="mt-6 max-w-md text-[15px] leading-relaxed text-paper-200">
                  Conte um pouco sobre a sua ideia diretamente pelo WhatsApp: formato, data e o
                  que você quer que essa história transmita. A resposta é pessoal, direto com o
                  Ronald.
                </p>
                <Button
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  variant="primary"
                  onClick={() => recordAnalyticsEvent("whatsapp_click", "contato")}
                  className="mt-7 inline-flex items-center gap-2"
                >
                  Falar no WhatsApp
                  <ArrowUpRight size={16} weight="bold" aria-hidden />
                </Button>
              </div>
            </RevealOnScroll>
          </div>

          <div className="lg:col-span-4 lg:col-start-9">
            <RevealOnScroll delay={0.15}>
              <div className="rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-950/50 p-7">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-flare-400">
                  Contato direto
                </h3>
                {settings.contactEmail ? (
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="mt-4 flex items-center gap-2.5 text-sm text-paper-200 transition-colors hover:text-flare-400"
                  >
                    <Envelope size={18} aria-hidden />
                    {settings.contactEmail}
                  </a>
                ) : null}

                {settings.instagram || settings.youtube || settings.vimeo || settings.linkedin ? (
                  <div className="mt-7 flex gap-3 border-t border-paper-100/10 pt-6">
                    {settings.instagram ? (
                      <SocialIcon
                        href={settings.instagram}
                        label="Instagram"
                        icon={InstagramLogo}
                        size={18}
                        onClick={() => recordAnalyticsEvent("instagram_click", "contato")}
                      />
                    ) : null}
                    {settings.youtube ? (
                      <SocialIcon href={settings.youtube} label="YouTube" icon={YoutubeLogo} size={18} />
                    ) : null}
                    {settings.vimeo ? (
                      <SocialIcon href={settings.vimeo} label="Vimeo" icon={MonitorPlay} size={18} />
                    ) : null}
                    {settings.linkedin ? (
                      <SocialIcon href={settings.linkedin} label="LinkedIn" icon={LinkedinLogo} size={18} />
                    ) : null}
                  </div>
                ) : null}
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </div>
    </section>
  );
}
