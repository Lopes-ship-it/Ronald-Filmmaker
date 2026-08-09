import { useEffect, useState } from "react";
import { WarningCircle, CheckCircle, Info } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { adminGetSiteSettings, updateSiteSettings } from "@/lib/content";
import { isFirebaseConfigured } from "@/lib/firebase";

const inputClass =
  "w-full rounded-[var(--radius-frame)] border border-paper-100/20 bg-ink-950/40 px-4 py-2.5 text-sm text-paper-50 placeholder:text-paper-600 focus:border-flare-500 focus:outline-none";
const labelClass = "mb-1.5 block text-xs text-paper-400";

interface FormState {
  seoTitle: string;
  seoDescription: string;
  seoImageUrl: string;
}

/**
 * Global SEO fields only (meta title/description/share image, used as the
 * fallback for pages that don't set their own — a project's individual
 * `seo.metaTitle`/`seo.metaDescription`, already supported per-project in
 * the portfolio form, always wins over these). `sitemap.xml`/`robots.txt`
 * stay static files under `public/` — this is a static SPA build, so
 * regenerating them from Firestore data at runtime isn't possible without
 * adding server rendering or a scheduled Cloud Function; editing them here
 * would silently do nothing on the deployed site, which is worse than not
 * offering it. That work is flagged in the README, not simulated here.
 */
export function AdminSeo() {
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    adminGetSiteSettings()
      .then((settings) =>
        setForm({
          seoTitle: settings.seoTitle ?? "",
          seoDescription: settings.seoDescription ?? "",
          seoImageUrl: settings.seoImageUrl ?? "",
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
      <h1 className="font-display text-2xl text-paper-50 md:text-3xl">SEO</h1>
      <p className="mt-1 text-sm text-paper-400">
        Meta título, descrição e imagem de compartilhamento padrão do site.
      </p>

      <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-900/50 p-5">
        <Info size={18} className="mt-0.5 shrink-0 text-flare-400" aria-hidden />
        <p className="text-xs leading-relaxed text-paper-400">
          <code>sitemap.xml</code> e <code>robots.txt</code> continuam sendo arquivos estáticos em{" "}
          <code>public/</code> — este site é uma SPA com build estático, então gerá-los a partir do
          Firestore em tempo real exigiria renderização no servidor ou uma Cloud Function agendada.
          Cada projeto do portfólio já tem campos próprios de SEO (título/descrição) no formulário
          de edição — eles sempre têm prioridade sobre os campos globais abaixo. Título, descrição
          e imagem são atualizados na página assim que carregam — funciona para a aba do navegador
          e para o Google/Bing, que executam JavaScript; alguns serviços de prévia de link que não
          executam JavaScript ainda podem mostrar os valores estáticos originais do site.
        </p>
      </div>

      {!isFirebaseConfigured ? (
        <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-900/50 p-6">
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
            <label htmlFor="seoTitle" className={labelClass}>
              Meta título
            </label>
            <input
              id="seoTitle"
              value={form.seoTitle}
              onChange={(e) => update("seoTitle", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="seoDescription" className={labelClass}>
              Meta descrição
            </label>
            <textarea
              id="seoDescription"
              rows={3}
              value={form.seoDescription}
              onChange={(e) => update("seoDescription", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="seoImageUrl" className={labelClass}>
              Imagem de compartilhamento (Open Graph)
            </label>
            <input
              id="seoImageUrl"
              value={form.seoImageUrl}
              onChange={(e) => update("seoImageUrl", e.target.value)}
              className={inputClass}
            />
            {form.seoImageUrl ? (
              <img
                src={form.seoImageUrl}
                alt=""
                className="mt-2 h-32 w-full rounded-[var(--radius-frame)] border border-paper-100/10 object-cover"
              />
            ) : null}
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
