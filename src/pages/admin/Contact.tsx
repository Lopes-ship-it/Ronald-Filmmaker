import { useEffect, useState } from "react";
import { WarningCircle, CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { adminGetSiteSettings, updateSiteSettings } from "@/lib/content";
import { isFirebaseConfigured } from "@/lib/firebase";
import type { SiteSettings } from "@/types";

const inputClass =
  "w-full rounded-[var(--radius-frame)] border border-paper-100/20 bg-ink-950/40 px-4 py-2.5 text-sm text-paper-50 placeholder:text-paper-600 focus:border-flare-500 focus:outline-none";
const labelClass = "mb-1.5 block text-xs text-paper-400";

type FormState = Pick<
  SiteSettings,
  "whatsapp" | "whatsappMessage" | "instagram" | "youtube" | "vimeo" | "linkedin" | "contactEmail"
>;

export function AdminContact() {
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    adminGetSiteSettings()
      .then((settings) =>
        setForm({
          whatsapp: settings.whatsapp,
          whatsappMessage: settings.whatsappMessage,
          instagram: settings.instagram,
          youtube: settings.youtube,
          vimeo: settings.vimeo,
          linkedin: settings.linkedin,
          contactEmail: settings.contactEmail,
        }),
      )
      .catch(() => setError("Falha ao carregar."));
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      await updateSiteSettings(form);
      setSaved(true);
    } catch {
      setError("Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-paper-50 md:text-3xl">Contato</h1>
      <p className="mt-1 text-sm text-paper-400">
        WhatsApp, redes sociais e e-mail exibidos no rodapé e na seção de contato do site.
      </p>

      {!isFirebaseConfigured ? (
        <div className="mt-8 flex items-start gap-3 rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-900/50 p-6">
          <WarningCircle size={20} className="mt-0.5 shrink-0 text-flare-400" aria-hidden />
          <p className="text-sm leading-relaxed text-paper-200">
            O Firebase não está configurado neste projeto — preencha <code>firebaseConfig</code>{" "}
            em <code>src/lib/firebase.ts</code> para editar de verdade.
          </p>
        </div>
      ) : !form ? (
        <div className="mt-10 flex justify-center" aria-hidden>
          <div className="h-8 w-8 animate-pulse rounded-full bg-flare-500/60" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 flex max-w-2xl flex-col gap-5">
          <div>
            <label htmlFor="whatsapp" className={labelClass}>
              Link do WhatsApp (gerado em faq.whatsapp.com/send)
            </label>
            <input
              id="whatsapp"
              value={form.whatsapp}
              onChange={(e) => update("whatsapp", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="whatsappMessage" className={labelClass}>
              Mensagem pré-preenchida do WhatsApp
            </label>
            <textarea
              id="whatsappMessage"
              rows={2}
              value={form.whatsappMessage}
              onChange={(e) => update("whatsappMessage", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="contactEmail" className={labelClass}>
              E-mail de contato
            </label>
            <input
              id="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={(e) => update("contactEmail", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="instagram" className={labelClass}>
                Instagram
              </label>
              <input
                id="instagram"
                value={form.instagram}
                onChange={(e) => update("instagram", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="youtube" className={labelClass}>
                YouTube
              </label>
              <input
                id="youtube"
                value={form.youtube}
                onChange={(e) => update("youtube", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="vimeo" className={labelClass}>
                Vimeo
              </label>
              <input
                id="vimeo"
                value={form.vimeo}
                onChange={(e) => update("vimeo", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="linkedin" className={labelClass}>
                LinkedIn
              </label>
              <input
                id="linkedin"
                value={form.linkedin}
                onChange={(e) => update("linkedin", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-flare-400">
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-4">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
            {saved ? (
              <span className="flex items-center gap-1.5 text-sm text-flare-400">
                <CheckCircle size={16} weight="fill" aria-hidden />
                Salvo
              </span>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}
